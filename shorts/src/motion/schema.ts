import {z} from 'zod';

export const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'wipe', 'none', 'blur-dissolve', 'directional-blur', 'zoom-blur', 'defocus-refocus', 'cross-dissolve', 'dip-to-black', 'dip-to-white', 'push', 'iris-reveal', 'luma-wipe', 'match-cut', 'light-wipe', 'light-leak-transition', 'film-burn'] as const;
export const LIGHT_EFFECTS = ['light-sweep', 'light-leak', 'glow', 'bloom', 'lens-flare', 'light-streak', 'light-rays', 'spotlight', 'glint', 'rim-light', 'flow-glow'] as const;
export const TransitionOptionsSchema = z.object({
  durationMs: z.number().min(0).max(1200).optional(),
  intensity: z.number().min(0).max(1).optional(),
  direction: z.enum(['left', 'right', 'up', 'down']).optional(),
  origin: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  matchTarget: z.string().min(1).nullable().optional(),
}).strict();
export const LightEffectSchema = z.object({
  type: z.enum(LIGHT_EFFECTS),
  target: z.string().min(1),
  startMs: z.number().min(0).max(600000),
  durationMs: z.number().min(100).max(600000),
  intensity: z.number().min(0).max(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  seed: z.number().int().min(0).max(65535),
  radius: z.number().min(1).max(120).optional(),
  coreRadius: z.number().min(1).max(20).optional(),
  trailLength: z.number().min(0).max(100).optional(),
  origin: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  repeat: z.boolean().optional(),
}).strict();
export type LightEffect = z.infer<typeof LightEffectSchema>;
export type TransitionOptions = z.infer<typeof TransitionOptionsSchema>;
export type SceneTransition = typeof TRANSITIONS[number];

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {const p = clamp01(n); return p * p * (3 - 2 * p);};
export function effectState(effect: LightEffect, frame: number, fps: number) {
  const elapsed = frame * 1000 / fps - effect.startMs;
  const active = elapsed >= 0 && (effect.repeat || elapsed < effect.durationMs);
  const progress = active ? (effect.repeat ? elapsed % effect.durationMs : elapsed) / effect.durationMs : 0;
  const envelope = active ? smooth(progress / .15) * smooth((1 - progress) / .2) : 0;
  return {active: Boolean(active), progress, opacity: effect.intensity * envelope};
}
export function transitionProgress(frame: number, fps: number, durationInFrames: number, options?: TransitionOptions) {
  const frames = Math.min(Math.max(1, durationInFrames - 1), Math.round((options?.durationMs ?? 400) * fps / 1000));
  return frames === 0 ? 1 : smooth(frame / frames);
}
