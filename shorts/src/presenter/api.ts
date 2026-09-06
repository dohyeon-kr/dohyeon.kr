import {normalizePose, REST_POSE, blinkAt, type RigPose} from './rig.ts';
import {validatePresenter, type PresenterSpec} from './schema.ts';
import type {Action, Expression, HandShape, MouthShape, Side} from './vocabulary.ts';
export * from './vocabulary.ts';
export * from './schema.ts';
// v1 hand fields remain readable for old candidates, but the current bust never draws them.
export const PRESENTER_CAPABILITIES = {hands:false, depth:'layered-shading', expressions:true, mouthTracks:true} as const;

export const ACTION_PRESETS: Record<Action, {hand: HandShape; side: Side; x: number; y: number; wrist: number; tilt: number}> = {
  idle: {hand:'relaxed',side:'right',x:535,y:690,wrist:12,tilt:0},
  explain: {hand:'open',side:'right',x:505,y:550,wrist:18,tilt:1},
  present: {hand:'palmUp',side:'left',x:505,y:550,wrist:0,tilt:-2},
  point: {hand:'point',side:'right',x:526,y:535,wrist:28,tilt:2},
  emphasize: {hand:'fist',side:'right',x:490,y:550,wrist:8,tilt:-1},
};
export type PresenterState = {action?: Action; side?: Side; hand?: HandShape; intensity?: number; expression?: Expression; mouth?: {shape:MouthShape; intensity?:number}};
const ease = (x:number) => {const p=Math.min(1,Math.max(0,x)); return p*p*(3-2*p);};
export function statePose(state: PresenterState = {}, weight = 1, wristWeight = weight): RigPose {
  const preset = ACTION_PRESETS[state.action ?? 'idle'];
  if (!preset) throw new Error('Unknown presenter action');
  const side = state.side ?? preset.side;
  const w = weight * Math.min(1,Math.max(0,state.intensity ?? 1));
  const restX = side === 'left' ? REST_POSE.leftHandX : REST_POSE.rightHandX;
  const targetX = side === 'left' ? 800-preset.x : preset.x;
  const pose: Partial<RigPose> = {expression:state.expression ?? 'neutral', mouthShape:state.mouth?.shape ?? 'rest', mouthOpen:state.mouth?.intensity ?? (state.mouth && state.mouth.shape !== 'rest' ? .7 : 0)};
  if (state.action !== 'idle' && state.action !== undefined) Object.assign(pose, {
    [`${side}HandX`]:restX+(targetX-restX)*w+(side==='left' ? -8 : 8)*Math.sin(Math.PI*w),
    [`${side}HandY`]:690+(preset.y-690)*w,
    [`${side}Wrist`]:(side==='left' ? -1 : 1)*(12+(preset.wrist-12)*wristWeight*(state.intensity ?? 1)),
    // Swap the shape only while below the circle, and keep it throughout the gesture.
    [`${side}HandShape`]:weight>0 ? state.hand ?? preset.hand : 'relaxed',
    headTilt:preset.tilt*w,
  });
  return normalizePose(pose);
}
/** Validate once, evaluate deterministically at scene-local seconds (end-exclusive cues). */
export function compilePresenter(input: PresenterSpec, duration = 600) {
  const spec = validatePresenter(input,duration);
  return (seconds:number): RigPose => {
    const t=Number.isFinite(seconds) ? seconds : -1;
    const active=<T extends {start:number;end:number}>(track?:T[]) => track?.find(c=>t>=c.start && t<c.end);
    const action=active(spec.actions), expression=active(spec.expressions), mouth=active(spec.mouths);
    let weight=0, wristWeight=0;
    if(action) {const ramp=Math.min(.7,(action.end-action.start)/2);
      weight=ease((t-action.start)/ramp)*ease((action.end-t)/ramp);
      wristWeight=ease((t-action.start-Math.min(.08,ramp*.2))/ramp)*ease((action.end-t)/ramp);
    }
    const p=statePose({action:action?.name,side:action?.side,hand:action?.hand,intensity:action?.intensity,expression:expression?.name,mouth},weight,wristWeight);
    p.blink=blinkAt(t);
    return p;
  };
}
export function presenterAt(seconds:number, spec:PresenterSpec, duration=600) {return compilePresenter(spec,duration)(seconds);}
