const normalized = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase('ko-KR')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const validWords = (words) => (words ?? [])
  .filter((word) => typeof word?.word === 'string' && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
  .map((word) => ({...word, normalized: normalized(word.word)}))
  .filter((word) => word.normalized.length > 0);

const exactBeatTimings = (beats, words) => {
  const normalizedBeats = beats.map((beat) => normalized(beat.text));
  if (normalizedBeats.some((text) => !text)) return null;
  if (normalizedBeats.join('') !== words.map((word) => word.normalized).join('')) return null;

  const timings = [];
  let wordIndex = 0;
  for (const target of normalizedBeats) {
    const startIndex = wordIndex;
    let matched = '';
    while (wordIndex < words.length && matched.length < target.length) {
      matched += words[wordIndex].normalized;
      wordIndex += 1;
    }
    if (matched !== target || wordIndex <= startIndex) return null;
    timings.push({
      startSeconds: Number(words[startIndex].start.toFixed(3)),
      endSeconds: Number(words[wordIndex - 1].end.toFixed(3)),
    });
  }
  return wordIndex === words.length ? timings : null;
};

const proportionalBeatTimings = (beats, words) => {
  if (words.length < beats.length) return null;
  const beatWeights = beats.map((beat) => Math.max(1, normalized(beat.text).length));
  const wordWeights = words.map((word) => Math.max(1, word.normalized.length));
  const totalBeatWeight = beatWeights.reduce((sum, value) => sum + value, 0);
  const totalWordWeight = wordWeights.reduce((sum, value) => sum + value, 0);
  const wordPrefix = [];
  let wordSum = 0;
  for (const weight of wordWeights) {
    wordSum += weight;
    wordPrefix.push(wordSum);
  }

  const timings = [];
  let beatSum = 0;
  let nextWordIndex = 0;
  for (const [index, weight] of beatWeights.entries()) {
    const startIndex = nextWordIndex;
    beatSum += weight;
    const remainingBeats = beatWeights.length - index - 1;
    const maxEndIndex = words.length - remainingBeats - 1;
    const targetWeight = totalWordWeight * (beatSum / totalBeatWeight);
    let endIndex = startIndex;
    while (endIndex < maxEndIndex && wordPrefix[endIndex] < targetWeight) endIndex += 1;
    if (index === beatWeights.length - 1) endIndex = words.length - 1;
    nextWordIndex = endIndex + 1;
    timings.push({
      startSeconds: Number(words[startIndex].start.toFixed(3)),
      endSeconds: Number(words[endIndex].end.toFixed(3)),
    });
  }
  return timings;
};

export function alignBeatTimings(beatsInput, wordsInput) {
  const beats = (beatsInput ?? []).filter((beat) => beat?.text?.trim());
  const words = validWords(wordsInput);
  if (!beats.length || !words.length) return null;

  const exact = exactBeatTimings(beats, words);
  if (exact) return {method: 'exact', timings: exact};

  const proportional = proportionalBeatTimings(beats, words);
  return proportional ? {method: 'proportional', timings: proportional} : null;
}

export function captionsFromBeatTimings(beatsInput, timings) {
  const beats = (beatsInput ?? []).filter((beat) => beat?.text?.trim());
  if (!timings || timings.length !== beats.length) return null;
  return beats.map((beat, index) => ({
    text: beat.text,
    startSeconds: timings[index].startSeconds,
    endSeconds: timings[index].endSeconds,
  }));
}
