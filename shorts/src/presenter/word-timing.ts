import {validatePresenter, type PresenterSpec, type MouthCue} from './schema.ts';
import type {MouthShape} from './vocabulary.ts';

export type TimedWord = {word: string; start: number; end: number};
// Provider boundary only: tolerate at most one 20ms timestamp tick.
// Do not invent a duration for zero-length words or reorder spoken words.
export function normalizeWordTiming(input: unknown, duration: number) {
  if (!Array.isArray(input) || !input.length) throw new Error('Missing speech word timestamps');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid audio duration');
  const words: TimedWord[] = [];
  const corrections: {index: number; from: TimedWord; to: TimedWord}[] = [];
  const omitted: {index: number; word: TimedWord; reason: 'zero-duration'}[] = [];
  let previousStart = -Infinity;
  for (const [index, item] of input.entries()) {
    const fail = (reason: string): never => {throw new Error(`Word ${index}: ${reason}; start=${item?.start}, end=${item?.end}, duration=${duration}`);};
    if (!item || typeof item.word !== 'string' || !Number.isFinite(item.start) || !Number.isFinite(item.end)) fail('invalid timestamp');
    if (item.end < item.start) fail('reversed duration');
    if (item.start < previousStart) fail('out-of-order word');
    previousStart = item.start;
    if (item.end === item.start) {
      if (item.start < 0 || item.end > duration) fail('zero-duration word outside audio');
      // No measured interval means no defensible viseme. Keep the spoken
      // audio and caption intact; omit only this token from animation input.
      omitted.push({index, word:{word:item.word,start:item.start,end:item.end}, reason:'zero-duration'});
      continue;
    }
    const previous = words.at(-1);
    if (previous && item.start < previous.start) fail('out-of-order word');
    const start = Math.max(0, previous?.end ?? 0, item.start);
    const end = Math.min(duration, item.end);
    if (start - item.start > .020000001 || item.end - end > .020000001) fail('timestamp correction exceeds 20ms');
    if (end <= start) fail('no positive interval after correction');
    const word = {word:item.word, start, end};
    if (start !== item.start || end !== item.end) corrections.push({index, from:{word:item.word,start:item.start,end:item.end}, to:word});
    words.push(word);
  }
  if (!words.length) throw new Error('No positive-duration speech word timestamps');
  return {words, corrections, omitted};
}
const vowels: MouthShape[] = ['A','A','A','A','A','A','A','A','O','A','A','I','O','O','A','A','I','O','I','I','I'];
// Word boundaries come from the final audio. Syllable/viseme timing inside each
// word is an approximation, not measured phoneme alignment or Korean G2P.
export function wordsToPresenter(words: readonly TimedWord[], duration: number, options: {lipSync?: string; nod?: string}): PresenterSpec {
  if (!words.length) throw new Error('Speech alignment returned no word timestamps');
  let previousEnd = 0;
  const mouths: MouthCue[] = [];
  for (const item of words) {
    if (typeof item.word !== 'string' || !Number.isFinite(item.start) || !Number.isFinite(item.end) || item.start < previousEnd || item.start < 0 || item.end <= item.start || item.end > duration) throw new Error('Invalid or overlapping speech word timestamps');
    previousEnd = item.end;
    const text = item.word.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '');
    if (!text) continue;
    if (!/^[가-힣]+$/.test(text)) throw new Error(`Korean speech adapter requires Hangul words: ${item.word}`);
    const syllables = [...text];
    const step = (item.end - item.start) / syllables.length;
    if (options.lipSync !== 'word-timestamps') continue;
    syllables.forEach((char, i) => {
      const code = char.charCodeAt(0) - 0xac00, onset = Math.floor(code / 588), vowel = Math.floor(code % 588 / 28), coda = code % 28;
      const start = item.start + step * i, end = i === syllables.length - 1 ? item.end : item.start + step * (i + 1);
      const closedStart = [6,7,8,17].includes(onset), closedEnd = [16,17,18].includes(coda);
      if (closedStart) mouths.push({start, end:start + step * .18, shape:'M', intensity:0});
      mouths.push({start:start + step * (closedStart ? .18 : 0), end:start + step * .85, shape:vowels[vowel], intensity:.7});
      mouths.push({start:start + step * .85, end, shape:closedEnd ? 'M' : 'rest', intensity:0});
    });
  }
  const actions: NonNullable<PresenterSpec['actions']> = [];
  if (options.nod === 'speech') {
    // One restrained nod per phrase, leaving silent gaps and avoiding a bobble loop.
    const phrases: TimedWord[][] = [];
    for (const word of words.filter(w => /[가-힣]/.test(w.word))) {
      const phrase = phrases.at(-1), last = phrase?.at(-1);
      if (!phrase || !last || word.start - last.end > .3 || word.end - phrase[0].start > 2.8 || /[.!?。！？]$/.test(last.word.trim())) phrases.push([word]);
      else phrase.push(word);
    }
    for (const phrase of phrases) {
      const start = phrase[0].start, end = Math.min(phrase.at(-1)!.end, start + 1.6);
      if (end - start >= .35) actions.push({start, end, name:'explain', intensity:.55});
    }
  }
  if (options.lipSync === 'word-timestamps' && !mouths.length) throw new Error('Speech alignment contained no spoken Hangul');
  return validatePresenter({version:1, mouths, actions, expressions:[]}, duration);
}
