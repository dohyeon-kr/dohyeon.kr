import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';
import {mkdir, readFile, cp} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateFeaturePlan} from './feature-image-plan.mjs';

const root = path.resolve(import.meta.dirname, '..');
let bundlePromise;
export async function renderFeatureImage(plan, output) {
  validateFeaturePlan(plan);
  await mkdir(path.join(root, 'public/fonts'), {recursive: true});
  await cp(path.join(root, '../scripts/thumbnail-fonts/Pretendard-Bold.woff'), path.join(root, 'public/fonts/Pretendard-Bold.woff'));
  bundlePromise ??= bundle({entryPoint: path.join(root, 'src/FeatureImage.tsx'), publicDir: path.join(root, 'public')});
  const serveUrl = await bundlePromise;
  const options = {serveUrl, inputProps: {plan}, browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || undefined};
  const composition = await selectComposition({...options, id: 'FeatureImage'});
  await mkdir(path.dirname(output), {recursive: true});
  await renderStill({...options, composition, output, frame: 0, imageFormat: 'png'});
  return output;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node render-feature-image.mjs plan.json output.png');
  await renderFeatureImage(JSON.parse(await readFile(input, 'utf8')), path.resolve(output));
}
