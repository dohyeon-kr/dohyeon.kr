import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {motionGalleryProps, flowDiagram, light} from '../src/motion-preview.ts';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'out/motion-effects');
await fs.mkdir(output, {recursive: true});
await fs.mkdir(path.join(root, 'public/fonts'), {recursive: true});
for (const font of ['Pretendard-Bold.woff', 'Pretendard-Regular.woff']) await fs.copyFile(path.join(root, '../scripts/thumbnail-fonts', font), path.join(root, 'public/fonts', font));
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.CHROME_EXECUTABLE || undefined});
const common = {serveUrl, puppeteerInstance: browser, logLevel: 'error'};
try {
  const gallery = await selectComposition({...common, id: 'MotionEffectsGallery'});
  let cursor = 0;
  const samples = [];
  for (const [i, scene] of motionGalleryProps.scenes.entries()) {
    const name = i < 20 ? scene.transition : scene.effects[0].type;
    // Different source/target states make crossfades and masks visible in the gallery.
    for (const frame of i < 20 ? [5, 11, 17, 22] : [22, 37, 49]) {
      const filename = `${String(i + 1).padStart(2, '0')}-${name}-${frame}.png`;
      await renderStill({...common, composition: gallery, frame: cursor + frame, scale: .5, output: path.join(output, filename)});
      samples.push({name, frame: cursor + frame, filename});
    }
    cursor += Math.max(66, Math.ceil((scene.audioDurationSeconds + .28) * 30));
    console.log(`Verified render ${i + 1}/31: ${name}`);
  }
  const preview = await selectComposition({...common, id: 'MotionEffectsPreview'});
  for (const frame of [0, 21, 35, 48, 64, 75, 95, 104, 105, 108, 111, 114, 117]) {
    await renderStill({...common, composition: preview, frame, output: path.join(output, `full-${frame}.png`)});
  }
  const dark = await selectComposition({...common, id: 'DarkMotionEffectsPreview'});
  for (const frame of [48, 108, 111, 114]) await renderStill({...common, composition: dark, frame, output: path.join(output, `dark-${frame}.png`)});
  const flow = await selectComposition({...common, id: 'FlowGlowPreview'});
  // Both engines and a forced fallback must use the same pulse/halo layer.
  for (const renderer of ['remotion', 'motion-canvas']) {
    await renderStill({...common, composition: flow, frame: 36, inputProps: {spec: {...flowDiagram, renderer}, durationInFrames: 120, effects: [light('flow-glow', 'connection', {intensity: 1, radius: 36})], strict: true}, output: path.join(output, `engine-${renderer}.png`)});
  }
  await renderStill({...common, composition: flow, frame: 36, inputProps: {spec: flowDiagram, durationInFrames: 120, effects: [light('flow-glow', 'connection', {intensity: 1})], failEngine: 'remotion'}, output: path.join(output, 'engine-fallback.png')});
  await fs.writeFile(path.join(output, 'samples.json'), JSON.stringify(samples, null, 2));
  console.log('Rendering 1080×1920 motion preview');
  await renderMedia({...common, composition: preview, codec: 'h264', crf: 20, concurrency: 2, outputLocation: path.join(output, 'motion-effects-preview.mp4')});
  console.log(`Complete: ${output}`);
} finally {
  await browser.close({silent: true});
}
