import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {loadVideoCatalog, downloadVideo, probeVideo, videoHash, VideoAssetSchema} from './video-assets.mjs';

// The metadata file is authored by an editor after checking the source/license page.
// Downloads and probes the real file; never trusts AI-provided duration or checksum.
export async function registerVideo(metadataFile) {
  const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
  VideoAssetSchema.omit({sha256: true, durationSeconds: true, width: true, height: true}).parse(metadata);
  const catalog = await loadVideoCatalog();
  if (catalog.some(a => a.id === metadata.id)) throw new Error(`Video ID already exists: ${metadata.id}`);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'register-video-'));
  try {
    const file = path.join(directory, 'source.media');
    await downloadVideo(metadata.downloadUrl, file);
    await promisify(execFile)(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-an', '-f', 'null', '-'], {timeout: 240000, maxBuffer: 4 * 1024 * 1024});
    const asset = VideoAssetSchema.parse({...metadata, ...await probeVideo(file), sha256: await videoHash(file)});
    await fs.writeFile(path.resolve(import.meta.dirname, '../media/videos.json'), JSON.stringify([...catalog, asset], null, 2) + '\n');
    return asset;
  } finally {await fs.rm(directory, {recursive: true, force: true});}
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node shorts/scripts/register-video.mjs <source-metadata.json>');
  console.log(JSON.stringify(await registerVideo(process.argv[2]), null, 2));
}
