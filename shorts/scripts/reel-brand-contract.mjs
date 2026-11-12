/**
 * Enforced visual contract for new Declarative Dither reels.
 * Legacy manifests without style.reelProfile keep the existing renderer.
 * Never infer an Instagram account from topic keywords or user prose.
 */
export const REEL_BRAND_VERSION = 1;

export const REEL_PROFILES = Object.freeze({
  dev_dohyeon: Object.freeze({
    id: 'dev_dohyeon',
    overline: 'DOHYEON KR',
    voice: 'Velvet Scholar',
    intent: 'strategy / work / capability',
  }),
  uncommon_sight: Object.freeze({
    id: 'uncommon_sight',
    overline: '내 멋대로 철학',
    voice: 'Velvet Scholar',
    intent: 'philosophy / analogy / open question',
  }),
});

export const REEL_TOKENS = Object.freeze({
  background: '#090a0b',
  foreground: '#f4f4f3',
  muted: '#a5a6a8',
  rule: '#45474a',
  koreanFont: 'Pretendard',
  englishFont: 'Archivo Expanded',
  size: Object.freeze({width: 1080, height: 1920, fps: 30}),
  // These are the conservative Declarative Dither text bounds, not a
  // platform guarantee. Recheck the published Instagram crop.
  criticalText: Object.freeze({left: 96, top: 270, right: 920, bottom: 1530}),
  coverText: Object.freeze({left: 96, top: 365, right: 920, bottom: 1560}),
  ditherStage: Object.freeze({left: 96, top: 320, right: 984, bottom: 1110}),
  bayerSize: 8,
  dotSpacingPx: 15,
  captionPx: 45,
});

export function reelProfileOf(style) {
  const name = style?.reelProfile;
  if (name == null || name === '') return null;
  const profile = REEL_PROFILES[name];
  if (!profile) throw new Error(`Unknown style.reelProfile: ${name}. Expected dev_dohyeon or uncommon_sight.`);
  if (style?.template !== 'monoliquid-v2' && style?.theme !== 'monoliquid-v2') {
    throw new Error('Declarative Dither reelProfile requires monoliquid-v2.');
  }
  if (style?.colorScheme && style.colorScheme !== 'dark') {
    throw new Error('Declarative Dither reelProfile requires dark colorScheme.');
  }
  return profile;
}

/** The modality follows meaning supplied by the scene plan; no random quota. */
export function ditherModeOf(scene) {
  if (scene.commonPage || scene.backgroundVideo) return 'none';
  if (scene.visual?.type === 'photo' || scene.kind === 'photo' ||
      (typeof scene.layout === 'string' && scene.layout.startsWith('photo-'))) return 'photo';
  if (scene.diagramSpec || scene.visual?.type === 'diagram') return 'diagram';
  const motif = String(scene.visual?.motif ?? '').toLowerCase();
  if (scene.visual?.type === 'symbol' && /(?:sphere|orb|ring|torus|blob|gravity)/.test(motif)) return 'object';
  return 'none';
}

export function validateReelManifest(manifest) {
  const profile = reelProfileOf(manifest.style);
  if (!profile) return null;
  if (!Array.isArray(manifest.scenes) || !manifest.scenes.length) {
    throw new Error('Declarative Dither reels require non-empty scenes.');
  }
  for (const [index, scene] of manifest.scenes.entries()) {
    if (ditherModeOf(scene) !== 'photo') continue;
    if (!(scene.imagePath || scene.image?.originalUrl || scene.image?.thumbnailUrl ||
          scene.imageQuery || scene.visual?.query)) {
      throw new Error(`Scene ${index + 1}: photo dithering requires a sourced image or concrete image query.`);
    }
    if (scene.diagramSpec) {
      throw new Error(`Scene ${index + 1}: photo and diagram cannot share the same dither stage.`);
    }
  }
  return profile;
}
