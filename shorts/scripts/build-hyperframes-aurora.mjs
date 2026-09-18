import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {withBlogCta, BLOG_CTA_ID, BLOG_URL} from './blog-cta.mjs';
import {assertAuroraStrictLayout, auroraNodePosition, inferAuroraRole} from './aurora-strict-layout.mjs';
import {captionsFromBeatTimings} from './caption-alignment.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.join(repoRoot, 'shorts');
const publicRoot = path.join(shortsRoot, 'public');
const themeRoot = path.join(shortsRoot, 'hyperframes', 'aurora-explain');
const argv = process.argv.slice(2);
const manifestArg = argv.find(arg => !arg.startsWith('--'));
const preparedArg = argv.find(arg => arg.startsWith('--prepared='))?.slice('--prepared='.length) ?? null;
const outputArg = argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length) ?? null;

if (!manifestArg) throw new Error('Usage: node shorts/scripts/build-hyperframes.mjs <shorts/content/.../candidate.json> [--prepared=shorts/.tmp/...json] [--output=dir]');

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const safeName = value => String(value ?? '').replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const under = (file, root) => {
  const resolved = path.resolve(file);
  const normalizedRoot = path.resolve(root) + path.sep;
  return resolved.startsWith(normalizedRoot);
};
const sceneDuration = scene => {
  const preparedDuration = Number(scene.audioDurationSeconds);
  if (Number.isFinite(preparedDuration) && preparedDuration > 0) return Math.max(2.2, preparedDuration + 0.28);
  if (scene.commonPage === BLOG_CTA_ID) return 6.28;
  return 3.88;
};

const manifestPath = path.resolve(repoRoot, manifestArg);
if (!under(manifestPath, path.join(shortsRoot, 'content')) || path.extname(manifestPath) !== '.json') {
  throw new Error('Manifest must be a JSON file under shorts/content/.');
}
const candidate = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const template = candidate.style?.template ?? candidate.style?.theme;
if (template !== 'aurora-explain') throw new Error(`Aurora compiler requires style.template=aurora-explain; received ${template ?? '(none)'}`);

let manifest;
if (preparedArg) {
  const preparedPath = path.resolve(repoRoot, preparedArg);
  if (!under(preparedPath, path.join(shortsRoot, '.tmp'))) throw new Error('Prepared render manifest must live under shorts/.tmp/.');
  manifest = JSON.parse(await fs.readFile(preparedPath, 'utf8'));
} else {
  manifest = withBlogCta(structuredClone(candidate));
}
manifest.presenterOverlay = null;
for (const scene of manifest.scenes) scene.presenter = null;
assertAuroraStrictLayout(manifest);

const slug = safeName(path.basename(path.dirname(manifestPath)));
const candidateId = safeName(candidate.id || path.basename(manifestPath, '.json'));
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
  fs.copyFile(path.join(repoRoot, 'themes', 'monoliquid', 'assets', 'fonts', 'pretendard-variable.woff2'), path.join(outputDir, 'fonts', 'pretendard-variable.woff2')),
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

