import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {wordsToPresenter, normalizeWordTiming} from '../src/presenter/word-timing.ts';
import {overlayNeedsAlignment} from '../src/presenter/overlay.ts';

// Called only after atempo and duration measurement; timestamps need no rescaling.
export async function alignPresenter({client, audioFile, duration, narration, options, scene, reportFile}) {
  if (!overlayNeedsAlignment(options, {...scene, narration})) return null;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Presenter alignment requires measured final audio duration');
  const report = {version:2, model:'whisper-1', timing:'final-audio-word-timestamps',
    visemes:'hangul-syllable-approximation', audioSha256:createHash('sha256').update(await fs.readFile(audioFile)).digest('hex'),
    duration, attempts:[]};
  for (let attempt = 1; attempt <= 2; attempt++) {
  const result = await client.audio.transcriptions.create({
    file: createReadStream(audioFile), model: 'whisper-1', language: 'ko',
    response_format: 'verbose_json', timestamp_granularities: ['word'],
    prompt: narration,
  });
  const entry = {attempt, text:result.text, words:result.words};
  report.attempts.push(entry);
  // Persist provider output before validation, including on final failure.
  await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
  let tracks;
  try {
    const normalized = normalizeWordTiming(result.words, duration);
    entry.corrections = normalized.corrections;
    entry.omitted = normalized.omitted;
    if (normalized.omitted.length) console.warn(`Presenter alignment for ${audioFile}: omitted ${normalized.omitted.length} zero-duration animation tokens; audio and captions unchanged`);
    tracks = wordsToPresenter(normalized.words, duration, options);
    Object.assign(report, {text:result.text, words:normalized.words, tracks});
  } catch (error) {
    entry.error = error.message;
    await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
    if (attempt === 2) throw new Error(`Presenter alignment failed for ${audioFile}; see ${reportFile}: ${error.message}`, {cause:error});
    console.warn(`Presenter alignment retry for ${audioFile}: ${error.message}`);
    continue;
  }
  await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
  return tracks;
  }
}
