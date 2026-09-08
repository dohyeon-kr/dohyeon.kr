import {z} from 'zod/v4';
import {validatePresenter, type PresenterSpec} from './schema.ts';

// Manifest-level and continuous across transitions; CTA visibility is configurable.
export const PresenterOverlaySchema = z.strictObject({position: z.literal('bottom-right'), frame: z.enum(['circle', 'torn-paper-blue']).optional(), hideOnCommonCta: z.boolean().optional(), lipSync: z.enum(['none', 'word-timestamps']).optional(), nod: z.enum(['none', 'speech']).optional()});
export type PresenterOverlaySpec = z.infer<typeof PresenterOverlaySchema>;
export const PRESENTER_OVERLAY_BOX = {left: 700, top: 1320, width: 190, height: 190} as const;
export function validatePresenterOverlay(manifest: {presenterOverlay?: unknown; scenes: readonly {presenter?: unknown; layout?: string}[]}) {
  if (manifest.presenterOverlay == null) return;
  PresenterOverlaySchema.parse(manifest.presenterOverlay);
  if (manifest.scenes.some(scene => scene.presenter != null || scene.layout === 'presenter-bust')) {
    throw new Error('Persistent presenter cannot be combined with a scene presenter');
  }
}

export const overlayVisible = (options: PresenterOverlaySpec | null | undefined, scene: {commonPage?: string}) =>
  options != null && !(options.hideOnCommonCta && scene.commonPage === 'blog-cta-v1');
export const overlayNeedsAlignment = (options: PresenterOverlaySpec | null | undefined, scene: {commonPage?: string; narration?: string}) =>
  overlayVisible(options, scene) && Boolean(scene.narration?.trim()) && (options?.lipSync === 'word-timestamps' || options?.nod === 'speech');
export type OverlayRenderScene = {commonPage?: string; narration?: string; audioPath?: string | null; audioDurationSeconds?: number | null; overlayPresenter?: PresenterSpec | null};
export function overlayTimeline(scenes: readonly OverlayRenderScene[], options: PresenterOverlaySpec, fps: number) {
  let cursor = 0;
  return scenes.map(scene => {
    const frames = Math.max(Math.round(2.2 * fps), Math.ceil(((scene.audioDurationSeconds ?? 3.6) + .28) * fps));
    if (scene.audioPath && overlayNeedsAlignment(options, scene) && !scene.overlayPresenter) throw new Error('TTS presenter tracks missing: prepare speech alignment before rendering');
    const tracks = validatePresenter(scene.overlayPresenter ?? {}, frames / fps);
    if (scene.audioPath && overlayNeedsAlignment(options, scene) && options.lipSync === 'word-timestamps' && !tracks.mouths?.length) throw new Error('TTS mouth cues missing');
    const entry = {scene, start: cursor, end: cursor + frames, duration: frames / fps, tracks};
    cursor += frames;
    return entry;
  });
}
