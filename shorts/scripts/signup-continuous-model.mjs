import {withBlogCta, BLOG_CTA_ID} from './blog-cta.mjs';
import {captionsFromBeatTimings, estimatedBeatTimings} from './caption-alignment.mjs';

export const SIGNUP_COMPOSITION = 'signup-phone-number-input-v2';
export const SCENE_TAIL = .28;
export const compact = text => String(text ?? '').replace(/\s+/g, ' ').trim();
export const normalized = text => compact(text).replace(/\s/g, '');
const cues = ['phone-input-basic', 'checklist-purpose', 'otp-input', 'phone-input-error',
  'checklist-contract', 'checklist-legacy', 'phone-input-verified'];

export function isSignupComposition(candidate) {
  return candidate.scenes?.[0]?.visual?.motif === SIGNUP_COMPOSITION;
}

export function validateAlignedScene(scene) {
  if (normalized(scene.narration) !== normalized(scene.beats?.map(b => b.text).join(' '))) {
    throw new Error('Narration and beats differ; do not reuse unrelated speech.');
  }
  if (!Number.isFinite(scene.audioDurationSeconds) || scene.audioDurationSeconds <= 0) {
    throw new Error('Prepared audioDurationSeconds is required.');
  }
  if (!Array.isArray(scene.beatTimings) || scene.beatTimings.length !== scene.beats.length) {
    throw new Error('One measured timing per beat is required.');
  }
  let previous = 0;
  for (const timing of scene.beatTimings) {
    if (!Number.isFinite(timing.startSeconds) || !Number.isFinite(timing.endSeconds) ||
        timing.startSeconds < previous - .001 || timing.endSeconds <= timing.startSeconds ||
        timing.endSeconds > scene.audioDurationSeconds + .001) {
      throw new Error('Prepared beat timings overlap or exceed the audio duration.');
    }
    previous = timing.endSeconds;
  }
}

export function resolveSignupModel(candidate, prepared) {
  if (!isSignupComposition(candidate) || (candidate.style?.template ?? candidate.style?.theme) !== 'aurora-explain') {
    throw new Error('The signup composition requires an explicit aurora-explain signup motif.');
  }
  const authored = withBlogCta(candidate);
  if (authored.scenes.length !== 2 || authored.scenes[0].beats?.length !== cues.length ||
      authored.scenes[0].beats.some((b, i) => b.visualCue !== cues[i])) {
    throw new Error('Signup v2 requires the seven supported semantic beats in order.');
  }
  const manifest = structuredClone(prepared ?? authored);
  if (manifest.scenes.length !== 2 || manifest.scenes[1].commonPage !== BLOG_CTA_ID) {
    throw new Error('Prepared manifest must contain one body and the shared blog CTA.');
  }
  for (let i = 0; i < 2; i++) {
    const scene = manifest.scenes[i], expected = authored.scenes[i];
    if (normalized(scene.narration) !== normalized(expected.narration) ||
        JSON.stringify(scene.beats?.map(b => compact(b.text))) !== JSON.stringify(expected.beats.map(b => compact(b.text)))) {
      throw new Error(`Prepared scene ${i + 1} does not match candidate text; reuse/edit audio first.`);
    }
    if (!prepared) {
      scene.audioDurationSeconds = i === 0 ? Math.max(32, normalized(scene.narration).length / 10) : 6;
      scene.beatTimings = estimatedBeatTimings(scene.beats, i === 0 ? scene.audioDurationSeconds : 3);
      scene.audioPath = null;
    } else if (!scene.audioPath) throw new Error('Prepared speech is missing; use the explicit silent preview without --prepared.');
    validateAlignedScene(scene);
    // The same cues are written to the HTML and the existing release-sidecar manifest.
    scene.captions = captionsFromBeatTimings(scene.beats, scene.beatTimings, {phraseLevel: true});
    if (normalized(scene.captions.map(c => c.text).join(' ')) !== normalized(scene.narration)) {
      throw new Error('Caption text does not preserve narration.');
    }
  }
  const bodyEnd = manifest.scenes[0].audioDurationSeconds + SCENE_TAIL;
  const duration = bodyEnd + Math.max(6, manifest.scenes[1].audioDurationSeconds) + SCENE_TAIL;
  return {manifest, duration, bodyEnd, beats: manifest.scenes[0].beatTimings,
    captions: manifest.scenes[0].captions.map(c => [c.startSeconds, c.endSeconds, c.text]),
    timingSource: prepared ? (prepared.audioReuse?.timingSource ?? 'prepared-beat-timings') : 'estimated-silent-preview'};
}

// Only deletions of complete, text-identical beats are safe without generating speech.
// No arbitrary changed sentence is ever paired with old audio.
export function planBeatDeletion(source, target) {
  validateAlignedScene(source);
  if (normalized(target.narration) !== normalized(target.beats?.map(b => b.text).join(' '))) throw new Error('Target narration/beat mismatch.');
  const retained = [];
  let cursor = 0;
  for (const beat of target.beats) {
    const index = source.beats.findIndex((b, i) => i >= cursor && compact(b.text) === compact(beat.text));
    if (index < 0) throw new Error('Audio reuse supports exact beat deletions only; changed/reordered text requires matching cached speech or explicitly approved TTS.');
    retained.push(index); cursor = index + 1;
  }
  if (!retained.length) throw new Error('Cannot remove all narration.');
  const removed = source.beats.flatMap((_, i) => retained.includes(i) ? [] : [{
    start: source.beatTimings[i].startSeconds,
    end: source.beatTimings[i + 1]?.startSeconds ?? source.audioDurationSeconds,
  }]);
  const cuts = [];
  for (const cut of removed) {
    if (cuts.length && Math.abs(cuts.at(-1).end - cut.start) < .001) cuts.at(-1).end = cut.end;
    else cuts.push({...cut});
  }
  const shift = t => t - cuts.reduce((sum, cut) => sum + Math.max(0, Math.min(t, cut.end) - cut.start), 0);
  const keep = []; let start = 0;
  for (const cut of cuts) {if (cut.start > start) keep.push({start, end: cut.start}); start = cut.end;}
  if (start < source.audioDurationSeconds) keep.push({start, end: source.audioDurationSeconds});
  return {cuts, keep, retained, audioDurationSeconds: shift(source.audioDurationSeconds),
    beatTimings: retained.map(i => ({startSeconds: shift(source.beatTimings[i].startSeconds), endSeconds: shift(source.beatTimings[i].endSeconds)}))};
}
