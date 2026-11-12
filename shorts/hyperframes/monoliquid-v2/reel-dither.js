/* Deterministic screen-space Bayer dithering for photos and semantic objects.
 * The renderer calls renderReelDither(t) from HyperFrames' seekable GSAP
 * timeline. It never animates a pre-dithered PNG or uses random flicker.
 */
(() => {
  'use strict';
  const BAYER = [
    [0,48,12,60,3,51,15,63],
    [32,16,44,28,35,19,47,31],
    [8,56,4,52,11,59,7,55],
    [40,24,36,20,43,27,39,23],
    [2,50,14,62,1,49,13,61],
    [34,18,46,30,33,17,45,29],
    [10,58,6,54,9,57,5,53],
    [42,26,38,22,41,25,37,21],
  ];
  const STEP = 15;
  const clamp = value => Math.max(0, Math.min(1, value));
  const frameState = new WeakMap();

  function photoPixels(state, image, cols, rows) {
    if (state.image === image && state.cols === cols && state.rows === rows && state.pixels) {
      return state.pixels;
    }
    const source = document.createElement('canvas');
    source.width = cols;
    source.height = rows;
    const context = source.getContext('2d', {willReadFrequently: true});
    const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (cols - width) / 2, (rows - height) / 2, width, height);
    const pixels = context.getImageData(0, 0, cols, rows).data;
    Object.assign(state, {image, cols, rows, pixels});
    return pixels;
  }

  function objectLuminance(x, y, time, motif) {
    const r = Math.sqrt(x*x + y*y);
    const angle = Math.atan2(y, x);
    const ring = /ring|torus/.test(motif);
    const blob = /blob/.test(motif);
    const radius = blob ? .76 + .07 * Math.sin(4*angle + time*.25) + .035 * Math.sin(7*angle) : .78;
    if (ring ? Math.abs(r - .57) > .18 : r > radius) return 0;
    const nx = x / radius;
    const ny = y / radius;
    const nz = Math.sqrt(Math.max(0, 1 - nx*nx - ny*ny));
    const lightX = Math.sin(time * .42) * .62;
    const lightY = -.44 + .18 * Math.cos(time * .31);
    const lightZ = .65;
    const diffuse = clamp(nx*lightX + ny*lightY + nz*lightZ);
    const profile = ring ? clamp((.18 - Math.abs(r - .57)) * 4.8) : 1;
    return clamp((.08 + .93 * diffuse) * profile);
  }

  function draw(canvas, absoluteTime) {
    const scene = canvas.closest('[data-start][data-duration]');
    if (!scene) return;
    const sceneStart = Number(scene.dataset.start);
    const sceneDuration = Number(scene.dataset.duration);
    if (absoluteTime < sceneStart || absoluteTime >= sceneStart + sceneDuration) return;
    const time = Math.max(0, absoluteTime - sceneStart);
    const width = Math.round(canvas.clientWidth);
    const height = Math.round(canvas.clientHeight);
    if (width < 1 || height < 1) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const mode = canvas.dataset.ditherKind;
    const state = frameState.get(canvas) || {};
    frameState.set(canvas, state);
    const image = mode === 'photo' ? canvas.parentElement.querySelector('img.ml-dither-source') : null;
    if (image && (!image.complete || !image.naturalWidth)) return;

    const cols = Math.ceil(width / STEP);
    const rows = Math.ceil(height / STEP);
    const pixels = image ? photoPixels(state, image, cols, rows) : null;
    const context = canvas.getContext('2d', {alpha: false});
    context.fillStyle = '#090a0b';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#f4f4f3';
    const motif = String(canvas.dataset.ditherMotif || 'sphere');

    // Light is a deterministic moving gradient over continuous-tone content.
    // Bayer thresholds are anchored to the FINAL screen grid, not the image.
    const beamX = .5 + .24 * Math.sin(time * .42);
    const beamY = .48 + .14 * Math.cos(time * .28);
    const scale = Math.min(cols, rows) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let luminance;
        if (pixels) {
          const offset = (row * cols + col) * 4;
          const base = (.2126 * pixels[offset] + .7152 * pixels[offset+1] + .0722 * pixels[offset+2]) / 255;
          const dx = col / cols - beamX;
          const dy = row / rows - beamY;
          const spot = Math.exp(-(dx*dx + dy*dy) / .16);
          const edge = clamp(Math.min(col / cols, row / rows, 1-col/cols, 1-row/rows) * 8);
          luminance = clamp((base - .06) * (1.04 + .52 * spot)) * edge;
        } else {
          const x = (col - cols/2) / scale;
          const y = (row - rows/2) / scale;
          luminance = objectLuminance(x, y, time, motif);
        }
        const threshold = (BAYER[row & 7][col & 7] + .5) / 64;
        if (luminance >= threshold) {
          const dot = STEP * .55;
          context.fillRect(col * STEP + (STEP-dot)/2, row * STEP + (STEP-dot)/2, dot, dot);
        }
      }
    }
    state.lastTime = absoluteTime;
  }

  window.renderReelDither = function renderReelDither(timeSeconds) {
    if (!Number.isFinite(timeSeconds)) throw new Error('Dither render time must be finite.');
    for (const canvas of document.querySelectorAll('.ml-dither-canvas')) draw(canvas, timeSeconds);
  };
  window.addEventListener('load', () => {
    const timeline = window.__timelines?.['monoliquid-v2'];
    window.renderReelDither(timeline?.time() ?? 0);
  });
  for (const image of document.querySelectorAll('img.ml-dither-source')) {
    image.addEventListener('load', () => {
      const timeline = window.__timelines?.['monoliquid-v2'];
      window.renderReelDither(timeline?.time() ?? 0);
    });
  }
})();
