import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const script = await fs.readFile(new URL('../hyperframes/monoliquid-v2/reel-dither.js', import.meta.url), 'utf8');

function makeRuntime(kind) {
  const drawings = [];
  const ctx = {
    fillStyle: '#090a0b',
    fillRect: (x, y, width, height) => {
      if (ctx.fillStyle === '#f4f4f3') drawings.push([x, y, width, height]);
    },
  };
  const image = {
    complete: true, naturalWidth: 320, naturalHeight: 240,
  };
  const scene = {dataset: {start:'0', duration:'12'}};
  const canvas = {
    width:0, height:0, clientWidth:360, clientHeight:300,
    dataset: {ditherKind:kind, ditherMotif:'sphere'},
    closest: () => scene,
    getContext: () => ctx,
    parentElement: {querySelector: () => image},
  };
  const doc = {
    querySelectorAll: selector =>
      selector === '.ml-dither-canvas' ? [canvas] : selector === 'img.ml-dither-source' && kind === 'photo' ? [image] : [],
    createElement: () => ({
      width:0, height:0,
      getContext: () => ({
        drawImage: () => {},
        getImageData: (_x, _y, width, height) => {
          const data = new Uint8ClampedArray(width*height*4);
          for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
            const offset=(y*width+x)*4;
            const luminance=Math.round(255 * x / Math.max(1,width-1));
            data[offset]=luminance;
            data[offset+1]=luminance;
            data[offset+2]=luminance;
            data[offset+3]=255;
          }
          return {data};
        },
      }),
    }),
  };
  const win = {addEventListener: () => {}, __timelines:{}};
  if (kind === 'photo') image.addEventListener=() => {};
  vm.runInNewContext(script, {window:win, document:doc, Uint8ClampedArray, Math, WeakMap, Number, String});
  const render = t => {
    drawings.length=0;
    win.renderReelDither(t);
    return JSON.stringify(drawings);
  };
  return {render};
}

for (const kind of ['photo','object']) {
  test(`${kind} Bayer dots are deterministic and respond to changed lighting`, () => {
    const {render} = makeRuntime(kind);
    const first=render(0);
    const later=render(4);
    const again=render(0);
    assert.equal(first, again, 'same seek time must reproduce the exact dot pattern');
    assert.notEqual(first, later, 'light movement must re-quantize the pattern');
    assert.notEqual(first, '[]', 'the graphic should have visible dots');
  });
}
