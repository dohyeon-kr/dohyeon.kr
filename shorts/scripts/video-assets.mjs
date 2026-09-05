import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {z} from 'zod/v4';
import {validateBackgroundVideo} from '../src/video/schema.ts';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const MAX_BYTES = 100 * 1024 * 1024;
const httpsUrl = z.string().url().refine(value => new URL(value).protocol === 'https:', 'HTTPS required');
export const VideoAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/), title: z.string().min(1),
  description: z.string().min(1), creator: z.string().min(1),
  sourcePage: httpsUrl, downloadUrl: httpsUrl, license: z.string().min(1), licenseUrl: httpsUrl,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  durationSeconds: z.number().positive().max(600), width: z.number().int().positive().max(8192), height: z.number().int().positive().max(8192),
});
export async function loadVideoCatalog(filename = path.join(root, 'media/videos.json')) {
  const assets = z.array(VideoAssetSchema).parse(JSON.parse(await fs.readFile(filename, 'utf8')));
  if (new Set(assets.map(a => a.id)).size !== assets.length) throw new Error('Duplicate video asset IDs');
  return assets;
}
export async function probeVideo(file) {
  const {stdout} = await exec(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  const data = JSON.parse(stdout);
  const stream = data.streams?.find(s => s.codec_type === 'video');
  const durationSeconds = Number(stream?.duration || data.format?.duration);
  if (!stream || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600 || !stream.width || !stream.height) throw new Error('Invalid video stream or duration (maximum 600s)');
  return {durationSeconds, width: stream.width, height: stream.height};
}
export async function downloadVideo(url, target, {fetchImpl = fetch} = {}) {
  httpsUrl.parse(url);
  // No redirects: the catalog must contain a stable, direct file URL.
  const response = await fetchImpl(url, {redirect: 'error', signal: AbortSignal.timeout(120000)});
  if (!response.ok || !response.body) throw new Error(`Video download failed: HTTP ${response.status}`);
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Video exceeds 100 MiB');
  const temporary = `${target}.${process.pid}.download`;
  const handle = await fs.open(temporary, 'wx');
  let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error('Video exceeds 100 MiB');
      await handle.writeFile(chunk);
    }
    await handle.close();
    await fs.rename(temporary, target);
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.rm(temporary, {force: true});
    throw error;
  }
}
export async function videoHash(file) {
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (stat.size > MAX_BYTES) throw new Error('Video exceeds 100 MiB');
    return createHash('sha256').update(await handle.readFile()).digest('hex');
  } finally {await handle.close();}
}
export async function acquireVideo(asset, cacheDir = path.join(root, '.tmp/video-cache')) {
  VideoAssetSchema.parse(asset);
  await fs.mkdir(cacheDir, {recursive: true});
  const file = path.join(cacheDir, `${asset.sha256}.media`);
  try {await fs.access(file);} catch {await downloadVideo(asset.downloadUrl, file);}
  if (await videoHash(file) !== asset.sha256) {
    await fs.rm(file, {force: true});
    throw new Error(`Video checksum mismatch: ${asset.id}`);
  }
  const actual = await probeVideo(file);
  if (Math.max(1080 / actual.width, 1920 / actual.height) > 2) throw new Error(`Video resolution too low for portrait crop: ${asset.id}`);
  if (Math.abs(actual.durationSeconds - asset.durationSeconds) > .1 || actual.width !== asset.width || actual.height !== asset.height) throw new Error(`Video metadata mismatch: ${asset.id}`);
  await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-an', '-f', 'null', '-'], {timeout: 240000, maxBuffer: 4 * 1024 * 1024});
  return {file, ...actual};
}
export function validateVideoSelection(scene, catalog) {
  validateBackgroundVideo(scene);
  if (!scene.backgroundVideo) return null;
  const asset = catalog.find(a => a.id === scene.backgroundVideo.assetId);
  if (!asset) throw new Error(`Unknown video asset: ${scene.backgroundVideo.assetId}`);
  if (scene.backgroundVideo.endSeconds > asset.durationSeconds) throw new Error(`Video trim exceeds source duration: ${asset.id}`);
  return asset;
}
export function validateVideoDuration(video, frames, fps = 30) {
  if (!Number.isInteger(frames) || frames < 1 || frames > fps * 600) throw new Error('Invalid video scene duration');
  const available = Math.floor((video.endSeconds - video.startSeconds) / video.playbackRate * fps + 1e-6);
  if (available < 1) throw new Error('Video trim must contain at least one output frame');
  if (video.endBehavior === 'error' && available < frames) throw new Error(`Video too short: ${available} frames available, ${frames} required; choose a longer clip or explicitly enable loop`);
}
export async function prepareVideo(scene, acquired, output, frames, fps = 30) {
  const video = scene.backgroundVideo;
  validateVideoDuration(video, frames, fps);
  const segment = `${output}.segment.mp4`;
  const temporary = `${output}.pending.mp4`;
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const options = {timeout: 240000, maxBuffer: 4 * 1024 * 1024};
  try {
    await exec(ffmpeg, ['-y', '-v', 'error', '-xerror', '-i', acquired.file, '-map', '0:v:0', '-an',
      '-vf', `trim=start=${video.startSeconds}:end=${video.endSeconds},setpts=(PTS-STARTPTS)/${video.playbackRate},fps=${fps},scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', segment], options);
    await exec(ffmpeg, ['-y', '-v', 'error', '-xerror', ...(video.endBehavior === 'loop' ? ['-stream_loop', '-1'] : []),
      '-i', segment, '-map', '0:v:0', '-an', '-frames:v', String(frames), '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', temporary], options);
    const result = await probeVideo(temporary);
    if (Math.abs(result.durationSeconds - frames / fps) > .5 / fps) throw new Error('Prepared video does not cover the scene');
    await fs.rename(temporary, output);
    return output;
  } finally {
    await fs.rm(segment, {force: true});
    await fs.rm(temporary, {force: true});
  }
}
