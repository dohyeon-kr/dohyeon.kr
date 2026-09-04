import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(shortsRoot, 'out');
const playbackRate = Number(process.env.SHORTS_PLAYBACK_RATE || '1.5');

const safeName = (value) => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'inherit', ...options});
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const parseTimestamp = (value) => {
  const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
};

const formatTimestamp = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

const retimeSrt = async (srtFile, rate) => {
  const source = await fs.readFile(srtFile, 'utf8');
  const adjusted = source.replace(
    /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g,
    (_, start, end) => {
      const startSeconds = parseTimestamp(start);
      const endSeconds = parseTimestamp(end);
      if (startSeconds == null || endSeconds == null) return `${start} --> ${end}`;
      return `${formatTimestamp(startSeconds / rate)} --> ${formatTimestamp(endSeconds / rate)}`;
    },
  );
  await fs.writeFile(srtFile, adjusted, 'utf8');
};

const main = async () => {
  const manifestArg = process.argv[2];
  if (!manifestArg) throw new Error('Usage: node render-reels.mjs <shorts/content/.../candidate-XX.json>');
  if (!Number.isFinite(playbackRate) || playbackRate < 0.5 || playbackRate > 2) {
    throw new Error(`SHORTS_PLAYBACK_RATE must be between 0.5 and 2. Received: ${playbackRate}`);
  }

  const manifestPath = path.resolve(repoRoot, manifestArg);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const slug = safeName(path.basename(path.dirname(manifestPath)));
  const candidateId = safeName(manifest.id || path.basename(manifestPath, '.json'));
  const base = path.join(outputRoot, `${slug}-${candidateId}`);
  const videoFile = `${base}.mp4`;
  const srtFile = `${base}.srt`;

  await run(process.execPath, [path.join(shortsRoot, 'scripts', 'render.mjs'), manifestArg], {
    cwd: repoRoot,
    env: process.env,
  });

  if (playbackRate !== 1) {
    const sourceVideo = `${base}.source-rate.mp4`;
    await fs.rename(videoFile, sourceVideo);
    try {
      await run('ffmpeg', [
        '-y',
        '-i', sourceVideo,
        '-filter_complex', `[0:v]setpts=PTS/${playbackRate}[v];[0:a]atempo=${playbackRate}[a]`,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        videoFile,
      ]);
      await retimeSrt(srtFile, playbackRate);
    } finally {
      await fs.rm(sourceVideo, {force: true});
    }
  }

  const hashtags = Array.isArray(manifest.candidate?.hashtags)
    ? manifest.candidate.hashtags.join(' ')
    : '';
  const reelsBody = [
    manifest.candidate?.suggestedCaption?.trim() || manifest.candidate?.title || '',
    '',
    hashtags,
    '',
    `원문: ${manifest.source.url}`,
  ].join('\n').trim() + '\n';

  const narrationScript = manifest.scenes
    .map((scene, index) => `${index + 1}. ${scene.narration}`)
    .join('\n\n') + '\n';

  await fs.writeFile(`${base}-REELS.txt`, reelsBody, 'utf8');
  await fs.writeFile(`${base}-SCRIPT.txt`, narrationScript, 'utf8');

  console.log(`Prepared Reels assets at ${path.relative(repoRoot, base)}-* (${playbackRate}x playback).`);
};

await main();
