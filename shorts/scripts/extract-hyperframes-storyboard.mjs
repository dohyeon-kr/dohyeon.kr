import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const [projectArg, videoArg] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const scaleArg = process.argv.slice(2).find(arg => arg.startsWith('--scale='))?.slice('--scale='.length) ?? '0.4';
if (!projectArg || !videoArg) throw new Error('Usage: node shorts/scripts/extract-hyperframes-storyboard.mjs <project-dir> <video.mp4> [--scale=0.4]');

const projectDir = path.resolve(repoRoot, projectArg);
const video = path.resolve(repoRoot, videoArg);
const tmpRoot = path.join(repoRoot, 'shorts', '.tmp') + path.sep;
if (!projectDir.startsWith(tmpRoot)) throw new Error('HyperFrames project must live under shorts/.tmp/.');
const scale = Number(scaleArg);
if (!Number.isFinite(scale) || scale < 0.2 || scale > 1) throw new Error(`Invalid storyboard scale: ${scaleArg}`);

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {stdio: 'inherit'});
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
});

const timings = JSON.parse(await fs.readFile(path.join(projectDir, 'timings.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(projectDir, 'manifest.json'), 'utf8'));
const outputDir = path.join(repoRoot, 'shorts', 'out', 'storyboards', timings.prefix);
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});
const width = Math.round(1080 * scale / 2) * 2;
const height = Math.round(1920 * scale / 2) * 2;
const markdown = [
  `# Storyboard — ${manifest.candidate?.title ?? timings.prefix}`,
  '',
  `Source: ${manifest.source?.url ?? ''}`,
  '',
  `Renderer: HyperFrames / monoliquid-v2 · snapshot scale ${scale}`,
  '',
];

for (const scene of timings.scenes) {
  const stem = `${timings.prefix}-scene-${String(scene.index).padStart(2, '0')}`;
  const filename = `${stem}.png`;
  await run('ffmpeg', [
    '-y', '-ss', scene.snapshotSeconds.toFixed(3), '-i', video,
    '-frames:v', '1', '-vf', `scale=${width}:${height}:flags=lanczos`,
    path.join(outputDir, filename),
  ]);
  const source = manifest.scenes?.[scene.index - 1] ?? {};
  markdown.push(
    `## Scene ${scene.index}`,
    '',
    `![Scene ${scene.index}](${filename})`,
    '',
    `- Headline: ${String(source.headline ?? '').replace(/\n/g, ' / ')}`,
    `- Narration: ${source.narration || '(none)'}`,
    '',
  );
}

await fs.writeFile(path.join(outputDir, `${timings.prefix}-STORYBOARD.md`), `${markdown.join('\n')}\n`, 'utf8');
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `storyboard_dir=${path.relative(repoRoot, outputDir)}\n`);
console.log(`Extracted ${timings.scenes.length} HyperFrames storyboard snapshots to ${path.relative(repoRoot, outputDir)}.`);