function iconMarkup(role) {
  if (role === 'browser') return `<svg class="ax-object-icon" viewBox="0 0 72 64" aria-hidden="true"><rect class="shell" x="7" y="8" width="58" height="48" rx="10"/><path class="line" d="M7 21h58"/><circle class="dot" cx="15" cy="14.5" r="2"/><circle class="dot" cx="21" cy="14.5" r="2"/><circle class="dot" cx="27" cy="14.5" r="2"/><rect class="panel" x="14" y="28" width="17" height="20" rx="4"/><rect class="panel" x="36" y="28" width="22" height="6" rx="3"/><path class="violet" d="M37 43h16m-16 5h10"/></svg>`;
  if (role === 'datastore' || role === 'cache') return `<svg class="ax-object-icon" viewBox="0 0 72 64" aria-hidden="true"><path class="shell" d="M13 17c0-5 10.3-9 23-9s23 4 23 9v30c0 5-10.3 9-23 9s-23-4-23-9V17Z"/><ellipse class="panel" cx="36" cy="17" rx="23" ry="9"/><path class="line" d="M13 31c0 5 10.3 9 23 9s23-4 23-9M13 17c0 5 10.3 9 23 9s23-4 23-9"/><path class="line" d="M20 22v20c0 3 5.7 5.8 11 6.4"/><circle class="accent" cx="53" cy="46" r="3"/></svg>`;
  if (role === 'terminal') return `<svg class="ax-object-icon" viewBox="0 0 72 64" aria-hidden="true"><rect class="shell" x="7" y="9" width="58" height="46" rx="10"/><path class="line" d="M7 21h58M18 32l7 6-7 6M31 44h17"/><circle class="accent" cx="15" cy="15" r="2"/></svg>`;
  if (role === 'queue') return `<svg class="ax-object-icon" viewBox="0 0 72 64" aria-hidden="true"><rect class="shell" x="10" y="12" width="52" height="40" rx="11"/><rect class="panel" x="17" y="21" width="9" height="22" rx="3"/><rect class="panel" x="31" y="21" width="9" height="22" rx="3"/><rect class="panel" x="45" y="21" width="9" height="22" rx="3"/><circle class="accent" cx="50" cy="32" r="3"/></svg>`;
  return `<svg class="ax-object-icon" viewBox="0 0 72 64" aria-hidden="true"><rect class="shell" x="11" y="9" width="50" height="46" rx="12"/><rect class="panel" x="20" y="18" width="32" height="10" rx="4"/><rect class="panel" x="20" y="34" width="32" height="10" rx="4"/><circle class="accent" cx="25" cy="23" r="2"/><circle class="dot" cx="31" cy="23" r="1.7"/><path class="violet" d="M23 49h26"/></svg>`;
}

function diagramMarkup(scene, sceneId) {
  const spec = scene.diagramSpec;
  if (!spec?.nodes?.length) return {markup: '', timeline: [], pulses: []};
  const nodeById = new Map(spec.nodes.map(node => [node.id, node]));
  const objects = spec.nodes.filter(node => node.shape !== 'line').map(node => {
    const role = inferAuroraRole(node);
    const p = auroraNodePosition(node);
    const label = compact(node.label) || node.id;
    return `<div id="${sceneId}-object-${escapeHtml(node.id)}" class="ax-object ax-smoked-panel" data-ax-object="${escapeHtml(node.id)}" data-role="${role}" style="left:${p.left.toFixed(2)}%;top:${p.top.toFixed(2)}%;width:${p.width.toFixed(1)}px;min-height:${p.height.toFixed(1)}px">${iconMarkup(role)}<strong class="ax-object-label">${escapeHtml(label)}</strong><span class="ax-object-meta">${escapeHtml(role.toUpperCase())}</span></div>`;
  }).join('');

  const connectorNodes = spec.nodes.filter(node => node.shape === 'line' && node.connector);
  const flowEffects = new Map((scene.effects ?? [])
    .filter(effect => effect.type === 'flow-glow')
    .map(effect => [effect.target, effect]));
  const connections = connectorNodes.map(node => {
    const source = nodeById.get(node.connector.source);
    const target = nodeById.get(node.connector.target);
    if (!source || !target) return '';
    const s = auroraNodePosition(source);
    const t = auroraNodePosition(target);
    const accent = /hit|active|request|flow|persist|save|write/i.test(`${node.id} ${node.label}`) ? ' is-accent' : '';
    const points = `x1="${s.left.toFixed(2)}%" y1="${s.top.toFixed(2)}%" x2="${t.left.toFixed(2)}%" y2="${t.top.toFixed(2)}%"`;
    return `<line id="${sceneId}-connection-${escapeHtml(node.id)}" class="ax-connector${accent}" data-ax-connection="${escapeHtml(node.id)}" ${points}/>`;
  }).join('');
  const pulseMarks = connectorNodes.map(node => {
    const source = nodeById.get(node.connector.source);
    const target = nodeById.get(node.connector.target);
    if (!source || !target) return '';
    const s = auroraNodePosition(source);
    const effect = flowEffects.get(node.id);
    const core = /^#[0-9a-fA-F]{6}$/.test(effect?.color ?? '') ? effect.color : '#ffffff';
    return `<i id="${sceneId}-pulse-${escapeHtml(node.id)}" class="ax-connector-pulse" data-ax-pulse="${escapeHtml(node.id)}" style="left:${s.left.toFixed(2)}%;top:${s.top.toFixed(2)}%;--ax-pulse-core:${core}"></i>`;
  }).join('');

  const timeline = [];
  for (const event of spec.events ?? []) {
    const node = nodeById.get(event.target);
    if (!node) continue;
    const selector = node.shape === 'line' ? `#${sceneId}-connection-${event.target}` : `#${sceneId}-object-${event.target}`;
    let property = event.property;
    let from = event.from;
    let to = event.to;
    if (property === 'x') { property = 'left'; from = `${clamp(event.from / 800 * 100, -20, 120)}%`; to = `${clamp(event.to / 800 * 100, -20, 120)}%`; }
    if (property === 'y') { property = 'top'; from = `${clamp(event.from / 560 * 100, -20, 120)}%`; to = `${clamp(event.to / 560 * 100, -20, 120)}%`; }
    if (property === 'width' || property === 'height') { from = `${Math.max(1, event.from)}px`; to = `${Math.max(1, event.to)}px`; }
    if (property === 'noiseAmount') continue;
    timeline.push({selector, property, from, to, start: event.start, end: event.end});
  }

  const pulses = connectorNodes.map(node => {
    const source = nodeById.get(node.connector.source);
    const target = nodeById.get(node.connector.target);
    if (!source || !target) return null;
    const s = auroraNodePosition(source);
    const t = auroraNodePosition(target);
    const effect = flowEffects.get(node.id);
    if (effect) {
      return {
        selector: `#${sceneId}-pulse-${node.id}`,
        startMs: effect.startMs,
        durationMs: effect.durationMs,
        intensity: effect.intensity,
        fromLeft: s.left,
        fromTop: s.top,
        toLeft: t.left,
        toTop: t.top,
      };
    }
    const reveal = (spec.events ?? [])
      .filter(event => event.target === node.id && event.property === 'opacity')
      .sort((a, b) => a.start - b.start)[0];
    const start = clamp((reveal?.end ?? .28) + .04, .08, .82);
    return {
      selector: `#${sceneId}-pulse-${node.id}`,
      start,
      end: clamp(start + .28, start + .08, .98),
      intensity: .98,
      fromLeft: s.left,
      fromTop: s.top,
      toLeft: t.left,
      toTop: t.top,
    };
  }).filter(Boolean);

  return {
    markup: `<div class="ax-diagram"><svg class="ax-connector-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ax-flow-gradient"><stop offset="0" stop-color="#765eff"/><stop offset="1" stop-color="#55ddff"/></linearGradient></defs>${connections}</svg>${objects}${pulseMarks}</div>`,
    timeline,
    pulses,
  };
}

