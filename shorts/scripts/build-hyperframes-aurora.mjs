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
const timelineEaseSource = easing => easing === 'smooth'
  ? '"power3.out"'
  : `springPreset("${easing}")`;
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

function semanticObjectMarkup(node, role, label) {
  const identity = `${node.id} ${label}`.toLowerCase();
  const stateClasses = [];
  if (/error|invalid|fail|잘못|실패/.test(identity)) stateClasses.push('is-error');
  else if (/verified|success|complete|완료/.test(identity)) stateClasses.push('is-success');
  else if (/normalized|정규화|010-\d{3,4}-\d{4}/.test(identity)) stateClasses.push('is-normalized');
  else if (/auth|인증 필요|verification/.test(identity)) stateClasses.push('is-auth');
  const stateClass = stateClasses.length ? ` ${stateClasses.join(' ')}` : '';
  if (role === 'input') {
    const parts = label.split(/\s*·\s*/).filter(Boolean);
    const primary = parts[0] || label;
    const status = parts.slice(1).join(' · ');
    const fieldLabel = /otp|verification|인증번호/.test(identity) ? '인증번호' : '휴대폰 번호';
    return {
      stateClass,
      markup: `<span class="ax-input-label">${escapeHtml(fieldLabel)}</span><div class="ax-input-control"><strong>${escapeHtml(primary)}</strong>${status ? `<em>${escapeHtml(status)}</em>` : ''}</div><span class="ax-object-meta">FORM FIELD</span>`,
    };
  }
  if (role === 'checklist') {
    const items = label.split(/\s*·\s*/).map(item => item.trim()).filter(Boolean);
    const itemMarkup = items.map(item => {
      const done = item.startsWith('✓');
      const pending = item.startsWith('☐');
      const text = item.replace(/^[✓☐]\s*/, '');
      return `<li data-state="${done ? 'done' : pending ? 'pending' : 'neutral'}"><i>${done ? '✓' : pending ? '○' : '•'}</i><span>${escapeHtml(text)}</span></li>`;
    }).join('');
    return {
      stateClass,
      markup: `<span class="ax-checklist-kicker">FE CHECKS</span><ul class="ax-checklist-items">${itemMarkup}</ul>`,
    };
  }
  return {
    stateClass,
    markup: `${iconMarkup(role)}<strong class="ax-object-label">${escapeHtml(label)}</strong><span class="ax-object-meta">${escapeHtml(role.toUpperCase())}</span>`,
  };
}

