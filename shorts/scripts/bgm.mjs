import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const TRACKS = {
  'pulse-96': {bpm: 96, title: 'DLOG Pulse', notes: [55, 55, 65.406, 73.416], hats: .035},
  'grid-108': {bpm: 108, title: 'DLOG Grid', notes: [55, 73.416, 65.406, 49], hats: .045},
};
export function speechWindows(scenes) {
  let cursor = 0;
  const windows = [];
  for (const scene of scenes) {
    if (scene.audioPath) {
      const cues = scene.beatTimings?.length ? scene.beatTimings : [{startSeconds: 0, endSeconds: scene.audioDurationSeconds ?? 3.6}];
      for (const cue of cues) windows.push([cursor + cue.startSeconds, cursor + cue.endSeconds]);
    }
    cursor += Math.max(66, Math.ceil(((scene.audioDurationSeconds ?? 3.6) + .28) * 30)) / 30;
  }
  // Don't pump the music up between closely spaced subtitle beats.
  return windows.reduce((out, window) => {
    const last = out.at(-1);
    if (last && window[0] - last[1] < .4) last[1] = Math.max(last[1], window[1]);
    else out.push([...window]);
    return out;
  }, []);
}
export function musicGain(time, duration, windows) {
  const fade = Math.max(0, Math.min(1, time / .5, (duration - time) / .9));
  let duck = 0;
  for (const [start, end] of windows) {
    if (time >= start - .12 && time <= end + .35) {
      duck = Math.max(duck, Math.min(1, (time - start + .12) / .12, (end + .35 - time) / .35));
    }
  }
  return fade * (.28 - .20 * Math.max(0, duck));
}
export function synthBgm(duration, track, windows = [], sampleRate = 48000) {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600) throw new Error('BGM duration must be in (0, 600]');
  const config = TRACKS[track];
  if (!config) throw new Error(`Unknown BGM track: ${track}`);
  const count = Math.ceil(duration * sampleRate);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  const beat = 60 / config.bpm;
  let seed = 123456789;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const step = Math.floor(t / beat);
    const phase = t % beat;
    const hatPhase = t % (beat / 2);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    const kick = .40 * Math.sin(2 * Math.PI * (48 * phase + 2 * (1 - Math.exp(-phase * 35)))) * Math.exp(-phase * 18);
    const bass = .22 * Math.sin(2 * Math.PI * config.notes[Math.floor(step / 4) % 4] * phase) * Math.min(1, phase / .012) * Math.exp(-phase * 4);
    const hat = config.hats * noise * Math.exp(-hatPhase * 110);
    const clap = step % 2 ? .05 * noise * Math.exp(-phase * 50) : 0;
    const sample = Math.tanh(kick + bass + hat + clap) * musicGain(t, duration, windows);
    wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return wav;
}

export async function mixBgm(video, scenes, track = process.env.SHORTS_BGM_TRACK || 'pulse-96') {
  if (track === 'none') {
    await fs.writeFile(video.replace(/\.mp4$/, '-BGM.md'), '# BGM\n\nDisabled: SHORTS_BGM_TRACK=none.\n');
    return;
  }
  if (!TRACKS[track]) throw new Error(`Unknown BGM track: ${track}`);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', video], {encoding: 'utf8'}));
  const duration = Number(probe.format.duration);
  const temp = await fs.mkdtemp(path.join(path.dirname(video), 'bgm-'));
  try {
    const music = path.join(temp, 'music.wav');
    const mixed = path.join(temp, 'mixed.mp4');
    await fs.writeFile(music, synthBgm(duration, track, speechWindows(scenes)));
    const hasAudio = probe.streams.some(s => s.codec_type === 'audio');
    const filter = hasAudio ? '[0:a][1:a]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=false:latency=true[a]' : '[1:a]anull[a]';
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', music, '-filter_complex', filter, '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart', mixed], {stdio: 'inherit'});
    await fs.rename(mixed, video);
    await fs.writeFile(video.replace(/\.mp4$/, '-BGM.md'), `# BGM\n\n${TRACKS[track].title} (${track}), ${TRACKS[track].bpm} BPM.\n\nSynthesized from repository code: shorts/scripts/bgm.mjs. No third-party recordings or samples. This is a procedural backing track, not a licensed stock track or an exclusivity claim.\n\nOne continuous track, timeline-based narration ducking, 0.5s fade-in and 0.9s fade-out. Captions and video timing are unchanged.\n`);
  } finally {await fs.rm(temp, {recursive: true, force: true});}
}
