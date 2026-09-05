import {z} from 'zod/v4';
import type {CandidateScene} from '../types';

export const BackgroundVideoSchema = z.object({
  assetId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  startSeconds: z.number().min(0),
  endSeconds: z.number().positive(),
  playbackRate: z.number().min(.5).max(2),
  endBehavior: z.enum(['error', 'loop']),
  cropX: z.number().min(0).max(1),
  cropY: z.number().min(0).max(1),
  overlayOpacity: z.number().min(.35).max(.85),
});
export type BackgroundVideo = z.infer<typeof BackgroundVideoSchema>;
export function validateBackgroundVideo(scene: Pick<CandidateScene, 'backgroundVideo' | 'visual' | 'image' | 'camera'>) {
  if (!scene.backgroundVideo) return;
  const video = BackgroundVideoSchema.parse(scene.backgroundVideo);
  if (video.endSeconds <= video.startSeconds) throw new Error('Video end must follow start');
  if (scene.visual?.type === 'photo' || scene.image) throw new Error('Video background cannot share a scene with a photo');
  if (scene.camera && scene.camera.motion !== 'static') throw new Error('Video background requires a static camera');
}
export function videoFrameCount(seconds: number, fps = 30) {
  return Math.max(66, Math.ceil((seconds + .28) * fps));
}
