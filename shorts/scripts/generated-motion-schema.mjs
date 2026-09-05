import {z} from 'zod';
import {LightEffectSchema} from '../src/motion/schema.ts';
// All generated object properties are required for strict structured output.
export const GeneratedLightEffectSchema = LightEffectSchema.omit({radius: true, coreRadius: true, trailLength: true, origin: true, repeat: true});
export const GeneratedTransitionOptionsSchema = z.object({
  durationMs: z.number().min(0).max(1200), intensity: z.number().min(0).max(1),
  direction: z.enum(['left', 'right', 'up', 'down']), matchTarget: z.string().nullable(),
});
