import {z} from 'zod';

export const HYPERFRAMES_EASINGS = [
  'smooth',
  'spring-soft',
  'spring-snappy',
  'spring-bouncy',
] as const;

export const HyperFramesCameraKeyframeSchema = z.object({
  at: z.number().min(0).max(1),
  target: z.string().min(1).nullable(),
  scale: z.number().min(1).max(1.75),
  offsetX: z.number().min(-320).max(320),
  offsetY: z.number().min(-260).max(260),
  durationMs: z.number().min(100).max(2400),
  easing: z.enum(HYPERFRAMES_EASINGS),
}).strict();

export const HyperFramesObjectMotionSchema = z.object({
  target: z.string().min(1),
  at: z.number().min(0).max(1),
  kind: z.enum(['pop', 'grow', 'pulse', 'settle']),
  strength: z.number().min(0).max(1),
  durationMs: z.number().min(100).max(1800),
  easing: z.enum(HYPERFRAMES_EASINGS),
}).strict();

export const HyperFramesMotionSchema = z.object({
  stage: z.enum(['safe', 'full-bleed']),
  cameraTrack: z.array(HyperFramesCameraKeyframeSchema).max(12),
  objectMotions: z.array(HyperFramesObjectMotionSchema).max(24),
}).strict();

export type HyperFramesMotionSpec = z.infer<typeof HyperFramesMotionSchema>;

export function validateHyperFramesMotion(value: unknown, diagramNodeIds: readonly string[] = []) {
  if (value == null) return null;
  const spec = HyperFramesMotionSchema.parse(value);
  const ids = new Set(diagramNodeIds);
  for (const keyframe of spec.cameraTrack) {
    if (keyframe.target && !ids.has(keyframe.target)) {
      throw new Error(`Unknown HyperFrames camera target: ${keyframe.target}`);
    }
  }
  for (const cue of spec.objectMotions) {
    if (!ids.has(cue.target)) throw new Error(`Unknown HyperFrames object target: ${cue.target}`);
  }
  return spec;
}
