import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import OpenAI from 'openai';
import {templatePreviewProps, previewSceneFrames} from '../src/template-preview.ts';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, 'out/template-preview'));
const silent = process.argv.includes('--silent');
if (!silent && !process.env.OPENAI_API_KEY) throw new Error('Narrated preview requires OPENAI_API_KEY. Use --silent explicitly for CI.');
await fs.mkdir(output, {recursive: true});
const audioDir = await fs.mkdtemp(path.join(root, 'public', 'template-audio-'));
const props = structuredClone(templatePreviewProps);
const run = (cmd, args) => execFileSync(cmd, args, {cwd: root, stdio: 'inherit'});
const client = silent ? null : new OpenAI();
for (const [i, scene] of props.scenes.entries()) {
  if (!scene.beats?.length || silent) continue;
  const pieces = [];
  scene.beatTimings = [];
  let cursor = 0;
  for (const [j, beat] of scene.beats.entries()) {
    const file = path.join(audioDir, `${i}-${j}.mp3`);
    const response = await client.audio.speech.create({
      model: process.env.SHORTS_TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.SHORTS_TTS_VOICE || 'alloy',
      input: beat.text, response_format: 'mp3',
      instructions: '한국어로 차분하고 또렷하게 읽는다. 한 편의 짧은 설명 영상처럼 일정한 목소리와 자연스러운 속도를 유지한다.',
    });
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
    const wav = path.join(audioDir, `${i}-${j}.wav`);
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-af', `apad=pad_dur=${beat.pauseAfterMs / 1000}`, '-ar', '48000', '-ac', '1', wav]);
    // Measure decoded PCM, not MP3 container duration (encoder padding differs).
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', wav], {encoding: 'utf8'}).trim());
    if (!Number.isFinite(duration) || duration <= beat.pauseAfterMs / 1000) throw new Error('Invalid TTS duration');
    scene.beatTimings.push({startSeconds: cursor, endSeconds: cursor + duration - beat.pauseAfterMs / 1000});
    pieces.push(wav);
    cursor += duration;
  }
  const list = path.join(audioDir, `${i}.txt`);
  await fs.writeFile(list, pieces.map(file => `file '${file}'`).join('\n'));
  const joined = path.join(audioDir, `${i}.wav`);
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
  scene.audioPath = path.relative(path.join(root, 'public'), joined);
  scene.audioDurationSeconds = cursor;
}
const propsFile = path.join(output, 'preview-props.json');
await fs.writeFile(propsFile, JSON.stringify(props, null, 2));
await fs.writeFile(path.join(output, 'SCRIPT.txt'), `연출 검증용 창작 예제 · ${silent ? '무음 / 추정 타이밍' : 'AI 생성 음성 / 의미 단위별 실측 타이밍'}\n\n` + props.scenes.map((s, i) => `${i + 1}. ${s.headline.replaceAll('\n', ' ')}\n${s.narration}`).join('\n\n'));
const common = ['--public-dir=public', `--props=${propsFile}`, '--scale=0.5'];
run('npx', ['remotion', 'render', 'src/index.tsx', 'TemplatePreview', path.join(output, 'shorts-template-preview.mp4'), ...common, '--codec=h264', '--crf=22', '--concurrency=2']);
let start = 0;
for (const [i, scene] of props.scenes.entries()) {
  const frames = previewSceneFrames(scene);
  const frame = start + Math.floor(frames * .55);
  run('npx', ['remotion', 'still', 'src/index.tsx', 'TemplatePreview', path.join(output, `scene-${String(i + 1).padStart(2, '0')}.png`), ...common, `--frame=${frame}`]);
  start += frames;
}
await fs.copyFile(path.join(output, 'scene-02.png'), path.join(output, 'shorts-template-preview.png'));