function ambientMarkup() {
  return `<div class="ax-ambient" data-layout-allow-overflow aria-hidden="true"><i class="ax-orb ax-orb--a" data-layout-allow-overflow></i><i class="ax-orb ax-orb--b" data-layout-allow-overflow></i><i class="ax-orb ax-orb--c" data-layout-allow-overflow></i></div>`;
}

function sceneCaptionMarkup(scene, sceneIndex) {
  const measuredPhrases = captionsFromBeatTimings(scene.beats, scene.beatTimings, {phraseLevel: true});
  const sourceCues = measuredPhrases?.length ? measuredPhrases : scene.captions;
  const cues = Array.isArray(sourceCues) ? sourceCues.filter(cue => Number.isFinite(cue.startSeconds) && Number.isFinite(cue.endSeconds) && compact(cue.text)) : [];
  if (cues.length) return {
    markup: `<div class="ax-caption-zone">${cues.map((cue, index) => `<p id="ax-caption-${sceneIndex}-${index}" class="ax-caption">${escapeHtml(cue.text)}</p>`).join('')}</div>`,
    cues,
  };
  const preview = compact(scene.beats?.[0]?.text || scene.narration);
  return {markup: preview ? `<div class="ax-caption-zone"><p class="ax-caption ax-caption--preview">${escapeHtml(preview)}</p></div>` : '', cues: []};
}

