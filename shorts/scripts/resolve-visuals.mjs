import {validateDiagramLayout} from '../src/visuals/physics.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {curatedPhoto} from './curated-photos.mjs';

const normalizeOpenverseImage = (result, query) => ({
  query,
  title: result.title ?? null,
  creator: result.creator ?? null,
  license: result.license ?? 'unknown',
  licenseVersion: result.license_version ?? null,
  licenseUrl: result.license_url ?? null,
  source: result.source ?? null,
  provider: result.provider ?? null,
  sourcePage: result.foreign_landing_url ?? null,
  originalUrl: result.url ?? null,
  thumbnailUrl: result.thumbnail ?? null,
});

export const createPhotoSearch = ({fetchImpl = fetch, warn = console.warn} = {}) => {
  const openverseCache = new Map();
  return async (query) => {
    if (!query) return null;
    if (openverseCache.has(query)) return openverseCache.get(query);
    try {
      for (const license of ['cc0', 'pdm']) {
        const params = new URLSearchParams({q: query, license, page_size: '20', mature: 'false'});
        const response = await fetchImpl(`https://api.openverse.org/v1/images/?${params}`, {
          signal: AbortSignal.timeout(10_000),
          headers: {accept: 'application/json', 'user-agent': 'dohyeon.kr-shorts/3.0 (+https://dohyeon.kr)'},
        });
        if (response.status === 429) {
          warn(`Openverse rate limit reached while searching: ${query}`);
          break;
        }
        if (!response.ok) continue;
        const data = await response.json();
        const candidates = Array.isArray(data.results) ? data.results : [];
        const preferred = candidates.find((item) => Number(item.width) >= 900 && Number(item.height) >= 700 && item.url) ?? candidates.find((item) => item.url || item.thumbnail);
        if (preferred) {
          const normalized = normalizeOpenverseImage(preferred, query);
          openverseCache.set(query, normalized);
          return normalized;
        }
      }
    } catch (error) {
      warn(`Openverse search failed for ${JSON.stringify(query)}: ${error.message}`);
    }
    openverseCache.set(query, null);
    return null;
  };
};

const searchOpenverse = createPhotoSearch();

const normalizeCamera = (camera) => {
  const startProgress = Math.max(0, Math.min(1, camera.startProgress));
  const endProgress = Math.max(startProgress + 0.08, Math.min(1, camera.endProgress));
  return {...camera, startProgress, endProgress: Math.min(1, endProgress)};
};

const textFallback = (scene, reason, detail) => {
  return {
    ...scene,
    kind: scene.kind === 'hero' || scene.kind === 'outro' ? scene.kind : 'statement',
    layout: scene.kind === 'outro' ? 'outro-minimal' : 'statement-offset',
    visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
    visualIntent: {...scene.visualIntent, strategy: {
      type: 'minimal', metaphor: null,
      rationale: `${reason === 'invalid-diagram' ? '도식 검증에 실패해' : '사용 가능한 사진을 찾지 못해'} 원래 문구와 내레이션을 유지한 텍스트 장면으로 전환했습니다. 시각 연출 검토가 필요합니다.`,
    }},
    visualStory: null,
    diagramSpec: null,
    comparisonLeft: null,
    comparisonRight: null,
    camera: {motion: 'static', target: 'center', intensity: 'subtle', startProgress: 0, endProgress: 1},
    choreography: ['show-headline', ...(scene.subline ? ['show-subline'] : []), 'emphasize-result'],
    beats: scene.beats.map(beat => ({...beat, visualCue: null})),
    imageQuery: null,
    image: null,
    visualResolution: {status: 'fallback', originalQuery: scene.visual.query ?? null, reason, ...(detail ? {detail} : {})},
  };
};

export const enrichVisuals = async (candidate, {search = searchOpenverse, curated = curatedPhoto, warn = console.warn, repairDiagram, maxRepairAttempts = 3} = {}) => {
  if (!Number.isInteger(maxRepairAttempts) || maxRepairAttempts < 0 || maxRepairAttempts > 3) throw new Error("maxRepairAttempts must be an integer from 0 to 3");
  const scenes = [];
  for (const originalScene of candidate.scenes) {
    let scene = originalScene;
    if (scene.diagramSpec || scene.visual.type === 'diagram') {
      for (let attempt = 0; ; attempt++) {
        try {
          validateDiagramLayout(validateDiagram(scene.diagramSpec));
          break;
        } catch (error) {
          const context = `Invalid diagram in ${JSON.stringify(candidate.title)}, scene ${scenes.length + 1}`;
          if (!repairDiagram || attempt >= maxRepairAttempts) {
            throw new Error(`${context} after ${attempt} repair attempts: ${error.message}`, {cause: error});
          }
          warn(`${context}: ${error.message}. Repair ${attempt + 1}/${maxRepairAttempts}`);
          try {
            const diagramSpec = await repairDiagram({scene: structuredClone(scene), title: candidate.title,
              sceneNumber: scenes.length + 1, error: error.message, attempt: attempt + 1});
            // Only the diagram can change; narration, beats and other scenes remain intact.
            scene = {...scene, diagramSpec};
          } catch (repairError) {
            throw new Error(`${context}: repair ${attempt + 1} failed: ${repairError.message}`, {cause: repairError});
          }
        }
      }
    }
    const imageQuery = scene.visual.type === 'photo' ? scene.visual.query?.trim() || null : null;
    const image = imageQuery ? (await search(imageQuery)) ?? curated(imageQuery) : null;
    if (scene.visual.type === 'photo' && !image) {
      warn(`Photo unavailable in ${JSON.stringify(candidate.title)}, scene ${scenes.length + 1}: ${JSON.stringify(imageQuery)}. Using a text scene; review its visual direction.`);
      scenes.push(textFallback(scene, 'photo-unavailable'));
      continue;
    }
    scenes.push({...scene, camera: normalizeCamera(scene.camera), imageQuery, image});
  }
  return {...candidate, scenes};
};


