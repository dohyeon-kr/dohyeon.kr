import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {describeCandidate} from './describe-candidates.mjs';

const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'content/video-background-preview');
await fs.mkdir(directory);
const video = {assetId: 'teluk-prancis-waves', startSeconds: 1, endSeconds: 3, playbackRate: 1, endBehavior: 'loop', cropX: .5, cropY: .5, overlayOpacity: .4};
const scene = (headline, backgroundVideo, transition) => ({
  kind: 'statement', layout: 'statement-offset', headline, narration: headline.replaceAll('\n', ' '), subline: null,
  comparisonLeft: null, comparisonRight: null, image: null, imageQuery: null,
  visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
  camera: {motion: 'static', target: 'center', intensity: 'subtle', startProgress: 0, endProgress: 1},
  backgroundVideo, transition, effects: [],
  visualIntent: {concept: '파도를 보며 잠시 쉬는 장면', relation: {type: 'literal', description: '자연의 움직임과 휴식'}, strategy: {type: 'minimal', metaphor: null, rationale: '재생 검증용 예제. 같은 파도 소스를 의도적으로 이어 사용해 반복과 전환 경계를 비교한다.'}},
});
const manifest = {
  schemaVersion: 3, id: 'candidate-01', status: 'candidate',
  source: {url: 'https://dohyeon.kr', title: 'DLOG'},
  candidate: {title: '영상 배경 재생 검증', hook: '잠깐, 쉬어가도 괜찮다.', rationale: '제품 재생 검증용 창작 문구. 블로그 원문 후보가 아님.', hashtags: []},
  style: {theme: 'monochrome-editorial-dark'},
  scenes: [scene('잠깐, 쉬어가도\n괜찮다.', video, 'none'), scene('생각에도\n여백이 필요하다.', {...video, startSeconds: 3, endSeconds: 8, playbackRate: 1.2, endBehavior: 'error'}, 'cross-dissolve')],
};
const filename = path.join(directory, 'candidate-01.json');
await fs.writeFile(filename, JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(directory, 'candidate-01.md'), describeCandidate(manifest, 'candidate-01.json'));
const run = (command, args, cwd = root) => execFileSync(command, args, {cwd, stdio: 'inherit', env: process.env});
try {
  run(process.execPath, ['scripts/render.mjs', filename, '--storyboard']);
  // The storyboard uses the same prepared clip and exact scene duration as this full-resolution render.
  const output = path.join(root, 'out/video-background');
  await fs.mkdir(output, {recursive: true});
  const props = path.join(root, '.tmp/video-background-preview-candidate-01.json');
  run('npx', ['remotion', 'render', 'src/index.tsx', 'ShortVideo', `${output}/preview.mp4`, `--props=${props}`, '--public-dir=public', '--concurrency=2']);
  const frames = [0, 8, 30, 59, 60, 61, 90, 116, 117, 123, 130, 175, 233];
  for (const frame of frames) run('npx', ['remotion', 'still', 'src/index.tsx', 'ShortVideo', `${output}/frame-${frame}.png`, `--props=${props}`, '--public-dir=public', `--frame=${frame}`]);
  for (const frame of [60, 130]) run('npx', ['remotion', 'still', 'src/index.tsx', 'DarkMotionEffectsPreview', `${output}/dark-${frame}.png`, `--props=${props}`, '--public-dir=public', `--frame=${frame}`]);
  await fs.copyFile(path.join(directory, 'candidate-01.md'), `${output}/STORYBOARD.md`);
  await fs.copyFile(path.join(root, 'out/video-background-preview-candidate-01-VIDEO.md'), `${output}/VIDEO.md`);
  await fs.writeFile(`${output}/samples.json`, JSON.stringify({frames, fps: 30, durationFrames: 234, checks: 'loop at 60, transition at 117, 1.2x rate in second scene, muted source'}, null, 2));
} finally {
  await fs.rm(filename, {force: true});
  await fs.rm(path.join(directory, 'candidate-01.md'), {force: true});
  await fs.rmdir(directory).catch(() => {});
}
