import test from 'node:test';
import assert from 'node:assert/strict';
import {REST_POSE, normalizePose, poseAt, envelopeAt, blinkAt} from '../src/presenter/rig.ts';

test('rig has bounded, finite controls and a closed-mouth rest pose', () => {
  assert.deepEqual(normalizePose(), REST_POSE);
  const p = normalizePose({headTilt: 999, leftElbow: 999, rightElbow: -999, mouthOpen: NaN, blink: 5});
  assert.equal(p.headTilt, 12); assert.equal(p.leftElbow, 65); assert.equal(p.rightElbow, -65);
  assert.equal(p.mouthOpen, 0); assert.equal(p.blink, 1);
});
test('audio envelope interpolation is silent outside its bounds', () => {
  const e = {sampleRate: 10, samples: [0, 1, 0]};
  assert.equal(envelopeAt(e, .05), .5);
  for (const t of [-1, .3, 10, NaN]) assert.equal(envelopeAt(e, t), 0);
  assert.equal(envelopeAt(undefined, 2), 0);
  assert.equal(envelopeAt({sampleRate: 0, samples: [1]}, 0), 0);
});
test('frame seeking is deterministic and gestures ease in and return to rest', () => {
  const options = {cues: [{startSeconds: 1, endSeconds: 4, gesture: 'explain'}]};
  const expected = poseAt(2, options);
  poseAt(3, options); poseAt(0, options);
  assert.deepEqual(poseAt(2, options), expected);
  assert.equal(expected.leftElbow, 60);
  for (const t of [0, 1, 4, 6]) assert.equal(poseAt(t, options).leftElbow, 0);
  assert.ok(poseAt(1.2, options).leftElbow > 0);
  assert.ok(poseAt(1.2, options).leftElbow < 60);
});
test('blink and synthetic speech do not run when absent', () => {
  assert.equal(blinkAt(0), 0); assert.ok(blinkAt(2.71) > .99);
  assert.equal(blinkAt(2.9), 0);
  for (let f = 0; f < 240; f++) assert.equal(poseAt(f / 30).mouthOpen, 0);
});
