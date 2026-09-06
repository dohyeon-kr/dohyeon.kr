export type Expression = 'neutral' | 'smile' | 'curious';
export type Gesture = 'rest' | 'explain' | 'present';
export type RigPose = {
  headTilt: number; gazeX: number; gazeY: number; blink: number;
  mouthOpen: number; expression: Expression;
  leftShoulder: number; leftElbow: number; rightShoulder: number; rightElbow: number;
};
export const REST_POSE: RigPose = {headTilt: 0, gazeX: 0, gazeY: 0, blink: 0, mouthOpen: 0,
  expression: 'neutral', leftShoulder: 0, leftElbow: 0, rightShoulder: 0, rightElbow: 0};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));
export function normalizePose(input: Partial<RigPose> = {}): RigPose {
  const p = {...REST_POSE, ...input};
  return {...p, headTilt: clamp(p.headTilt, -12, 12), gazeX: clamp(p.gazeX, -1, 1), gazeY: clamp(p.gazeY, -1, 1),
    blink: clamp(p.blink, 0, 1), mouthOpen: clamp(p.mouthOpen, 0, 1),
    expression: ['neutral', 'smile', 'curious'].includes(p.expression) ? p.expression : 'neutral',
    leftShoulder: clamp(p.leftShoulder, -5, 12), leftElbow: clamp(p.leftElbow, 0, 65),
    rightShoulder: clamp(p.rightShoulder, -12, 5), rightElbow: clamp(p.rightElbow, -65, 0)};
}
export const GESTURES: Record<Gesture, Partial<RigPose>> = {
  rest: {}, explain: {leftShoulder: 10, leftElbow: 60, rightShoulder: -8, rightElbow: -48},
  present: {rightShoulder: -12, rightElbow: -65, headTilt: -4},
};
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
    const ramp = Math.min(.45, (cue.endSeconds - cue.startSeconds) / 2);
    const weight = ease((t - cue.startSeconds) / ramp) * ease((cue.endSeconds - t) / ramp);
    pose = Object.fromEntries(Object.entries(GESTURES[cue.gesture]).map(([key, value]) => [key, Number(value) * weight]));
  }
  return normalizePose({...pose, blink: blinkAt(t), mouthOpen: envelopeAt(options.envelope, t), expression: options.expression ?? 'neutral'});
}
