// Offline visual integration fixture: no source fetch, TTS or publication.
import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {templatePreviewProps, previewSceneFrames} from '../src/template-preview.ts';
import {withBlogCta} from './blog-cta.mjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'out/notebook-check');
await fs.mkdir(output, {recursive: true});
await fs.mkdir(path.join(root, 'public/fonts'), {recursive: true});
await fs.mkdir(path.join(root, 'public/generated/notebook-check'), {recursive: true});
for (const name of ['Pretendard-Bold.woff', 'Pretendard-Regular.woff']) await fs.copyFile(path.join(root, '../scripts/thumbnail-fonts', name), path.join(root, 'public/fonts', name));
await fs.copyFile(path.join(root, '../themes/monoliquid/assets/images/generated-thumbnails/about-seamless-works.png'), path.join(root, 'public/generated/notebook-check/photo.png'));
const props = structuredClone(templatePreviewProps);
props.style = {...props.style, template: 'notebook-grid', theme: 'notebook-grid'};
props.presenterOverlay = {position: 'bottom-right', hideOnCommonCta: true, lipSync: 'none', nod: 'none'};
props.scenes = props.scenes.map(scene => ({...scene, audioDurationSeconds: 2.2}));
props.scenes.splice(1, 0,
  {...props.scenes[0], kind: 'photo', headline: '사진도 노트 위에', imagePath: 'generated/notebook-check/photo.png', visual: {type: 'photo', motif: null, query: null, value: null, xLabel: null, yLabel: null}},
  {...props.scenes[0], kind: 'compare', headline: '기준에 따라 비교합니다', comparisonLeft: '빠른 실행', comparisonRight: '정확한 판단'},
);
const inputProps = withBlogCta(props);
await fs.writeFile(path.join(output, 'props.json'), JSON.stringify(inputProps, null, 2));
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public')});
const browserExecutable = process.env.SHORTS_BROWSER_EXECUTABLE || undefined;
const composition = await selectComposition({serveUrl, id: 'ShortVideo', inputProps, browserExecutable});
let start = 0;
for (const [index, scene] of inputProps.scenes.entries()) {
  const frames = previewSceneFrames(scene);
  for (const local of [5, 22, Math.floor(frames * .55), frames - 2]) {
    await renderStill({serveUrl, composition, inputProps, browserExecutable, frame: start + local, scale: .5,
      output: path.join(output, `scene-${index + 1}-frame-${local}.png`)});
  }
  start += frames;
}
if (process.argv.includes('--video')) await renderMedia({serveUrl, composition, inputProps, browserExecutable, scale: .5,
  codec: 'h264', concurrency: 2, outputLocation: path.join(output, 'notebook-grid-silent.mp4')});
console.log(`Notebook render verification: ${inputProps.scenes.length * 4} frames in ${output}`);
