import {EXPRESSIONS, HAND_SHAPES, MOUTH_SHAPES, type Expression, type HandShape, type MouthShape} from './vocabulary.ts';
export type {Expression} from './vocabulary.ts';
export type Gesture = 'rest' | 'explain' | 'present';
export type RigPose = {
  headTilt: number; gazeX: number; gazeY: number; blink: number;
  mouthOpen: number; expression: Expression;
  leftHandX: number; leftHandY: number; rightHandX: number; rightHandY: number;
  leftWrist: number; rightWrist: number;
  leftHandShape: HandShape; rightHandShape: HandShape; mouthShape: MouthShape;
};
export const REST_POSE: RigPose = {headTilt: 0, gazeX: 0, gazeY: 0, blink: 0, mouthOpen: 0,
  expression: 'neutral', leftHandX: 265, leftHandY: 690, rightHandX: 535, rightHandY: 690,
  leftWrist: -12, rightWrist: 12, leftHandShape:'relaxed', rightHandShape:'relaxed', mouthShape:'rest'};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));
export function normalizePose(input: Partial<RigPose> = {}): RigPose {
  const p = {...REST_POSE, ...input};
  return {...p, headTilt: clamp(p.headTilt, -12, 12), gazeX: clamp(p.gazeX, -1, 1), gazeY: clamp(p.gazeY, -1, 1),
    blink: clamp(p.blink, 0, 1), mouthOpen: clamp(p.mouthOpen, 0, 1),
    expression: EXPRESSIONS.includes(p.expression) ? p.expression : 'neutral',
    leftHandShape: HAND_SHAPES.includes(p.leftHandShape) ? p.leftHandShape : 'relaxed',
    rightHandShape: HAND_SHAPES.includes(p.rightHandShape) ? p.rightHandShape : 'relaxed',
    mouthShape: MOUTH_SHAPES.includes(p.mouthShape) ? p.mouthShape : 'rest',
    leftHandX: clamp(p.leftHandX, 160, 350), leftHandY: clamp(p.leftHandY, 510, 710),
    rightHandX: clamp(p.rightHandX, 450, 640), rightHandY: clamp(p.rightHandY, 510, 710),
    leftWrist: clamp(p.leftWrist, -35, 35), rightWrist: clamp(p.rightWrist, -35, 35)};
}
export const GESTURES: Record<Gesture, Partial<RigPose>> = {
  rest: {}, explain: {rightHandX: 505, rightHandY: 550, rightWrist: 22},
  present: {leftHandX: 295, leftHandY: 545, leftWrist: -22, headTilt: -3},
};
export type Point = {x: number; y: number};
export const ARM_LENGTHS = {upper: 120, lower: 112};
/** Analytic two-bone IK: fixed bend side and a reach margin avoid elbow flips/locking. */
export function solveArm(side: 'left' | 'right', target: Point) {
  const shoulder = {x: side === 'left' ? 250 : 550, y: 490};
  const dx = Number.isFinite(target.x) ? target.x - shoulder.x : 0;
  const dy = Number.isFinite(target.y) ? target.y - shoulder.y : 222;
  const direction = Math.hypot(dx, dy) < 1e-6 ? Math.PI / 2 : Math.atan2(dy, dx);
  const {upper, lower} = ARM_LENGTHS;
  const distance = clamp(Math.hypot(dx, dy), Math.abs(upper - lower) + 4, upper + lower - 4);
  const angle = direction + (side === 'left' ? 1 : -1) * Math.acos(clamp((upper ** 2 + distance ** 2 - lower ** 2) / (2 * upper * distance), -1, 1));
  const elbow = {x: shoulder.x + upper * Math.cos(angle), y: shoulder.y + upper * Math.sin(angle)};
  const wrist = {x: shoulder.x + distance * Math.cos(direction), y: shoulder.y + distance * Math.sin(direction)};
  return {shoulder, elbow, wrist};
}
export type GestureCue = {startSeconds: number; endSeconds: number; gesture: Gesture};
export type Envelope = {sampleRate: number; samples: readonly number[]};
// Random access, not an accumulating simulation: seeking and parallel rendering agree.
export function envelopeAt(envelope: Envelope | undefined, seconds: number): number {
  if (!envelope || !Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(envelope.sampleRate) || envelope.sampleRate <= 0) return 0;
  const x = seconds * envelope.sampleRate;
  if (x >= envelope.samples.length) return 0;
  const i = Math.floor(x), f = x - i;
  const a = clamp(envelope.samples[i] ?? 0, 0, 1), b = clamp(envelope.samples[i + 1] ?? 0, 0, 1);
  return a + (b - a) * f;
}
const ease = (x: number) => {const p = clamp(x, 0, 1); return p * p * (3 - 2 * p);};
export function blinkAt(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  const t = seconds % 3.7;
  return t < 2.6 || t > 2.82 ? 0 : Math.sin((t - 2.6) / .22 * Math.PI) ** 2;
}
export function poseAt(seconds: number, options: {cues?: readonly GestureCue[]; envelope?: Envelope; expression?: Expression} = {}): RigPose {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let pose: Partial<RigPose> = {};
  // Last active cue wins. Smoothly enter and leave each authored gesture.
  for (const cue of options.cues ?? []) {
    if (t < cue.startSeconds || t > cue.endSeconds || cue.endSeconds <= cue.startSeconds || !GESTURES[cue.gesture]) continue;
    const ramp = Math.min(.7, (cue.endSeconds - cue.startSeconds) / 2);
    const weight = ease((t - cue.startSeconds) / ramp) * ease((cue.endSeconds - t) / ramp);
    pose = Object.fromEntries(Object.entries(GESTURES[cue.gesture]).map(([key, value]) => {
      const base = Number(REST_POSE[key as keyof RigPose]);
      // Wrist settles slightly after the arm; all motion remains random-access safe.
      const w = key.endsWith('Wrist') ? ease((t - cue.startSeconds - .08) / ramp) * ease((cue.endSeconds - t) / ramp) : weight;
      const arc = key.endsWith('HandX') ? (key.startsWith('left') ? -8 : 8) * Math.sin(Math.PI * weight) : 0;
      return [key, base + (Number(value) - base) * w + arc];
    }));
  }
  const mouthOpen=envelopeAt(options.envelope,t);
  return normalizePose({...pose, blink: blinkAt(t), mouthOpen, mouthShape:mouthOpen>0?'A':'rest', expression: options.expression ?? 'neutral'});
}