function diagramMarkup(scene, sceneId) {
  const spec = scene.diagramSpec;
  if (!spec?.nodes?.length) return {markup: '', timeline: [], pulses: [], focusPoints: {}};
  const nodeById = new Map(spec.nodes.map(node => [node.id, node]));
  const focusPoints = Object.fromEntries(spec.nodes
    .filter(node => node.shape !== 'line')
    .map(node => {
      const p = auroraNodePosition(node);
      return [node.id, {left: p.left, top: p.top}];
    }));
  const objects = spec.nodes.filter(node => node.shape !== 'line').map(node => {
    const role = inferAuroraRole(node);
    const p = auroraNodePosition(node);
    const label = compact(node.label) || node.id;
    const semantic = semanticObjectMarkup(node, role, label);
    const geometry = `left:${p.left.toFixed(2)}%;top:${p.top.toFixed(2)}%;width:${p.width.toFixed(1)}px;min-height:${p.height.toFixed(1)}px`;
    return `<div id="${sceneId}-object-bg-${escapeHtml(node.id)}" class="ax-object-bg ax-smoked-panel${semantic.stateClass}" data-ax-object-bg="${escapeHtml(node.id)}" data-role="${role}" style="${geometry}"></div><div id="${sceneId}-object-${escapeHtml(node.id)}" class="ax-object${semantic.stateClass}" data-ax-object="${escapeHtml(node.id)}" data-role="${role}" style="${geometry}">${semantic.markup}</div>`;
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
    // Draw in the same canonical 800x560 coordinate system that defines node centers.
    // This removes percentage/SVG viewport drift and guarantees center-to-center geometry.
    const sx = s.left * 8;
    const sy = s.top * 5.6;
    const tx = t.left * 8;
    const ty = t.top * 5.6;
    const points = `x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${tx.toFixed(2)}" y2="${ty.toFixed(2)}"`;
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
    const selector = node.shape === 'line'
      ? `#${sceneId}-connection-${event.target}`
      : `#${sceneId}-object-bg-${event.target},#${sceneId}-object-${event.target}`;
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
    const reveal = (spec.events ?? [])
      .filter(event => event.target === node.id && event.property === 'opacity')
      .sort((a, b) => a.start - b.start)[0];
    const lineReady = clamp(reveal?.end ?? 0, 0, 1);
    if (effect) {
      return {
        selector: `#${sceneId}-pulse-${node.id}`,
        startMs: effect.startMs,
        durationMs: effect.durationMs,
        intensity: effect.intensity,
        lineReady,
        fromLeft: s.left,
        fromTop: s.top,
        toLeft: t.left,
        toTop: t.top,
      };
    }
    const start = clamp((reveal?.end ?? .28) + .12, .12, .82);
    return {
      selector: `#${sceneId}-pulse-${node.id}`,
      start,
      end: clamp(start + .28, start + .08, .98),
      intensity: .98,
      lineReady,
      fromLeft: s.left,
      fromTop: s.top,
      toLeft: t.left,
      toTop: t.top,
    };
  }).filter(Boolean);

  return {
    markup: `<div class="ax-diagram"><svg class="ax-connector-layer" viewBox="0 0 800 560" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ax-flow-gradient"><stop offset="0" stop-color="#765eff"/><stop offset="1" stop-color="#55ddff"/></linearGradient></defs>${connections}</svg>${objects}${pulseMarks}</div>`,
    timeline,
    pulses,
    focusPoints,
  };
}

