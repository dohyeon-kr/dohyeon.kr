import {z} from 'zod/v4';

// Manifest-level, continuous across scene transitions and the common CTA.
export const PresenterOverlaySchema = z.strictObject({position: z.literal('bottom-right')});
export type PresenterOverlaySpec = z.infer<typeof PresenterOverlaySchema>;
export const PRESENTER_OVERLAY_BOX = {left: 700, top: 1320, width: 190, height: 190} as const;
export function validatePresenterOverlay(manifest: {presenterOverlay?: unknown; scenes: readonly {presenter?: unknown; layout?: string}[]}) {
  if (manifest.presenterOverlay == null) return;
  PresenterOverlaySchema.parse(manifest.presenterOverlay);
  if (manifest.scenes.some(scene => scene.presenter != null || scene.layout === 'presenter-bust')) {
    throw new Error('Persistent presenter cannot be combined with a scene presenter');
  }
}
