import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {withBlogCta} from './blog-cta.mjs';
import {createPhotoSearch} from './resolve-visuals.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.join(repoRoot, 'shorts');
const publicRoot = path.join(shortsRoot, 'public');
const themeRoot = path.join(shortsRoot, 'hyperframes', 'monoliquid-v2');
const argv = process.argv.slice(2);
const manifestArg = argv.find(arg => !arg.startsWith('--'));
const preparedArg = argv.find(arg => arg.startsWith('--prepared='))?.slice('--prepared='.length) ?? null;
const outputArg = argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length) ?? null;

if (!manifestArg) {
  throw new Error('Usage: node shorts/scripts/build-hyperframes.mjs <shorts/content/.../candidate.json> [--prepared=shorts/.tmp/...json] [--output=dir]');
}

const safeName = value => String(value ?? '').replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const sceneDuration = scene => {
  // render.mjs stores the already-calculated visual duration in
  // audioDurationSeconds for prepared manifests. Keep the same .28s scene tail
  // as the existing Remotion renderer instead of applying CTA padding twice.
  const preparedDuration = Number(scene.audioDurationSeconds);
  if (Number.isFinite(preparedDuration) && preparedDuration > 0) return Math.max(2.2, preparedDuration + 0.28);
  if (scene.commonPage === 'blog-cta-v1') return 6.28;
  return 3.88;
};
const under = (file, root) => {
  const resolved = path.resolve(file);
  const normalizedRoot = path.resolve(root) + path.sep;
  return resolved.startsWith(normalizedRoot);
};

const manifestPath = path.resolve(repoRoot, manifestArg);
if (!under(manifestPath, path.join(shortsRoot, 'content')) || path.extname(manifestPath) !== '.json') {
  throw new Error('Manifest must be a JSON file under shorts/content/.');
}

const candidate = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const template = candidate.style?.template ?? candidate.style?.theme;
if (template !== 'monoliquid-v2') {
  throw new Error(`HyperFrames compiler only accepts style.template=monoliquid-v2; received ${template ?? '(none)'}`);
}

let manifest;
if (preparedArg) {
  const preparedPath = path.resolve(repoRoot, preparedArg);
  if (!under(preparedPath, path.join(shortsRoot, '.tmp'))) throw new Error('Prepared render manifest must live under shorts/.tmp/.');
  manifest = JSON.parse(await fs.readFile(preparedPath, 'utf8'));
} else {
  manifest = withBlogCta(structuredClone(candidate));
}

const slug = safeName(path.basename(path.dirname(manifestPath)));
const candidateId = safeName(candidate.id || path.basename(manifestPath, '.json'));
if (!slug || !candidateId) throw new Error('Unable to derive HyperFrames reel identity.');
const prefix = `${slug}-${candidateId}`;
const outputDir = path.resolve(repoRoot, outputArg ?? path.join('shorts', '.tmp', 'hyperframes', prefix));
if (!under(outputDir, path.join(shortsRoot, '.tmp'))) throw new Error('HyperFrames build output must live under shorts/.tmp/.');

await fs.rm(outputDir, {recursive: true, force: true});
await Promise.all([
  fs.mkdir(path.join(outputDir, 'fonts'), {recursive: true}),
  fs.mkdir(path.join(outputDir, 'media'), {recursive: true}),
]);
await Promise.all([
  fs.copyFile(path.join(themeRoot, 'DESIGN.md'), path.join(outputDir, 'DESIGN.md')),
  fs.copyFile(path.join(themeRoot, 'tokens.css'), path.join(outputDir, 'tokens.css')),
  fs.copyFile(path.join(themeRoot, 'theme.css'), path.join(outputDir, 'theme.css')),
  fs.copyFile(path.join(themeRoot, 'presenter.svg'), path.join(outputDir, 'presenter.svg')),
  fs.copyFile(path.join(repoRoot, 'themes', 'monoliquid', 'assets', 'fonts', 'pretendard-variable.woff2'), path.join(outputDir, 'fonts', 'pretendard-variable.woff2')),
  fs.copyFile(path.join(repoRoot, 'themes', 'monoliquid', 'assets', 'fonts', 'archivo-expanded-black-latin.woff2'), path.join(outputDir, 'fonts', 'archivo-expanded-black-latin.woff2')),
]);

async function copyPreparedMedia(relativePath, targetName) {
  if (!relativePath) return null;
  const source = path.resolve(publicRoot, relativePath);
  if (!under(source, publicRoot)) throw new Error(`Prepared media escaped public root: ${relativePath}`);
  const ext = path.extname(source) || '.bin';
  const target = path.join(outputDir, 'media', `${targetName}${ext}`);
  await fs.copyFile(source, target);
  return `media/${path.basename(target)}`;
}

