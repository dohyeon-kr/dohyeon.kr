// A single portrait definition keeps index.html small. CSS variables inherited
// by <use> give every scene its own seekable mouth state without copying paths.
const shapes = ['rest', 'O', 'I', 'A', 'M'];
export function presenterDefinitions(svg) {
  const match = String(svg).trim().match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  if (!match) throw new Error('Invalid HyperFrames presenter SVG');
  const art = match[1].replace(/>\s+</g, '><').trim();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;overflow:hidden" data-layout-ignore aria-hidden="true"><defs><symbol id="ml-presenter-art" viewBox="0 0 1254 1254">${art}</symbol></defs></svg>`;
}

export function presenterMarkup() {
  return '<div class="ml-presenter-overlay" style="background-image:none" data-layout-ignore aria-hidden="true"><svg viewBox="0 0 1254 1254" width="100%" height="100%" style="display:block"><use href="#ml-presenter-art" /></svg></div>';
}

function mouthState(shape, intensity = .7) {
  return {...Object.fromEntries(shapes.map(name => [`--ml-mouth-${name.toLowerCase()}`, Number(name === shape)])), '--ml-mouth-open': intensity, immediateRender:false};
}

export function presenterTimeline({scene, options, id, start, duration}) {
  if (!options || options.lipSync !== 'word-timestamps' || scene.commonPage) return [];
  if (!/^scene-\d+$/.test(id) || !Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Invalid HyperFrames presenter scene timing');
  }
  // render.mjs writes persistent speech tracks here, not in scene.presenter.
  const mouths = scene.overlayPresenter?.mouths;
  if (!Array.isArray(mouths) || !mouths.length) {
    if (scene.audioPath && scene.narration?.trim()) {
      throw new Error(`${id}: presenter mouth tracks missing; prepare final-audio word alignment before rendering`);
    }
    return []; // Unpaid/silent preview: no invented syllables or speaking loop.
  }
  const events = new Map([[0, mouthState('rest')]]);
  let previousEnd = 0;
  for (const [index, cue] of mouths.entries()) {
    if (!cue || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 ||
        cue.start < previousEnd - 1e-8 || cue.end <= cue.start || cue.end > duration + 1e-8 ||
        !shapes.includes(cue.shape) || (cue.intensity != null && (!Number.isFinite(cue.intensity) || cue.intensity < 0 || cue.intensity > 1))) {
      throw new Error(`${id}: invalid presenter mouth cue ${index}`);
    }
    previousEnd = cue.end;
    events.set(cue.start, mouthState(cue.shape, cue.intensity ?? .7));
    // A following cue at the same boundary replaces this rest event. Otherwise
    // pauses and the visual tail keep the mouth closed, including on random seek.
    events.set(cue.end, mouthState('rest'));
  }
  events.set(duration, mouthState('rest'));
  const target = JSON.stringify(`#${id} .ml-presenter-overlay`);
  return [...events].sort(([a], [b]) => a - b).map(([time, state]) =>
    `tl.set(${target}, ${JSON.stringify(state)}, ${Number((start + time).toFixed(6))});`);
}
