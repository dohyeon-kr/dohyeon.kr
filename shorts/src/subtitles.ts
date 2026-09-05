import type {RenderScene, SubtitleBeat} from './types.ts';
const compactLength = (text: string) => text.replace(/\s/g, '').length;
type TimedBeat = SubtitleBeat & {startSeconds: number; endSeconds: number};

export const timedBeats = (scene: RenderScene): TimedBeat[] => {
  const beats = scene.beats?.filter((beat) => beat.text.trim()) ?? [];
  if (!beats.length) return [];
  if (scene.beatTimings?.length === beats.length) {
    return beats.map((beat, index) => ({...beat, ...scene.beatTimings![index]}));
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

export function subtitleAt(scene: RenderScene, seconds: number) {
  const beats = timedBeats(scene);
  if (beats.length) return [...beats].reverse().find(beat => seconds >= beat.startSeconds) ?? null;
  return scene.captions?.find(cue => seconds >= cue.startSeconds && seconds < cue.endSeconds) ?? null;
}

