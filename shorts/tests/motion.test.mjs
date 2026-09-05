import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {zodTextFormat} from 'openai/helpers/zod';
import {effectState, transitionProgress, LightEffectSchema} from '../src/motion/schema.ts';
import {validateDiagramLayout} from '../src/visuals/physics.ts';
import {flowPoint} from '../src/motion/flow-path.ts';
import {validateSceneMotion} from '../src/motion/validate.ts';
import {light, motionScene, motionGalleryProps} from '../src/motion-preview.ts';
import {describeCandidate} from '../scripts/describe-candidates.mjs';
import {GeneratedLightEffectSchema, GeneratedTransitionOptionsSchema} from '../scripts/generated-motion-schema.mjs';

test('pulse uses elapsed time, fades at both boundaries and supports reverse seeking', () => {
  const effect = light('flow-glow', 'connection', {startMs: 1000, durationMs: 1000, intensity: .8});
  assert.equal(effectState(effect, 29, 30).active, false);
  assert.equal(effectState(effect, 30, 30).opacity, 0);
  assert.equal(effectState(effect, 45, 30).progress, .5);
  assert.equal(effectState(effect, 45, 30).opacity, .8);
  assert.equal(effectState(effect, 60, 30).active, false);
  assert.deepEqual(effectState(effect, 45, 30), effectState(effect, 90, 60));
  assert.equal(effectState({...effect, repeat: true}, 60, 30).opacity, 0);
  assert.equal(effectState(effect, 45, 30).progress, .5);
});
test('arc length sampling travels vertical, diagonal and multi-segment paths without speed jumps', () => {
  assert.deepEqual(flowPoint([[0,0], [0,100]], .25), [0,25]);
  assert.deepEqual(flowPoint([[0,0], [100,100]], .5), [50,50]);
  assert.deepEqual(flowPoint([[0,0], [30,0], [30,70]], .5), [30,20]);
  assert.deepEqual(flowPoint([[2,3], [2,3]], .5), [2,3]);
  assert.deepEqual(flowPoint([[0,0], [0,100]], 2), [0,100]);
});
test('short scenes and explicit zero durations end with exact identity', () => {
  assert.equal(transitionProgress(0, 30, 100), 0);
  assert.equal(transitionProgress(12, 30, 100), 1);
  assert.equal(transitionProgress(2, 30, 3, {durationMs: 1200}), 1);
  assert.equal(transitionProgress(0, 30, 100, {durationMs: 0}), 1);
});
test('catalog gallery passes runtime validation and unsupported targets fail before rendering', () => {
  motionGalleryProps.scenes.forEach((s, i) => validateSceneMotion(s, motionGalleryProps.scenes[i - 1]));
  motionGalleryProps.scenes.forEach(s => validateDiagramLayout(s.diagramSpec));
  for (const [type, target] of [['flow-glow','background'], ['flow-glow','result'], ['glow','missing'], ['glow','caption'], ['glow','photo'], ['bloom','background'], ['glint','result']]) {
    assert.throws(() => validateSceneMotion(motionScene({effects: [light(type, target)]})));
  }
  assert.throws(() => validateSceneMotion(motionScene({transition: 'unknown'})));
  assert.throws(() => LightEffectSchema.parse(light('glow', 'result', {intensity: 2})));
  assert.throws(() => LightEffectSchema.parse(light('glow', 'result', {durationMs: 0})));
});
test('match cut requires an existing geometrically matching target across adjacent diagrams', () => {
  const scene = motionScene({transition: 'match-cut', transitionOptions: {matchTarget: 'result'}});
  assert.doesNotThrow(() => validateSceneMotion(scene, motionScene()));
  assert.throws(() => validateSceneMotion(scene));
  const mismatched = structuredClone(scene); mismatched.diagramSpec.nodes.find(n => n.id === 'result').x += 20;
  assert.throws(() => validateSceneMotion(mismatched, motionScene()));
});
test('generation schema is strict and storyboard names effects and timing', () => {
  const format = zodTextFormat(z.object({effects: z.array(GeneratedLightEffectSchema), transitionOptions: GeneratedTransitionOptionsSchema.nullable()}), 'motion');
  const item = format.schema.properties.effects.items;
  assert.deepEqual([...item.required].sort(), Object.keys(item.properties).sort());
  const md = describeCandidate({...motionGalleryProps, scenes: [motionScene({transition: 'blur-dissolve'})]}, 'preview.json');
  assert.match(md, /블러 디졸브/);
  assert.match(md, /경로를 흐르는 빛/);
  assert.match(md, /700ms부터 1800ms/);
});