async function downloadPreviewImage(scene, targetName) {
  const urls = [scene.image?.originalUrl, scene.image?.thumbnailUrl].filter(Boolean);
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: {'user-agent': 'dohyeon.kr-hyperframes/1.0 (+https://dohyeon.kr)'},
      });
      if (!response.ok) continue;
      const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      const ext = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : type === 'image/jpeg' || type === 'image/jpg' ? '.jpg' : null;
      if (!ext) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 25 * 1024 * 1024) continue;
      const target = path.join(outputDir, 'media', `${targetName}${ext}`);
      await fs.writeFile(target, bytes);
      return `media/${path.basename(target)}`;
    } catch (error) {
      console.warn(`Preview image fetch failed: ${url}: ${error.message}`);
    }
  }
  return null;
}

const previewPhotoSearch = preparedArg ? null : createPhotoSearch();
const timings = [];
const renderedScenes = [];
const audioTracks = [];
const timelineStatements = [];
let cursor = 0;

for (const [index, scene] of manifest.scenes.entries()) {
  const number = index + 1;
  const id = `scene-${String(number).padStart(2, '0')}`;
  const duration = sceneDuration(scene);
  const start = cursor;
  cursor += duration;
  const visualTrack = number;
  const audioTrack = 100 + number;

  const preparedImage = scene.imagePath ? await copyPreparedMedia(scene.imagePath, `${id}-image`) : null;
  let previewImage = scene.image ?? null;
  if (!preparedArg && !previewImage && scene.visual?.type === 'photo') {
    const query = compact(scene.visual?.query || scene.imageQuery);
    if (query) previewImage = await previewPhotoSearch(query);
  }
  const previewScene = previewImage === scene.image ? scene : {...scene, image: previewImage};
  const image = preparedImage ?? (!preparedArg ? await downloadPreviewImage(previewScene, `${id}-image`) : null);
  const audio = scene.audioPath ? await copyPreparedMedia(scene.audioPath, `${id}-audio`) : null;
  const kind = scene.kind || 'statement';
  const headline = compact(scene.headline) || compact(candidate.candidate?.title) || 'Untitled';
  const subline = compact(scene.subline);
  const comparisonLeft = compact(scene.comparisonLeft);
  const comparisonRight = compact(scene.comparisonRight);
  const visualLabel = compact(scene.visual?.value || scene.visual?.motif || scene.visualIntent?.concept);
  const sourceLabel = scene.commonPage === 'blog-cta-v1' ? 'DLOG / CTA' : `DLOG / ${kind.toUpperCase()}`;
  const fullBleed = scene.layout === 'photo-full-bleed' && Boolean(image);
  const presenterVisible = Boolean(manifest.presenterOverlay) && scene.commonPage !== 'blog-cta-v1';

  const body = [];
  if (kind === 'compare' && (comparisonLeft || comparisonRight)) {
    body.push(`<div class="ml-compare ml-primary-visual"><div class="ml-compare-side"><span class="ml-compare-label">A / BEFORE</span><strong class="ml-compare-value">${escapeHtml(comparisonLeft || '—')}</strong></div><div class="ml-compare-side"><span class="ml-compare-label">B / AFTER</span><strong class="ml-compare-value">${escapeHtml(comparisonRight || '—')}</strong></div></div>`);
  } else if ((scene.diagramSpec || scene.visual?.type === 'diagram') && !image) {
    const labels = [headline, subline || visualLabel || '관계', comparisonRight || '결과'].filter(Boolean).slice(0, 3);
    while (labels.length < 3) labels.push(['입력', '변화', '결과'][labels.length]);
    body.push(`<div class="ml-diagram ml-primary-visual">${labels.map(label => `<div class="ml-node">${escapeHtml(label)}</div>`).join('')}</div>`);
  } else if (image && !fullBleed) {
    body.push(`<div class="ml-image-wrap ml-primary-visual"><img class="ml-image" src="${escapeHtml(image)}" alt="" /></div>`);
  }

  const captions = Array.isArray(scene.captions) && scene.captions.length
    ? scene.captions.filter(cue => Number.isFinite(cue.startSeconds) && Number.isFinite(cue.endSeconds) && compact(cue.text))
    : [];
  const previewCaption = !captions.length ? compact(scene.beats?.[0]?.text || scene.narration) : '';
  const captionMarkup = captions.length
    ? captions.map((cue, cueIndex) => `<p id="caption-${index}-${cueIndex}" class="ml-caption">${escapeHtml(cue.text)}</p>`).join('')
    : previewCaption ? `<p class="ml-caption ml-caption--preview">${escapeHtml(previewCaption)}</p>` : '';
  const sceneClasses = ['clip', 'ml-scene', `ml-scene--${kind}`, fullBleed ? 'ml-scene--fullbleed' : ''].filter(Boolean).join(' ');
  const fullBleedMarkup = fullBleed
    ? `<div class="ml-fullbleed-media ml-primary-visual" data-layout-ignore><img class="ml-image ml-fullbleed-image" src="${escapeHtml(image)}" alt="" /></div>`
    : '';
  const presenterMarkup = presenterVisible
    ? '<div class="ml-presenter-overlay" data-layout-ignore aria-hidden="true"></div>'
    : '';

  renderedScenes.push(`
    <section id="${id}" class="${sceneClasses}" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="${visualTrack}">
      ${fullBleedMarkup}
      <div class="ml-grid"></div><span class="ml-tick ml-tick--tl"></span><span class="ml-tick ml-tick--br"></span>
      <div class="ml-content" data-layout-allow-overflow>
        <div class="ml-topline"><span class="ml-kicker">${escapeHtml(sourceLabel)}</span><span class="ml-index">${String(number).padStart(2, '0')} / ${String(manifest.scenes.length).padStart(2, '0')}</span></div>
        <div class="ml-hero">
          <h1 class="ml-headline">${escapeHtml(headline)}</h1>
          ${subline ? `<p class="ml-subline">${escapeHtml(subline)}</p>` : ''}
          <div class="ml-rule"></div>
          ${body.join('\n')}
        </div>
      </div>
      ${captionMarkup ? `<div class="ml-caption-zone">${captionMarkup}</div>` : ''}
      ${presenterMarkup}
    </section>`);

  if (audio) {
    // HyperFrames reads the real media duration for audio/video when
    // data-duration is omitted. render.mjs' visual duration can include CTA or
    // presenter padding, so using it as the media duration would extend silence.
    audioTracks.push(`<audio id="audio-${id}" data-start="${start.toFixed(3)}" data-track-index="${audioTrack}" src="${escapeHtml(audio)}" data-volume="1"></audio>`);
  }

  const enter = start + 0.04;
  timelineStatements.push(`tl.from("#${id} .ml-topline", {y:-18, opacity:0, duration:.34, ease:"power2.out"}, ${enter.toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ml-headline", {y:42, opacity:0, duration:.52, ease:"power3.out"}, ${(enter + 0.06).toFixed(3)});`);
  if (subline) timelineStatements.push(`tl.from("#${id} .ml-subline", {y:28, opacity:0, duration:.42, ease:"power2.out"}, ${(enter + 0.16).toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ml-rule", {scaleX:0, duration:.42, ease:"power2.out"}, ${(enter + 0.22).toFixed(3)});`);
  if (body.length || fullBleed) timelineStatements.push(`tl.from("#${id} .ml-primary-visual", {y:26, opacity:0, scale:.985, duration:.5, ease:"power2.out"}, ${(enter + 0.26).toFixed(3)});`);
  if (image) timelineStatements.push(`tl.from("#${id} .ml-image", {scale:1.025, duration:.8, ease:"power2.out"}, ${(enter + 0.28).toFixed(3)});`);
  if (presenterVisible) timelineStatements.push(`tl.from("#${id} .ml-presenter-overlay", {y:18, opacity:0, duration:.34, ease:"power2.out"}, ${(enter + 0.22).toFixed(3)});`);
  for (const [cueIndex, cue] of captions.entries()) {
    const cueStart = start + Math.max(0, cue.startSeconds);
    const cueEnd = start + Math.min(duration - 0.04, cue.endSeconds);
    timelineStatements.push(`tl.set("#caption-${index}-${cueIndex}", {opacity:1}, ${cueStart.toFixed(3)});`);
    timelineStatements.push(`tl.set("#caption-${index}-${cueIndex}", {opacity:0}, ${cueEnd.toFixed(3)});`);
  }
  const exit = start + Math.max(0.2, duration - 0.24);
  timelineStatements.push(`tl.to("#${id} .ml-content", {opacity:0, y:-14, duration:.2, ease:"power2.in"}, ${exit.toFixed(3)});`);

  timings.push({index: number, id, startSeconds: start, durationSeconds: duration, snapshotSeconds: start + duration * 0.72});
}