function sceneEffectLayers(scene, sceneId) {
  const nodeById = new Map((scene.diagramSpec?.nodes ?? []).map(node => [node.id, node]));
  const stageMarkup = [];
  const overlayMarkup = [];
  const timeline = [];
  for (const [index, effect] of (scene.effects ?? []).entries()) {
    if (!['glow', 'light-leak'].includes(effect.type)) continue;
    const node = nodeById.get(effect.target);
    const position = node && node.shape !== 'line' ? auroraNodePosition(node) : null;
    const color = /^#[0-9a-fA-F]{6}$/.test(effect.color ?? '') ? effect.color : '#ffffff';
    const effectId = `${sceneId}-effect-${index}`;
    if (effect.type === 'glow' && position) {
      stageMarkup.push(`<i id="${effectId}" class="ax-target-glow" data-ax-effect="glow" data-ax-effect-target="${escapeHtml(effect.target)}" style="left:${position.left.toFixed(2)}%;top:${position.top.toFixed(2)}%;--ax-effect-color:${color};--ax-effect-size:${(Math.max(1, Number(effect.radius ?? 84)) * 2).toFixed(1)}px"></i>`);
    }
    if (effect.type === 'light-leak') {
      const origin = Array.isArray(effect.origin) && effect.origin.length === 2
        ? effect.origin
        : position ? [position.left / 100, position.top / 100] : [.5, .5];
      overlayMarkup.push(`<i id="${effectId}" class="ax-error-overlay" data-ax-effect="light-leak" data-ax-effect-target="${escapeHtml(effect.target)}" style="--ax-effect-color:${color};--ax-origin-x:${clamp(Number(origin[0]), 0, 1) * 100}%;--ax-origin-y:${clamp(Number(origin[1]), 0, 1) * 100}%"></i>`);
    }
    timeline.push({
      id: effectId,
      type: effect.type,
      target: effect.target,
      startMs: Number(effect.startMs ?? 0),
      durationMs: Math.max(100, Number(effect.durationMs ?? 600)),
      intensity: clamp(Number(effect.intensity ?? 1), 0, 1),
      position,
    });
  }
  return {stageMarkup: stageMarkup.join(''), overlayMarkup: overlayMarkup.join(''), timeline};
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
  const hyperframesMotion = scene.hyperframesMotion ?? null;
  const fullBleed = hyperframesMotion?.stage === 'full-bleed';
  const sceneEffects = sceneEffectLayers(scene, id);
  const caption = sceneCaptionMarkup(scene, index);
  const preparedImage = scene.imagePath ? await copyPreparedMedia(scene.imagePath, `${id}-image`) : null;
  const image = preparedImage || scene.image?.originalUrl || scene.image?.thumbnailUrl || null;
  let stage = '';
  if (diagram.markup) stage = `${diagram.markup}${sceneEffects.stageMarkup}`;
  else if (image) stage = `<div class="ax-photo-stage ax-smoked-panel"><div class="ax-media"><img src="${escapeHtml(image)}" alt=""/></div></div>`;
  else stage = `<div class="ax-statement"><div class="ax-statement-card ax-smoked-panel"><strong>${escapeHtml(heading)}</strong>${subline ? `<span>${escapeHtml(subline)}</span>` : ''}</div></div>`;

  renderedScenes.push(`<section id="${id}" class="clip ax-scene${fullBleed ? ' ax-scene--full-bleed' : ''}" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="${number}">${ambientMarkup()}${sceneEffects.overlayMarkup}<div class="ax-topline"><span>DLOG / ${escapeHtml(String(scene.kind || 'statement').toUpperCase())}</span><span>${String(number).padStart(2, '0')} / ${String(manifest.scenes.length).padStart(2, '0')}</span></div><div class="ax-heading"><h1>${escapeHtml(heading)}</h1>${subline ? `<p>${escapeHtml(subline)}</p>` : ''}</div><div class="ax-stage"${fullBleed ? ' data-layout-allow-overflow' : ''}><div class="ax-camera"><div class="ax-camera-shake">${stage}</div></div></div>${caption.markup}</section>`);

  const enter = start + .04;
  timelineStatements.push(`tl.from("#${id} .ax-topline", {y:-16, opacity:0, duration:.32, ease:"power2.out"}, ${enter.toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ax-heading", {y:34, opacity:0, duration:.5, ease:"power3.out"}, ${(enter + .06).toFixed(3)});`);
  timelineStatements.push(`tl.from("#${id} .ax-stage", {y:24, opacity:0, scale:.985, duration:.54, ease:"power2.out"}, ${(enter + .18).toFixed(3)});`);
  timelineStatements.push(`tl.fromTo("#${id} .ax-orb--a", {scale:.86, opacity:.1}, {scale:1.08, opacity:.28, duration:${Math.min(1.15, duration / 2).toFixed(2)}, ease:"power1.inOut"}, ${(start + .1).toFixed(3)});`);
  timelineStatements.push(`tl.fromTo("#${id} .ax-orb--b", {scale:.92, opacity:.08}, {scale:1.12, opacity:.22, duration:${Math.min(1.35, duration / 2).toFixed(2)}, ease:"power1.inOut"}, ${(start + .24).toFixed(3)});`);

  // Establish every animated property at its first declared "from" value before
  // the scene starts moving. Without this, future snapshots render at CSS defaults
  // (notably opacity:1) until their own tween begins, which stacks every state.
  const firstStateByProperty = new Map();
  for (const event of [...diagram.timeline].sort((a, b) => a.start - b.start)) {
    const key = `${event.selector}::${event.property}`;
    if (!firstStateByProperty.has(key)) firstStateByProperty.set(key, event);
  }
  for (const event of firstStateByProperty.values()) {
    timelineStatements.push(`tl.set("${event.selector}", ${JSON.stringify({[event.property]: event.from})}, ${start.toFixed(3)});`);
  }

  for (const event of diagram.timeline) {
    const eventStart = start + clamp(event.start, 0, 1) * duration;
    const eventDuration = Math.max(.04, (clamp(event.end, 0, 1) - clamp(event.start, 0, 1)) * duration);
    const from = JSON.stringify({[event.property]: event.from});
    const to = JSON.stringify({[event.property]: event.to, duration: Number(eventDuration.toFixed(3)), ease: 'power2.inOut'});
    timelineStatements.push(`tl.fromTo("${event.selector}", ${from}, ${to}, ${eventStart.toFixed(3)});`);
  }

  for (const cue of hyperframesMotion?.objectMotions ?? []) {
    if (!diagram.focusPoints[cue.target]) continue;
    const cueStart = start + clamp(Number(cue.at ?? 0), 0, 1) * duration;
    const cueDuration = Math.min(Math.max(.1, Number(cue.durationMs ?? 500) / 1000), Math.max(.1, start + duration - cueStart - .02));
    const strength = clamp(Number(cue.strength ?? .7), 0, 1);
    const ease = timelineEaseSource(cue.easing);
    const selector = `#${id}-object-bg-${cue.target},#${id}-object-${cue.target}`;
    if (cue.kind === 'pop') {
      timelineStatements.push(`tl.fromTo("${selector}", {scale:${(1 - .11 * strength).toFixed(3)}, y:${(24 * strength).toFixed(1)}}, {scale:1, y:0, duration:${cueDuration.toFixed(3)}, ease:${ease}}, ${cueStart.toFixed(3)});`);
    } else if (cue.kind === 'grow') {
      const rise = Math.min(cueDuration * .62, cueDuration - .08);
      timelineStatements.push(`tl.fromTo("${selector}", {scale:${(1 - .07 * strength).toFixed(3)}, y:${(16 * strength).toFixed(1)}}, {scale:${(1 + .09 * strength).toFixed(3)}, y:0, duration:${rise.toFixed(3)}, ease:${ease}}, ${cueStart.toFixed(3)});`);
      timelineStatements.push(`tl.to("${selector}", {scale:1, duration:${Math.max(.08, cueDuration - rise).toFixed(3)}, ease:"power2.out"}, ${(cueStart + rise).toFixed(3)});`);
    } else if (cue.kind === 'pulse') {
      const half = Math.max(.06, cueDuration / 2);
      timelineStatements.push(`tl.to("${selector}", {scale:${(1 + .07 * strength).toFixed(3)}, duration:${half.toFixed(3)}, ease:${ease}}, ${cueStart.toFixed(3)});`);
      timelineStatements.push(`tl.to("${selector}", {scale:1, duration:${Math.max(.06, cueDuration - half).toFixed(3)}, ease:"power2.out"}, ${(cueStart + half).toFixed(3)});`);
    } else {
      timelineStatements.push(`tl.fromTo("${selector}", {y:${(18 * strength).toFixed(1)}, rotation:${(-1.4 * strength).toFixed(2)}}, {y:0, rotation:0, duration:${cueDuration.toFixed(3)}, ease:${ease}}, ${cueStart.toFixed(3)});`);
    }
  }

  for (const effect of sceneEffects.timeline) {
    const maxOffset = Math.max(0, duration - .12);
    const offset = clamp(effect.startMs / 1000, 0, maxOffset);
    const effectStart = start + offset;
    const effectDuration = Math.min(effect.durationMs / 1000, Math.max(.12, duration - offset - .02));
    const fadeIn = Math.min(.18, effectDuration * .28);
    const fadeOut = Math.min(.24, effectDuration * .32);
    const peak = effect.type === 'light-leak' ? effect.intensity * .74 : effect.intensity;
    timelineStatements.push(`tl.set("#${effect.id}", {opacity:0, scale:${effect.type === 'light-leak' ? '.94' : '.62'}}, ${effectStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("#${effect.id}", {opacity:${peak.toFixed(3)}, scale:1, duration:${fadeIn.toFixed(3)}, ease:"power2.out"}, ${effectStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("#${effect.id}", {opacity:0, scale:${effect.type === 'light-leak' ? '1.06' : '1.18'}, duration:${fadeOut.toFixed(3)}, ease:"power2.in"}, ${Math.max(effectStart + fadeIn, effectStart + effectDuration - fadeOut).toFixed(3)});`);
  }

  const camera = scene.camera ?? null;
  const cameraTrack = hyperframesMotion?.cameraTrack ?? [];
  const hasCameraTrack = Boolean(diagram.markup && cameraTrack.length);
  const explicitCamera = Boolean(diagram.markup && !hasCameraTrack && camera && camera.motion && camera.motion !== 'static');
  const autoFocusCamera = Boolean(diagram.markup && !hasCameraTrack && !explicitCamera && diagram.pulses.length);
  const errorShakeEnabled = (scene.choreography ?? []).includes('camera-error-shake');
  const errorEffect = sceneEffects.timeline.find(effect => effect.type === 'glow' && effect.position)
    ?? sceneEffects.timeline.find(effect => effect.type === 'light-leak');
  let lastPulseEnd = start;

  if (hasCameraTrack) {
    const stageWidth = fullBleed ? 1080 : 912;
    const stageHeight = 1020;
    for (const keyframe of [...cameraTrack].sort((a, b) => a.at - b.at)) {
      const point = keyframe.target ? diagram.focusPoints[keyframe.target] : null;
      const left = point?.left ?? 50;
      const top = point?.top ?? 50;
      const scale = clamp(Number(keyframe.scale ?? 1), 1, 1.55);
      const x = clamp((50 - left) / 100 * stageWidth * scale * .58 + Number(keyframe.offsetX ?? 0), -240, 240);
      const y = clamp((50 - top) / 100 * stageHeight * scale * .48 + Number(keyframe.offsetY ?? 0), -190, 190);
      const cameraStart = start + clamp(Number(keyframe.at ?? 0), 0, 1) * duration;
      const cameraDuration = Math.min(Math.max(.1, Number(keyframe.durationMs ?? 600) / 1000), Math.max(.1, start + duration - cameraStart - .02));
      const ease = timelineEaseSource(keyframe.easing);
      const origin = `${left.toFixed(1)}% ${top.toFixed(1)}%`;
      timelineStatements.push(`tl.set("#${id} .ax-camera", {transformOrigin:"${origin}"}, ${cameraStart.toFixed(3)});`);
      timelineStatements.push(`tl.to("#${id} .ax-camera", {x:${x.toFixed(1)}, y:${y.toFixed(1)}, scale:${scale.toFixed(3)}, duration:${cameraDuration.toFixed(3)}, ease:${ease}}, ${cameraStart.toFixed(3)});`);
    }
  } else if (explicitCamera) {
    const strength = camera.intensity === 'medium' ? 1 : .55;
    const cameraStart = start + clamp(Number(camera.startProgress ?? 0), 0, 1) * duration;
    const cameraEnd = start + clamp(Number(camera.endProgress ?? 1), 0, 1) * duration;
    const cameraDuration = Math.max(.18, cameraEnd - cameraStart);
    const origin = camera.target === 'endpoint' ? '78% 30%'
      : camera.target === 'inflection' ? '52% 46%'
      : camera.target === 'detail' ? '62% 42%'
      : '50% 50%';
    timelineStatements.push(`tl.set("#${id} .ax-camera", {transformOrigin:"${origin}"}, ${cameraStart.toFixed(3)});`);
    if (camera.motion === 'push-in' || camera.motion === 'zoom') {
      const maxScale = camera.motion === 'zoom' ? 1 + .24 * strength : 1 + .12 * strength;
      timelineStatements.push(`tl.fromTo("#${id} .ax-camera", {x:0, y:0, scale:1}, {x:0, y:0, scale:${maxScale.toFixed(3)}, duration:${cameraDuration.toFixed(3)}, ease:"power2.inOut"}, ${cameraStart.toFixed(3)});`);
    } else if (camera.motion === 'pull-out') {
      const fromScale = 1 + .12 * strength;
      timelineStatements.push(`tl.fromTo("#${id} .ax-camera", {x:0, y:0, scale:${fromScale.toFixed(3)}}, {x:0, y:0, scale:1, duration:${cameraDuration.toFixed(3)}, ease:"power2.inOut"}, ${cameraStart.toFixed(3)});`);
    } else if (camera.motion === 'pan-left' || camera.motion === 'pan-right') {
      const direction = camera.motion === 'pan-left' ? -1 : 1;
      const x = 78 * strength * direction;
      timelineStatements.push(`tl.fromTo("#${id} .ax-camera", {x:0, y:0, scale:1}, {x:${x.toFixed(1)}, y:0, scale:1.025, duration:${cameraDuration.toFixed(3)}, ease:"power2.inOut"}, ${cameraStart.toFixed(3)});`);
    }
  }

  for (const pulse of diagram.pulses) {
    const explicit = Number.isFinite(pulse.startMs) && Number.isFinite(pulse.durationMs);
    const requestedOffset = explicit
      ? clamp(pulse.startMs / 1000, 0, Math.max(0, duration - .12))
      : clamp(pulse.start, 0, 1) * duration;
    const lineReadyOffset = clamp(Number(pulse.lineReady ?? 0), 0, 1) * duration + .12;
    const offset = clamp(Math.max(requestedOffset, lineReadyOffset), 0, Math.max(0, duration - .12));
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
    lastPulseEnd = Math.max(lastPulseEnd, pulseStart + pulseDuration);

    if (autoFocusCamera) {
      const focusLeft = (pulse.fromLeft + pulse.toLeft) / 2;
      const focusTop = (pulse.fromTop + pulse.toTop) / 2;
      const strength = scene.camera?.intensity === 'medium' ? 1 : .72;
      const x = clamp((50 - focusLeft) / 100 * 912 * .44 * strength, -150, 150);
      const y = clamp((50 - focusTop) / 100 * 1020 * .34 * strength, -135, 135);
      const scale = 1 + .075 * strength;
      const focusStart = Math.max(start + .58, pulseStart - .22);
      timelineStatements.push(`tl.to("#${id} .ax-camera", {x:${x.toFixed(1)}, y:${y.toFixed(1)}, scale:${scale.toFixed(3)}, duration:.38, ease:"power2.inOut"}, ${focusStart.toFixed(3)});`);
    }
  }

  if (autoFocusCamera && lastPulseEnd + .5 < start + duration) {
    timelineStatements.push(`tl.to("#${id} .ax-camera", {x:0, y:0, scale:1, duration:.44, ease:"power2.inOut"}, ${(lastPulseEnd + .08).toFixed(3)});`);
  }

  if (errorShakeEnabled && errorEffect) {
    const maxOffset = Math.max(0, duration - .48);
    const shakeOffset = clamp(errorEffect.startMs / 1000, 0, maxOffset);
    const shakeStart = start + shakeOffset;
    const p = errorEffect.position ?? {left: 50, top: 50};
    const focusX = clamp((50 - p.left) * 1.05, -32, 32);
    const focusY = clamp((50 - p.top) * .78, -24, 24);
    const origin = `${p.left.toFixed(1)}% ${p.top.toFixed(1)}%`;
    const shakeSelector = `#${id} .ax-camera-shake`;
    const focusStart = Math.max(start + .2, shakeStart - .22);
    timelineStatements.push(`tl.set("${shakeSelector}", {transformOrigin:"${origin}"}, ${focusStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:${focusX.toFixed(1)}, y:${focusY.toFixed(1)}, scale:1.065, rotation:0, duration:.22, ease:"power2.out"}, ${focusStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:${(focusX - 15).toFixed(1)}, y:${(focusY + 2).toFixed(1)}, rotation:-.75, duration:.065, ease:"power1.inOut"}, ${shakeStart.toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:${(focusX + 13).toFixed(1)}, y:${(focusY - 2).toFixed(1)}, rotation:.62, duration:.07, ease:"power1.inOut"}, ${(shakeStart + .065).toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:${(focusX - 8).toFixed(1)}, y:${(focusY + 1).toFixed(1)}, rotation:-.38, duration:.07, ease:"power1.inOut"}, ${(shakeStart + .135).toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:${(focusX + 4).toFixed(1)}, y:${focusY.toFixed(1)}, rotation:.18, duration:.065, ease:"power1.inOut"}, ${(shakeStart + .205).toFixed(3)});`);
    timelineStatements.push(`tl.to("${shakeSelector}", {x:0, y:0, scale:1, rotation:0, duration:.34, ease:"power3.out"}, ${(shakeStart + .3).toFixed(3)});`);
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
const timelineSource = `function springEase({response=.5,dampingFraction=1}={}) {
  const w=(2*Math.PI)/response;
  const z=dampingFraction;
  let pos;
  if(z<1){
    const wd=w*Math.sqrt(1-z*z);
    pos=t=>1-Math.exp(-z*w*t)*(Math.cos(wd*t)+((z*w)/wd)*Math.sin(wd*t));
  }else if(z>1){
    const wo=w*Math.sqrt(z*z-1);
    pos=t=>1-Math.exp(-z*w*t)*(Math.cosh(wo*t)+((z*w)/wo)*Math.sinh(wo*t));
  }else{
    pos=t=>1-Math.exp(-w*t)*(1+w*t);
  }
  const eps=.001;
  const rate=z<=1?z*w:(z-Math.sqrt(z*z-1))*w;
  const scan=12/rate;
  const steps=2400;
  let settle=scan;
  for(let i=steps;i>=0;i--){
    const t=i/steps*scan;
    if(Math.abs(1-pos(t))>eps){settle=(i+1)/steps*scan;break;}
  }
  const end=pos(settle);
  return p=>pos(p*settle)+p*(1-end);
}
function springPreset(name){
  if(name==="spring-snappy") return springEase({response:.36,dampingFraction:.84});
  if(name==="spring-bouncy") return springEase({response:.42,dampingFraction:.70});
  return springEase({response:.48,dampingFraction:1});
}
window.populateAuroraTimeline = function populateAuroraTimeline(tl) {\n  ${timelineStatements.join('\n  ')}\n};\n`;
const html = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1"/>\n<title>${escapeHtml(candidate.candidate?.title || prefix)}</title>\n<link rel="stylesheet" href="tokens.css"/>\n<link rel="stylesheet" href="theme.css"/>\n</head>\n<body>\n<div id="aurora-explain" class="ax-theme" data-composition-id="aurora-explain" data-start="0" data-duration="${totalDuration.toFixed(3)}" data-track-index="0" data-width="1080" data-height="1920">\n${renderedScenes.join('\n')}\n${audioTracks.join('\n')}\n</div>\n<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>\n<script src="timeline.js"></script>\n<script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});window.populateAuroraTimeline(tl);window.__timelines["aurora-explain"]=tl;</script>\n</body>\n</html>\n`;

await Promise.all([
  fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8'),
  fs.writeFile(path.join(outputDir, 'timeline.js'), timelineSource, 'utf8'),
  fs.writeFile(path.join(outputDir, 'timings.json'), `${JSON.stringify({prefix, manifest: manifestArg, totalDurationSeconds: totalDuration, scenes: timings}, null, 2)}\n`, 'utf8'),
  fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
]);
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `project_dir=${path.relative(repoRoot, outputDir)}\nprefix=${prefix}\ntotal_duration=${totalDuration.toFixed(3)}\n`);
console.log(`Built Aurora HyperFrames project ${path.relative(repoRoot, outputDir)} (${manifest.scenes.length} scenes, ${totalDuration.toFixed(2)}s).`);
