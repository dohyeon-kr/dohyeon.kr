import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {BackgroundVideoSchema, validateBackgroundVideo, videoFrameCount} from '../src/video/schema.ts';
import {loadVideoCatalog, validateVideoSelection, validateVideoDuration, downloadVideo, acquireVideo, videoHash, probeVideo, prepareVideo} from '../scripts/video-assets.mjs';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';
import {zodTextFormat} from 'openai/helpers/zod';

const video = {assetId: 'sample', startSeconds: 0, endSeconds: 2, playbackRate: 1, endBehavior: 'loop', cropX: .5, cropY: .5, overlayOpacity: .5};
test('video schema survives structured output serialization', () => {
  assert.equal(zodTextFormat(CandidateSchema, 'candidate').type, 'json_schema');
  assert.equal(BackgroundVideoSchema.parse(video).assetId, 'sample');
  for (const change of [{startSeconds: -1}, {playbackRate: 0}, {cropX: 2}, {overlayOpacity: 0}, {assetId: '../secret'}, {endBehavior: 'freeze'}]) assert.equal(BackgroundVideoSchema.safeParse({...video, ...change}).success, false);
});
test('video selection rejects unknown IDs, bad intervals and conflicting visuals', () => {
  const catalog = [{id: 'sample', durationSeconds: 2}];
  assert.equal(validateVideoSelection({backgroundVideo: video}, catalog).id, 'sample');
  assert.throws(() => validateVideoSelection({backgroundVideo: video}, []), /Unknown video/);
  assert.throws(() => validateVideoSelection({backgroundVideo: {...video, endSeconds: 3}}, catalog), /exceeds/);
  assert.throws(() => validateBackgroundVideo({backgroundVideo: {...video, startSeconds: 2}}), /end must/);
  assert.throws(() => validateBackgroundVideo({backgroundVideo: video, visual: {type: 'photo'}}), /photo/);
  assert.throws(() => validateBackgroundVideo({backgroundVideo: video, camera: {motion: 'zoom'}}), /static/);
  assert.doesNotThrow(() => validateBackgroundVideo({visual: {type: 'photo'}}));
});
test('duration checks include TTS tail and allow only explicit loops', () => {
  assert.equal(videoFrameCount(3.6), 117);
  assert.throws(() => validateVideoDuration({...video, endBehavior: 'error'}, 117), /too short/);
  assert.doesNotThrow(() => validateVideoDuration(video, 117));
  assert.doesNotThrow(() => validateVideoDuration({...video, endSeconds: 3.9, endBehavior: 'error'}, 117));
  assert.throws(() => validateVideoDuration({...video, endSeconds: .01}, 117), /one output frame/);
});
test('download failures are explicit and partial files are removed', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-download-'));
  try {
    const target = path.join(dir, 'source');
    await assert.rejects(downloadVideo('http://example.com/v', target), /HTTPS/);
    await assert.rejects(downloadVideo('https://example.com/v', target, {fetchImpl: async () => new Response('', {status: 404})}), /404/);
    await assert.rejects(downloadVideo('https://example.com/v', target, {fetchImpl: async () => new Response('x', {headers: {'content-length': String(101 * 1024 * 1024)}})}), /100 MiB/);
    const body = new ReadableStream({start(controller) {controller.enqueue(new Uint8Array([1])); controller.error(new Error('broken stream'));}});
    await assert.rejects(downloadVideo('https://example.com/v', target, {fetchImpl: async () => new Response(body)}), /broken stream/);
    assert.deepEqual(await fs.readdir(dir), []);
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});
test('real decode, trim, speed, looping, silence, cache integrity and missing files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-real-'));
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
  try {
    const source = path.join(dir, 'source.mp4');
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=540x960:rate=30:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
    const catalogAsset = (await loadVideoCatalog())[0];
    const sha256 = await videoHash(source);
    const asset = {...catalogAsset, ...await probeVideo(source), sha256};
    const cache = path.join(dir, `${sha256}.media`);
    await fs.copyFile(source, cache);
    const acquired = await acquireVideo(asset, dir);
    const output = path.join(dir, 'prepared.mp4');
    await prepareVideo({backgroundVideo: {...video, startSeconds: .5, endSeconds: 1.5, playbackRate: 2}}, acquired, output, 117);
    assert.ok(Math.abs((await probeVideo(output)).durationSeconds - 3.9) < .01);
    const streams = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', output])).streams;
    assert.equal(streams.filter(s => s.codec_type === 'audio').length, 0);
    const frame = n => execFileSync(ffmpeg, ['-v', 'error', '-i', output, '-vf', `select=eq(n\\,${n})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
    assert.notDeepEqual(frame(0), frame(7), 'background must move');
    const meanDiff = (a,b) => a.reduce((sum,v,i) => sum + Math.abs(v-b[i]),0)/a.length;
    assert.ok(meanDiff(frame(0), frame(15)) < 2, 'selected half-second segment repeats');
    await fs.writeFile(cache, 'corrupt');
    await assert.rejects(acquireVideo(asset, dir), /checksum/);
    await assert.rejects(probeVideo(path.join(dir, 'missing.mp4')));
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});
