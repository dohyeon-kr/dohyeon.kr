import type {RenderScene, SubtitleBeat} from './types.ts';

const compactLength = (text: string) => text.replace(/\s/g, '').length;
const compactText = (text: string) => text.replace(/\s+/g, '');
const CAPTION_BOUNDARY_EPSILON_SECONDS = 1 / 60;
const MAX_CAPTION_GAP_FILL_SECONDS = 0.16;

type TimedBeat = SubtitleBeat & {startSeconds: number; endSeconds: number};

const finite = (value: number | null | undefined, fallback: number) =>
  Number.isFinite(value) ? Number(value) : fallback;

export const timedBeats = (scene: RenderScene): TimedBeat[] => {
  const beats = scene.beats?.filter((beat) => beat.text.trim()) ?? [];
  if (!beats.length) return [];

  if (scene.beatTimings?.length === beats.length) {
    return beats.map((beat, index) => {
      const timing = scene.beatTimings![index];
      const startSeconds = Math.max(0, finite(timing.startSeconds, 0));
      const endSeconds = Math.max(startSeconds, finite(timing.endSeconds, startSeconds));
      return {...beat, startSeconds, endSeconds};
    });
  }

  const duration = Math.max(0.8, scene.audioDurationSeconds ?? 3.6);
  const rawPauseSeconds = beats.reduce((sum, beat) => sum + Math.max(0, beat.pauseAfterMs) / 1000, 0);
  const pauseBudget = Math.min(rawPauseSeconds, duration * 0.24);
  const pauseScale = rawPauseSeconds > 0 ? pauseBudget / rawPauseSeconds : 0;
  const speechBudget = Math.max(0.5, duration - pauseBudget);
  const weights = beats.map((beat) => Math.max(1, compactLength(beat.text)) * (beat.delivery === 'hold' ? 1.12 : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return beats.map((beat, index) => {
    const span = (speechBudget * weights[index]) / totalWeight;
    const startSeconds = cursor;
    const endSeconds = Math.min(duration, startSeconds + span);
    cursor = endSeconds + (Math.max(0, beat.pauseAfterMs) / 1000) * pauseScale;
    return {...beat, startSeconds, endSeconds};
  });
};

const normalizedCaptionText = (value: string) => value.replace(/\s+/g, ' ').trim();

const measuredBeatsFromCaptions = (scene: RenderScene): TimedBeat[] | null => {
  const beats = scene.beats?.filter((beat) => beat.text.trim()) ?? [];
  const captions = [...(scene.captions ?? [])]
    .filter((cue) => cue.text.trim())
    .sort((a, b) => a.startSeconds - b.startSeconds);
  if (!beats.length || !captions.length) return null;

  const beatText = beats.map((beat) => compactText(beat.text)).join('');
  const captionText = captions.map((cue) => compactText(cue.text)).join('');
  if (!beatText || beatText !== captionText) return null;

  let textCursor = 0;
  const ranges = captions.map((cue) => {
    const length = compactText(cue.text).length;
    const range = {
      start: textCursor,
      end: textCursor + length,
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
    };
    textCursor += length;
    return range;
  });

  const timeAtOffset = (offset: number) => {
    const clamped = Math.max(0, Math.min(textCursor, offset));
    const range = ranges.find((item, index) =>
      clamped >= item.start && (clamped < item.end || (index === ranges.length - 1 && clamped === item.end)),
    ) ?? ranges.at(-1)!;
    if (clamped <= range.start) return range.startSeconds;
    if (clamped >= range.end) return range.endSeconds;
    const progress = (clamped - range.start) / Math.max(1, range.end - range.start);
    return range.startSeconds + (range.endSeconds - range.startSeconds) * progress;
  };

  let beatCursor = 0;
  return beats.map((beat) => {
    const startOffset = beatCursor;
    beatCursor += compactText(beat.text).length;
    return {
      ...beat,
      startSeconds: Number(timeAtOffset(startOffset).toFixed(3)),
      endSeconds: Number(timeAtOffset(beatCursor).toFixed(3)),
    };
  });
};

const decorateCaption = (scene: RenderScene, cue: NonNullable<RenderScene['captions']>[number]) => {
  const text = normalizedCaptionText(cue.text);
  const beat = scene.beats?.find((candidate) => normalizedCaptionText(candidate.text) === text);
  return beat ? {...beat, ...cue} : cue;
};

const captionAt = (scene: RenderScene, seconds: number) => {
  const captions = [...(scene.captions ?? [])]
    .filter((cue) => cue.text.trim())
    .sort((a, b) => a.startSeconds - b.startSeconds);

  if (!captions.length) return null;

  const exact = captions.find(
    (cue) =>
      seconds + CAPTION_BOUNDARY_EPSILON_SECONDS >= cue.startSeconds &&
      seconds < cue.endSeconds + CAPTION_BOUNDARY_EPSILON_SECONDS,
  );
  if (exact) return decorateCaption(scene, exact);

  // Final TTS/STT timestamps are floats while Remotion renders discrete frames. Tiny gaps at
  // cue boundaries otherwise become blank frames and look like dropped subtitles.
  const previous = [...captions]
    .reverse()
    .find((cue) => seconds >= cue.endSeconds && seconds - cue.endSeconds <= MAX_CAPTION_GAP_FILL_SECONDS);
  const next = captions.find(
    (cue) => cue.startSeconds > seconds && cue.startSeconds - seconds <= MAX_CAPTION_GAP_FILL_SECONDS,
  );

  const nearby = previous ?? next;
  return nearby ? decorateCaption(scene, nearby) : null;
};

const beatAt = (beats: TimedBeat[], seconds: number) =>
  [...beats].reverse().find((beat) => seconds + CAPTION_BOUNDARY_EPSILON_SECONDS >= beat.startSeconds) ?? null;

export function subtitleAt(scene: RenderScene, seconds: number) {
  if (scene.audioPath && scene.captions?.length) {
    // Final speech owns timing. Reconstruct the authored semantic beat boundaries on top of
    // that measured timeline so keyword/emphasis/delivery metadata is not lost.
    const measuredBeats = measuredBeatsFromCaptions(scene);
    if (measuredBeats?.length) return beatAt(measuredBeats, seconds);
    return captionAt(scene, seconds);
  }

  const beats = timedBeats(scene);
  if (beats.length) {
    // Beat subtitles intentionally stay visible through pauses until the next beat starts.
    return beatAt(beats, seconds);
  }

  return captionAt(scene, seconds);
}
