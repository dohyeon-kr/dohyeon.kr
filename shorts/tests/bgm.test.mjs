import test from 'node:test';
import assert from 'node:assert/strict';
import {musicGain, speechWindows, synthBgm, soundCues, addSoundEffects} from '../scripts/bgm.mjs';
test('ducking anticipates speech, recovers gently, and fades at boundaries', () => {
  const windows = [[2, 4]];
  assert.equal(musicGain(0, 8, windows), 0);
  assert.equal(musicGain(8, 8, windows), 0);
  // Keep narration ducking audible without suppressing most of the backing.
  assert.ok(musicGain(3, 8, windows) < musicGain(1, 8, windows));
  assert.ok(musicGain(3, 8, windows) > musicGain(1, 8, windows) / 2);
  assert.ok(musicGain(1.95, 8, windows) < musicGain(1, 8, windows));
  assert.ok(musicGain(4.1, 8, windows) < musicGain(5, 8, windows));
});

test('sound cues use frame-rounded scene starts and alter the PCM without changing length', () => {
  const cues = soundCues([{audioDurationSeconds: 2}, {audioDurationSeconds: 2, transition: 'fade', visual: {type: 'diagram'}}]);
  assert.ok(Math.abs(cues[0].time - (69 / 30 + .05)) < 1e-9);
  assert.equal(cues.length, 2);
  const wav = synthBgm(5, 'pulse-96');
  const mixed = addSoundEffects(wav, cues);
  assert.equal(mixed.length, wav.length);
  assert.notDeepEqual(mixed, wav);
  assert.deepEqual(mixed, addSoundEffects(wav, cues));
});
test('voice windows follow frame-rounded scene timing and ignore silent narration', () => {
  const scenes = [
    {audioPath: 'a.wav', audioDurationSeconds: 2, beatTimings: [{startSeconds: 0, endSeconds: .8}, {startSeconds: 1, endSeconds: 2}]},
    {audioPath: null, audioDurationSeconds: 2, narration: 'silent fixture'},
    {audioPath: 'b.wav', audioDurationSeconds: 1},
  ];
  const windows = speechWindows(scenes);
  assert.deepEqual(windows[0], [0, 2]);
  assert.equal(windows.length, 2);
  assert.ok(Math.abs(windows[1][0] - 138 / 30) < 1e-9);
});
test('built-in score is deterministic PCM, non-silent and bounded', () => {
  const wav = synthBgm(2, 'pulse-96');
  assert.deepEqual(wav, synthBgm(2, 'pulse-96'));
  assert.equal(wav.length, 44 + 96000 * 2);
  let peak = 0;
  for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
  assert.ok(peak > 500 && peak < 32767);
  assert.throws(() => synthBgm(2, 'unapproved-track'));
});
