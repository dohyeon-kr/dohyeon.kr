import type {RenderScene, SubtitleBeat} from './types.ts';

const compactLength = (text: string) => text.replace(/\s/g, '').length;
const CAPTION_BOUNDARY_EPSILON_SECONDS = 1 / 30;
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
  if (exact) return exact;

  // Final TTS/STT timestamps are floats while Remotion renders discrete frames. Tiny gaps at
  // cue boundaries otherwise become 1-4 blank frames and look like dropped subtitles.
  const previous = [...captions]
    .reverse()
    .find((cue) => seconds >= cue.endSeconds && seconds - cue.endSeconds <= MAX_CAPTION_GAP_FILL_SECONDS);
  const next = captions.find(
    (cue) => cue.startSeconds > seconds && cue.startSeconds - seconds <= MAX_CAPTION_GAP_FILL_SECONDS,
  );

  return previous ?? next ?? null;
};

export function subtitleAt(scene: RenderScene, seconds: number) {
  // Once final speech exists, captions are built from the same measured word timestamps as
  // the TTS presenter alignment. They are the source of truth over editorial beat estimates.
  if (scene.audioPath && scene.captions?.length) return captionAt(scene, seconds);

  const beats = timedBeats(scene);
  if (beats.length) {
    // Beat subtitles intentionally stay visible through pauses until the next beat starts.
    return [...beats].reverse().find((beat) => seconds + CAPTION_BOUNDARY_EPSILON_SECONDS >= beat.startSeconds) ?? null;
  }

  return captionAt(scene, seconds);
}
