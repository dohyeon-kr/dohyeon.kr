import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {wordsToPresenter} from '../src/presenter/word-timing.ts';
import {overlayNeedsAlignment} from '../src/presenter/overlay.ts';

// Called only after atempo and duration measurement; timestamps need no rescaling.
export async function alignPresenter({client, audioFile, duration, narration, options, scene, reportFile}) {
  if (!overlayNeedsAlignment(options, {...scene, narration})) return null;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Presenter alignment requires measured final audio duration');
  const result = await client.audio.transcriptions.create({
    file: createReadStream(audioFile), model: 'whisper-1', language: 'ko',
    response_format: 'verbose_json', timestamp_granularities: ['word'],
    prompt: narration,
  });
  const words = result.words;
  if (!Array.isArray(words)) throw new Error('Whisper response is missing word timestamps');
  const tracks = wordsToPresenter(words, duration, options);
  const report = {version:1, model:'whisper-1', timing:'final-audio-word-timestamps',
    visemes:'hangul-syllable-approximation', audioSha256:createHash('sha256').update(await fs.readFile(audioFile)).digest('hex'),
    duration, text:result.text, words, tracks};
  await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
  return tracks;
}