function renderCta(scene, id, start, duration) {
  const markup = `<section id="${id}" class="clip ax-scene ax-cta" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="999">${ambientMarkup()}<div class="ax-cta-card ax-smoked-panel"><span class="ax-cta-kicker">DLOG / CONTINUE</span><h2>${escapeHtml(scene.headline || '더 자세한 이야기는\n블로그에서')}</h2><p>${escapeHtml(scene.subline || '프로필 링크에서 읽기')}</p><div class="ax-cta-action"><span>${BLOG_URL}</span><b>↗</b></div><div class="ax-sweep" data-layout-allow-overflow></div></div></section>`;
  const timeline = [
    `tl.fromTo("#${id} .ax-cta-card", {y:46, opacity:0, scale:.97}, {y:0, opacity:1, scale:1, duration:.62, ease:"power3.out"}, ${(start + .18).toFixed(3)});`,
    `tl.fromTo("#${id} .ax-sweep", {x:"0%", opacity:0}, {x:"430%", opacity:1, duration:.7, ease:"power2.inOut"}, ${(start + .92).toFixed(3)});`,
    `tl.fromTo("#${id} .ax-orb--a", {scale:.82, opacity:.12}, {scale:1.18, opacity:.32, duration:1.2, ease:"power2.out"}, ${(start + .1).toFixed(3)});`,
  ];
  return {markup, timeline};
}

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
  const audio = scene.audioPath ? await copyPreparedMedia(scene.audioPath, `${id}-audio`) : null;
  if (audio) audioTracks.push(`<audio id="audio-${id}" data-start="${start.toFixed(3)}" data-track-index="${100 + number}" src="${escapeHtml(audio)}" data-volume="1"></audio>`);

  if (scene.commonPage === BLOG_CTA_ID) {
    const cta = renderCta(scene, id, start, duration);
    renderedScenes.push(cta.markup.replace('data-track-index="999"', `data-track-index="${number}"`));
    timelineStatements.push(...cta.timeline);
    timings.push({index: number, id, startSeconds: start, durationSeconds: duration, snapshotSeconds: start + duration * .72});
    continue;
  }

  const heading = compact(scene.headline) || compact(candidate.candidate?.title) || 'Untitled';
  const subline = compact(scene.subline);
  const diagram = diagramMarkup(scene, id);
  const caption = sceneCaptionMarkup(scene, index);
  const preparedImage = scene.imagePath ? await copyPreparedMedia(scene.imagePath, `${id}-image`) : null;
  const image = preparedImage || scene.image?.originalUrl || scene.image?.thumbnailUrl || null;
  let stage = '';
  if (diagram.markup) stage = diagram.markup;
  else if (image) stage = `<div class="ax-photo-stage ax-smoked-panel"><div class="ax-media"><img src="${escapeHtml(image)}" alt=""/></div></div>`;
  else stage = `<div class="ax-statement"><div class="ax-statement-card ax-smoked-panel"><strong>${escapeHtml(heading)}</strong>${subline ? `<span>${escapeHtml(subline)}</span>` : ''}</div></div>`;

  renderedScenes.push(`<section id="${id}" class="clip ax-scene" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="${number}">${ambientMarkup()}<div class="ax-topline"><span>DLOG / ${escapeHtml(String(scene.kind || 'statement').toUpperCase())}</span><span>${String(number).padStart(2, '0')} / ${String(manifest.scenes.length).padStart(2, '0')}</span></div><div class="ax-heading"><h1>${escapeHtml(heading)}</h1>${subline ? `<p>${escapeHtml(subline)}</p>` : ''}</div><div class="ax-stage">${stage}</div>${caption.markup}</section>`);

  const enter = start + .04;
  timelineStatements.push(`tl.from("#${id} .ax-topline", {y:-16, opacity:0, duration:.32, ease:"power2.out"}, ${enter.toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ax-heading", {y:34, opacity:0, duration:.5, ease:"power3.out"}, ${(enter + .06).toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ax-stage", {y:24, opacity:0, scale:.985, duration:.54, ease:"power2.out"}, ${(enter + .18).toFixed(3)});`);
  timelineStatements.push(`tl.fromTo("#${id} .ax-orb--a", {scale:.86, opacity:.1}, {scale:1.08, opacity:.28, duration:${Math.min(1.15, duration / 2).toFixed(2)}, ease:"power1.inOut"}, ${(start + .1).toFixed(3)});`);
  timelineStatements.push(`tl.fromTo("#${id} .ax-orb--b", {scale:.92, opacity:.08}, {scale:1.12, opacity:.22, duration:${Math.min(1.35, duration / 2).toFixed(2)}, ease:"power1.inOut"}, ${(start + .24).toFixed(3)});`);

  for (const event of diagram.timeline) {
    const eventStart = start + clamp(event.start, 0, 1) * duration;
    const eventDuration = Math.max(.04, (clamp(event.end, 0, 1) - clamp(event.start, 0, 1)) * duration);
    const from = JSON.stringify({[event.property]: event.from});
    const to = JSON.stringify({[event.property]: event.to, duration: Number(eventDuration.toFixed(3)), ease: 'power2.inOut'});
    timelineStatements.push(`tl.fromTo("${event.selector}", ${from}, ${to}, ${eventStart.toFixed(3)});`);
  }
  for (const pulse of diagram.pulses) {
    const explicit = Number.isFinite(pulse.startMs) && Number.isFinite(pulse.durationMs);
    const offset = explicit ? clamp(pulse.startMs / 1000, 0, Math.max(0, duration - .12)) : clamp(pulse.start, 0, 1) * duration;
    const pulseStart = start + offset;
    const requestedDuration = explicit
      ? Math.max(.16, pulse.durationMs / 1000)
      : Math.max(.16, (clamp(pulse.end, 0, 1) - clamp(pulse.start, 0, 1)) * duration);
    const pulseDuration = Math.min(requestedDuration, Math.max(.16, duration - offset - .04));
    const fadeIn = Math.min(.12, pulseDuration * .16);
    const fadeOut = Math.min(.16, pulseDuration * .2);
    const opacity = clamp(Number(pulse.intensity ?? .98), 0, 1);
    timelineStatements.push(`tl.set("${pulse.selector}", {left:"${pulse.fromLeft.toFixed(2)}%", top:"${pulse.fromTop.toFixed(2)}%", opacity:0, scale:.62}, ${pulseStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${pulse.selector}", {opacity:${opacity.toFixed(3)}, scale:1, duration:${fadeIn.toFixed(3)}, ease:"power2.out"}, ${pulseStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${pulse.selector}", {left:"${pulse.toLeft.toFixed(2)}%", top:"${pulse.toTop.toFixed(2)}%", duration:${pulseDuration.toFixed(3)}, ease:"none"}, ${pulseStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${pulse.selector}", {opacity:0, scale:.72, duration:${fadeOut.toFixed(3)}, ease:"power1.out"}, ${Math.max(pulseStart, pulseStart + pulseDuration - fadeOut).toFixed(3)});`);
  }
  for (const [cueIndex, cue] of caption.cues.entries()) {
    const cueStart = start + Math.max(0, cue.startSeconds);
    const cueEnd = start + Math.min(duration - .04, cue.endSeconds);
    timelineStatements.push(`tl.set("#ax-caption-${index}-${cueIndex}", {opacity:1}, ${cueStart.toFixed(3)});`);
    timelineStatements.push(`tl.set("#ax-caption-${index}-${cueIndex}", {opacity:0}, ${cueEnd.toFixed(3)});`);
  }
  timings.push({index: number, id, startSeconds: start, durationSeconds: duration, snapshotSeconds: start + duration * .72});
}

