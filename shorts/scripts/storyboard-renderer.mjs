import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill} from '@remotion/renderer';

// One bundle/browser per candidate, reused for every sampled scene frame.
export async function createStoryboardRenderer(inputProps, scale) {
  const root = path.resolve(import.meta.dirname, '..');
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public')});
  const browser = await openBrowser('chrome');
  const common = {serveUrl, inputProps, puppeteerInstance: browser};
  try {
    const composition = await selectComposition({...common, id: 'ShortVideo'});
    return {
      render: (output, frame) => renderStill({...common, composition, output, frame, imageFormat: 'png', scale}),
      close: () => browser.close({silent: true}),
    };
  } catch (error) {await browser.close({silent: true}); throw error;}
}
export function previewScale(value = process.env.SHORTS_PREVIEW_SCALE || '0.5') {
  const scale = Number(value);
  if (![0.25, 0.5, 1].includes(scale)) throw new Error('SHORTS_PREVIEW_SCALE must be 0.25, 0.5 or 1');
  return scale;
}
