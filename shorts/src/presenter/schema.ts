import {z} from 'zod/v4';
import {ACTIONS, EXPRESSIONS, HAND_SHAPES, MOUTH_SHAPES} from './vocabulary.ts';

const interval = {start: z.number().min(0).max(600), end: z.number().positive().max(600)};
export const ActionCueSchema = z.strictObject({...interval, name: z.enum(ACTIONS), side: z.enum(['left', 'right']).optional(), hand: z.enum(HAND_SHAPES).optional(), intensity: z.number().min(0).max(1).optional()});
export const ExpressionCueSchema = z.strictObject({...interval, name: z.enum(EXPRESSIONS)});
export const MouthCueSchema = z.strictObject({...interval, shape: z.enum(MOUTH_SHAPES), intensity: z.number().min(0).max(1).optional()});
export const PresenterSchema = z.strictObject({
  version: z.literal(1).optional(),
  actions: z.array(ActionCueSchema).max(40).optional(),
  expressions: z.array(ExpressionCueSchema).max(40).optional(),
  mouths: z.array(MouthCueSchema).max(4000).optional(),
});
export type PresenterSpec = z.infer<typeof PresenterSchema>;
export type MouthCue = z.infer<typeof MouthCueSchema>;
// Strict structured output requires every property; null means use the runtime default.
export const GeneratedPresenterSchema = z.strictObject({
  version: z.literal(1),
  actions: z.array(ActionCueSchema.extend({side: z.enum(['left','right']).nullable(), hand: z.enum(HAND_SHAPES).nullable(), intensity: z.number().min(0).max(1).nullable()})).max(40),
  expressions: z.array(ExpressionCueSchema).max(40),
});
export function normalizeGeneratedPresenter(input: unknown): PresenterSpec | null {
  if (input == null) return null;
  const p = GeneratedPresenterSchema.parse(input);
  return {...p, actions: p.actions.map(c => ({start:c.start, end:c.end, name:c.name,
    ...(c.side == null ? {} : {side:c.side}), ...(c.hand == null ? {} : {hand:c.hand}), ...(c.intensity == null ? {} : {intensity:c.intensity})}))};
}
export function validatePresenter(input: unknown, duration = 600): PresenterSpec {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error('presenter: invalid scene duration');
  const p = PresenterSchema.parse(input);
  for (const key of ['actions','expressions','mouths'] as const) {
    let end = 0;
    for (const [i,cue] of [...(p[key] ?? [])].sort((a,b)=>a.start-b.start).entries()) {
      if (cue.end <= cue.start || cue.end > duration + 1e-8) throw new Error(`presenter.${key}[${i}]: invalid interval or exceeds scene duration ${duration}`);
      if (cue.start < end) throw new Error(`presenter.${key}[${i}]: overlapping intervals`);
      end = cue.end;
    }
  }
  return p;
}
export function validateScenePresenter(scene: {presenter?: PresenterSpec | null; layout?: string; commonPage?: string; visual?: {type?: string}; diagramSpec?: unknown; backgroundVideo?: unknown; image?: unknown; comparisonLeft?: string | null; comparisonRight?: string | null; camera?: {motion?:string} | null; effects?: readonly unknown[] | null}, duration?: number) {
  if (scene.presenter == null) {
    if (scene.layout === 'presenter-bust') throw new Error('presenter-bust requires presenter (use {} for idle)');
    return;
  }
  validatePresenter(scene.presenter, duration);
  if (scene.layout !== 'presenter-bust' || scene.commonPage) throw new Error('presenter requires the dedicated presenter-bust layout, never the common CTA');
  if (scene.diagramSpec || scene.backgroundVideo || scene.image || (scene.visual && scene.visual.type !== 'none')) throw new Error('presenter-bust reserves its own white page; do not hide a photo/diagram behind it');
  if (scene.comparisonLeft || scene.comparisonRight || scene.effects?.length || (scene.camera && scene.camera.motion !== 'static')) throw new Error('presenter-bust requires no comparison/effects and a static camera');
}
