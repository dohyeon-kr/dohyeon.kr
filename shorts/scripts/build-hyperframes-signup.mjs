import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {resolveSignupModel} from './signup-continuous-model.mjs';
import {buildSignupComposition} from '../hyperframes/signup-phone-number-input-v2/build.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.join(repoRoot, 'shorts');
const argv = process.argv.slice(2);
const candidateArg = argv.find(a => !a.startsWith('--'));
const option = name => argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const inside = (file, root) => file.startsWith(path.resolve(root) + path.sep);
const candidatePath = path.resolve(repoRoot, candidateArg);
if (!inside(candidatePath, path.join(shortsRoot, 'content'))) throw new Error('Candidate must live under shorts/content/.');
const candidate = JSON.parse(await fs.readFile(candidatePath, 'utf8'));
const preparedPath = option('prepared') ? path.resolve(repoRoot, option('prepared')) : null;
if (preparedPath && !inside(preparedPath, path.join(shortsRoot, '.tmp'))) throw new Error('Prepared manifest must live under shorts/.tmp/.');
const model = resolveSignupModel(candidate, preparedPath ? JSON.parse(await fs.readFile(preparedPath, 'utf8')) : null);
const safe = s => s.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-');
const prefix = `${safe(path.basename(path.dirname(candidatePath)))}-${safe(candidate.id)}`;
const outputDir = path.resolve(repoRoot, option('output') ?? `shorts/.tmp/hyperframes/${prefix}`);
if (!inside(outputDir, path.join(shortsRoot, '.tmp'))) throw new Error('Output must live under shorts/.tmp/.');
await fs.mkdir(path.join(outputDir, 'assets'), {recursive: true});
const themeRoot = path.join(shortsRoot, 'hyperframes/signup-phone-number-input-v2');
await fs.copyFile(path.join(themeRoot, 'style.css'), path.join(outputDir, 'style.css'));
await fs.copyFile(path.join(themeRoot, 'DESIGN.md'), path.join(outputDir, 'DESIGN.md'));
await fs.copyFile(path.join(repoRoot, 'themes/monoliquid/assets/fonts/pretendard-variable.woff2'), path.join(outputDir, 'assets/pretendard-variable.woff2'));
let gsapScript = 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js';
try {
  const require = createRequire(path.join(themeRoot, 'build.mjs'));
  await fs.copyFile(require.resolve('gsap/dist/gsap.min.js'), path.join(outputDir, 'assets/gsap.min.js'));
  gsapScript = 'assets/gsap.min.js';
} catch (error) {if (error.code !== 'MODULE_NOT_FOUND') throw error;}

const starts = [0, model.bodyEnd];
const audioTracks = [];
for (const [i, scene] of model.manifest.scenes.entries()) {
  if (!scene.audioPath) continue;
  const input = path.resolve(shortsRoot, 'public', scene.audioPath);
  if (!inside(input, path.join(shortsRoot, 'public'))) throw new Error('Prepared audio escaped shorts/public/.');
  const seconds = Number(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',input], {encoding:'utf8'}));
  if (!Number.isFinite(seconds) || Math.abs(seconds - scene.audioDurationSeconds) > .08 || scene.beatTimings.at(-1).endSeconds > seconds + .08) throw new Error('Prepared audio bytes do not match timing bounds.');
  const name = `audio-${i}${path.extname(input)}`;
  await fs.copyFile(input, path.join(outputDir, 'assets', name));
  audioTracks.push(`<audio id="audio-${i}" src="assets/${name}" data-start="${starts[i]}" data-duration="${seconds}" data-track-index="${i+3}" data-volume="1"></audio>`);
}
await buildSignupComposition({model, outputDir, gsapScript, audioTracks: audioTracks.join('\n')});
const timings = {prefix, manifest: candidateArg, totalDurationSeconds: model.duration, scenes: model.manifest.scenes.map((_, i) => ({index:i+1,id:`scene-0${i+1}`,startSeconds:starts[i],durationSeconds:i===0?model.bodyEnd:model.duration-model.bodyEnd,snapshotSeconds:starts[i]+(i===0?model.bodyEnd:model.duration-model.bodyEnd)*.72}))};
await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(model.manifest, null, 2)+'\n');
await fs.writeFile(path.join(outputDir, 'timings.json'), JSON.stringify(timings, null, 2)+'\n');
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `project_dir=${path.relative(repoRoot,outputDir)}\nprefix=${prefix}\ntotal_duration=${model.duration.toFixed(3)}\n`);
console.log(`Built signup v2 via shared HyperFrames entry: ${path.relative(repoRoot,outputDir)} (${model.duration.toFixed(3)}s; ${model.timingSource}).`);
