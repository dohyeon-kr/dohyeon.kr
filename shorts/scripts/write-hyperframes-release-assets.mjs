import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const [candidateArg, projectArg, outputArg = 'shorts/out'] = process.argv.slice(2);
if (!candidateArg || !projectArg) {
  throw new Error('Usage: node shorts/scripts/write-hyperframes-release-assets.mjs <candidate.json> <project-dir> [output-dir]');
}

const candidatePath = path.resolve(repoRoot, candidateArg);
const projectDir = path.resolve(repoRoot, projectArg);
const outputDir = path.resolve(repoRoot, outputArg);
const shortsRoot = path.join(repoRoot, 'shorts') + path.sep;
if (!candidatePath.startsWith(path.join(repoRoot, 'shorts', 'content') + path.sep)) throw new Error('Candidate must live under shorts/content/.');
if (!projectDir.startsWith(path.join(repoRoot, 'shorts', '.tmp') + path.sep)) throw new Error('Project must live under shorts/.tmp/.');
if (!outputDir.startsWith(shortsRoot)) throw new Error('Output must live under shorts/.');

const [candidate, manifest, timings] = await Promise.all([
  fs.readFile(candidatePath, 'utf8').then(JSON.parse),
  fs.readFile(path.join(projectDir, 'manifest.json'), 'utf8').then(JSON.parse),
  fs.readFile(path.join(projectDir, 'timings.json'), 'utf8').then(JSON.parse),
]);
await fs.mkdir(outputDir, {recursive: true});
const prefix = timings.prefix;

const srtTime = seconds => {
  const millis = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const ms = millis % 1000;
  const totalSeconds = Math.floor(millis / 1000);
  const sec = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const min = totalMinutes % 60;
  const hour = Math.floor(totalMinutes / 60);
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

const srt = [];
let cueNumber = 1;
for (const [index, scene] of manifest.scenes.entries()) {
  const sceneTiming = timings.scenes[index];
  if (!sceneTiming) continue;
  for (const cue of scene.captions ?? []) {
    const text = String(cue.text ?? '').trim();
    if (!text) continue;
    const start = sceneTiming.startSeconds + Math.max(0, Number(cue.startSeconds) || 0);
    const end = sceneTiming.startSeconds + Math.min(sceneTiming.durationSeconds, Math.max(Number(cue.endSeconds) || 0, Number(cue.startSeconds) || 0));
    if (end <= start) continue;
    srt.push(`${cueNumber++}\n${srtTime(start)} --> ${srtTime(end)}\n${text}\n`);
  }
}
await fs.writeFile(path.join(outputDir, `${prefix}.srt`), `${srt.join('\n')}\n`, 'utf8');

const hashtags = Array.isArray(candidate.candidate?.hashtags) ? candidate.candidate.hashtags.join(' ') : '';
const reelsBody = [
  candidate.candidate?.suggestedCaption?.trim() || candidate.candidate?.title || '',
  '',
  hashtags,
  '',
  `원문: ${candidate.source?.url ?? ''}`,
].join('\n').trim() + '\n';
await fs.writeFile(path.join(outputDir, `${prefix}-REELS.txt`), reelsBody, 'utf8');

const narrationScript = manifest.scenes
  .map((scene, index) => `${index + 1}. ${String(scene.narration ?? '').trim()}`)
  .join('\n\n') + '\n';
await fs.writeFile(path.join(outputDir, `${prefix}-SCRIPT.txt`), narrationScript, 'utf8');

const media = [
  `# Media sources — ${candidate.candidate?.title ?? prefix}`,
  '',
  'Renderer: HyperFrames / monoliquid-v2',
  '',
  `Blog source: ${candidate.source?.url ?? ''}`,
  '',
  'Resolved image provenance is retained from the approved candidate manifest.',
  '',
];
for (const [index, scene] of manifest.scenes.entries()) {
  if (!scene.image) continue;
  media.push(
    `## Scene ${index + 1}`,
    '',
    `- Query: ${scene.image.query ?? 'N/A'}`,
    `- Work: ${scene.image.title ?? 'Untitled'}`,
    `- Creator: ${scene.image.creator ?? 'Unknown'}`,
    `- License: ${scene.image.license ?? 'N/A'}${scene.image.licenseVersion ? ` ${scene.image.licenseVersion}` : ''}`,
    `- License URL: ${scene.image.licenseUrl ?? 'N/A'}`,
    `- Source page: ${scene.image.sourcePage ?? 'N/A'}`,
    '',
  );
}
await fs.writeFile(path.join(outputDir, `${prefix}-MEDIA.md`), `${media.join('\n')}\n`, 'utf8');

console.log(`Wrote HyperFrames release sidecars for ${prefix}: SRT, Reels copy, script and media provenance.`);