const totalDuration = cursor;
const timelineSource = `window.populateAuroraTimeline = function populateAuroraTimeline(tl) {\n  ${timelineStatements.join('\n  ')}\n};\n`;
const html = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n<title>${escapeHtml(candidate.candidate?.title || prefix)}</title>\n<link rel="stylesheet" href="tokens.css"/>\n<link rel="stylesheet" href="theme.css"/>\n</head>\n<body>\n<div id="aurora-explain" class="ax-theme" data-composition-id="aurora-explain" data-start="0" data-duration="${totalDuration.toFixed(3)}" data-track-index="0" data-width="1080" data-height="1920">\n${renderedScenes.join('\n')}\n${audioTracks.join('\n')}\n</div>\n<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n<script src="timeline.js"></script>\n<script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});window.populateAuroraTimeline(tl);window.__timelines["aurora-explain"]=tl;</script>\n</body>\n</html>\n`;

await Promise.all([
  fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8'),
  fs.writeFile(path.join(outputDir, 'timeline.js'), timelineSource, 'utf8'),
  fs.writeFile(path.join(outputDir, 'timings.json'), `${JSON.stringify({prefix, manifest: manifestArg, totalDurationSeconds: totalDuration, scenes: timings}, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
]);
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `project_dir=${path.relative(repoRoot, outputDir)}\nprefix=${prefix}\ntotal_duration=${totalDuration.toFixed(3)}\n`);
console.log(`Built Aurora HyperFrames project ${path.relative(repoRoot, outputDir)} (${manifest.scenes.length} scenes, ${totalDuration.toFixed(2)}s).`);
