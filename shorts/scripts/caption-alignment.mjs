const normalized = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase('ko-KR')
  .replace(/[^\p{L}\p{N}]+/gu, '');

const validWords = (words) => (words ?? [])
  .filter((word) => typeof word?.word === 'string' && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
  .map((word) => ({...word, normalized: normalized(word.word)}))
  .filter((word) => word.normalized.length > 0);

const editDistance = (left, right) => {
  const previous = Array.from({length: right.length + 1}, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return previous[right.length];
};

const similarity = (left, right) => {
  if (!left && !right) return 1;
  const length = Math.max(left.length, right.length);
  return length ? 1 - editDistance(left, right) / length : 0;
};

const coverageIsPlausible = (words, durationSeconds) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !words.length) return true;
  const first = words[0].start;
  const last = words.at(-1).end;
  const span = last - first;
  const maxLeadingSilence = Math.max(.75, durationSeconds * .12);
  const maxTrailingSilence = Math.max(.9, durationSeconds * .15);
  const minSpeechSpan = durationSeconds * .55;
  return first <= maxLeadingSilence && durationSeconds - last <= maxTrailingSilence && span >= minSpeechSpan;
};

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

export function estimatedBeatTimings(beatsInput, durationSeconds) {
  const beats = (beatsInput ?? []).filter((beat) => beat?.text?.trim());
  if (!beats.length || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;
  const usableDuration = Math.max(.6, durationSeconds - .08);
  const weights = beats.map((beat) => Math.max(1, normalized(beat.text).length) * (beat.delivery === 'hold' ? 1.12 : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return beats.map((beat, index) => {
    const span = usableDuration * weights[index] / totalWeight;
    const end = index === beats.length - 1 ? usableDuration : Math.min(usableDuration, cursor + span);
    const timing = {
      startSeconds: Number(cursor.toFixed(3)),
      endSeconds: Number(Math.max(cursor + .12, end).toFixed(3)),
    };
    cursor = end;
    return timing;
  });
}

export function alignBeatTimings(beatsInput, wordsInput, durationSeconds = null) {
  const beats = (beatsInput ?? []).filter((beat) => beat?.text?.trim());
  const words = validWords(wordsInput);
  if (!beats.length || !words.length) return null;

  // The renderer historically accepted any monotonic Whisper timestamps. Korean word
  // timestamps can occasionally cover only the latter half of a scene while still being
  // syntactically valid, producing several seconds of no captions followed by a burst.
  // When the measured speech coverage is implausible, preserve the authored semantic beats
  // and spread them across the observed audio span instead of trusting the clustered words.
  const inferredDuration = Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : words.at(-1).end;
  if (!coverageIsPlausible(words, inferredDuration)) {
    const timings = estimatedBeatTimings(beats, inferredDuration);
    return timings ? {method: 'estimated', timings} : null;
  }

  const exact = exactBeatTimings(beats, words);
  if (exact) return {method: 'exact', timings: exact};

  const beatText = beats.map((beat) => normalized(beat.text)).join('');
  const wordText = words.map((word) => word.normalized).join('');
  if (similarity(beatText, wordText) < .82) {
    const timings = estimatedBeatTimings(beats, inferredDuration);
    return timings ? {method: 'estimated', timings} : null;
  }

  const proportional = proportionalBeatTimings(beats, words);
  if (proportional) return {method: 'proportional', timings: proportional};
  const timings = estimatedBeatTimings(beats, inferredDuration);
  return timings ? {method: 'estimated', timings} : null;
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