const totalDuration = cursor;
const compositionClassAttr = candidate.style?.colorScheme === 'dark' ? ' class="ml-theme--dark"' : '';
const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(candidate.candidate?.title || prefix)}</title>
  <link rel="stylesheet" href="tokens.css" />
  <link rel="stylesheet" href="theme.css" />
</head>
<body>
  <div id="monoliquid-v2"${compositionClassAttr} data-composition-id="monoliquid-v2" data-start="0" data-duration="${totalDuration.toFixed(3)}" data-track-index="0" data-width="1080" data-height="1920">
    ${renderedScenes.join('\n')}
    ${audioTracks.join('\n')}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({paused:true});
    ${timelineStatements.join('\n    ')}
    window.__timelines["monoliquid-v2"] = tl;
  </script>
</body>
</html>\n`;

await Promise.all([
  fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8'),
  fs.writeFile(path.join(outputDir, 'timings.json'), `${JSON.stringify({prefix, manifest: manifestArg, totalDurationSeconds: totalDuration, scenes: timings}, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
]);

if (process.env.GITHUB_OUTPUT) {
  await fs.appendFile(process.env.GITHUB_OUTPUT, `project_dir=${path.relative(repoRoot, outputDir)}\nprefix=${prefix}\ntotal_duration=${totalDuration.toFixed(3)}\n`);
}
console.log(`Built HyperFrames project ${path.relative(repoRoot, outputDir)} (${manifest.scenes.length} scenes, ${totalDuration.toFixed(2)}s).`);
