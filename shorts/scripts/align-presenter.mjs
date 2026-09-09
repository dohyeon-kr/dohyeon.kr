import {cachedTranscription} from './audio-cache.mjs';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {wordsToPresenter, normalizeWordTiming} from '../src/presenter/word-timing.ts';
import {overlayNeedsAlignment} from '../src/presenter/overlay.ts';
import {speechReading, UnsupportedSpeechTextError} from '../src/presenter/speech-text.ts';

// Called only after atempo and duration measurement; timestamps need no rescaling.
export async function alignPresenter({client, audioFile, duration, narration, options, scene, reportFile, cacheDir}) {
  if (!overlayNeedsAlignment(options, {...scene, narration})) return null;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Presenter alignment requires measured final audio duration');
  const report = {version:3, model:'whisper-1', timing:'final-audio-word-timestamps',
    visemes:'mixed-text-hangul-syllable-approximation', audioSha256:createHash('sha256').update(await fs.readFile(audioFile)).digest('hex'),
    duration, attempts:[]};
  for (let attempt = 1; attempt <= 2; attempt++) {
  const result = await cachedTranscription({client, audioFile, narration, attempt, cacheDir, createFile: createReadStream});
  const entry = {attempt, text:result.text, words:result.words};
  report.attempts.push(entry);
  // Persist provider output before validation, including on final failure.
  await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
  let tracks;
  try {
    const normalized = normalizeWordTiming(result.words, duration);
    entry.corrections = normalized.corrections;
    entry.omitted = normalized.omitted;
    entry.readings = options.lipSync === 'word-timestamps'
      ? normalized.words.map(word => ({...word, ...speechReading(word.word)})) : [];
    if (normalized.omitted.length) console.warn(`Presenter alignment for ${audioFile}: omitted ${normalized.omitted.length} zero-duration animation tokens; audio and captions unchanged`);
    tracks = wordsToPresenter(normalized.words, duration, options);
    Object.assign(report, {text:result.text, words:normalized.words, readings:entry.readings, tracks});
  } catch (error) {
    entry.error = error.message;
    entry.retryable = !(error instanceof UnsupportedSpeechTextError);
    await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
    if (attempt === 2 || !entry.retryable) throw new Error(`Presenter alignment failed for ${audioFile}; see ${reportFile}: ${error.message}`, {cause:error});
    console.warn(`Presenter alignment retry for ${audioFile}: ${error.message}`);
    continue;
  }
  await fs.writeFile(reportFile, JSON.stringify(report,null,2) + '\n');
  return tracks;
  }
}
