import test from 'node:test';
import assert from 'node:assert/strict';
import {REST_POSE, normalizePose, poseAt, envelopeAt, blinkAt, solveArm, ARM_LENGTHS} from '../src/presenter/rig.ts';

test('rig has bounded, finite controls and a closed-mouth rest pose', () => {
  assert.deepEqual(normalizePose(), REST_POSE);
  const p = normalizePose({headTilt: 999, leftHandX: 999, rightHandY: -999, mouthOpen: NaN, blink: 5});
  assert.equal(p.headTilt, 12); assert.equal(p.leftHandX, 350); assert.equal(p.rightHandY, 510);
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
  assert.equal(expected.rightHandY, 550);
  assert.equal(expected.leftHandY, REST_POSE.leftHandY);
  for (const t of [0, 1, 4, 6]) assert.equal(poseAt(t, options).rightHandY, 690);
  assert.ok(poseAt(1.2, options).rightHandY < 690);
  assert.ok(poseAt(1.2, options).rightHandY > 550);
});
test('IK preserves bone lengths even for unreachable or invalid targets', () => {
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  for (const side of ['left','right']) for (const target of [{x:295,y:545},{x:0,y:0},{x:1e6,y:1e6},{x:235,y:468},{x:NaN,y:Infinity}]) {
    const {shoulder,elbow,wrist} = solveArm(side,target);
    assert.ok(Math.abs(dist(shoulder,elbow)-ARM_LENGTHS.upper)<1e-8);
    assert.ok(Math.abs(dist(elbow,wrist)-ARM_LENGTHS.lower)<1e-8);
    assert.ok(dist(shoulder,wrist)<=228.000001);
  }
});
test('authored motion keeps elbows on their bend side and has no frame jumps', () => {
  const options = {cues:[{startSeconds:1,endSeconds:4.5,gesture:'explain'},{startSeconds:5,endSeconds:7.5,gesture:'present'}]};
  for (const side of ['left','right']) {
    let previous;
    for (let f=0;f<480;f++) {
      const p=poseAt(f/60,options), a=solveArm(side,{x:p[`${side}HandX`],y:p[`${side}HandY`]});
      const cross=(a.wrist.x-a.shoulder.x)*(a.elbow.y-a.shoulder.y)-(a.wrist.y-a.shoulder.y)*(a.elbow.x-a.shoulder.x);
      assert.ok(side==='left' ? cross>0 : cross<0);
      if(previous) assert.ok(Math.hypot(a.elbow.x-previous.x,a.elbow.y-previous.y)<12);
      previous=a.elbow;
    }
  }
});
test('blink and synthetic speech do not run when absent', () => {
  assert.equal(blinkAt(0), 0); assert.ok(blinkAt(2.71) > .99);
  assert.equal(blinkAt(2.9), 0);
  for (let f = 0; f < 240; f++) assert.equal(poseAt(f / 30).mouthOpen, 0);
});
