import assert from 'node:assert/strict';
import test from 'node:test';
import {assertDiagramLayout, resolveConnectors, layoutSampleTimes} from '../src/visuals/layout-guard.ts';
import {nodeLabel} from '../src/visuals/node-layout.ts';
import {fitCopy} from '../src/text-layout.ts';
const node = (id, changes = {}) => ({id, shape: 'rect', label: '입력', x: 200, y: 200, width: 180, height: 100, fill: 'none', rotation: 0, scale: 1, opacity: 1, ...changes});
test('Korean multiline labels reserve padding and minimum size', () => {
  assert.ok(nodeLabel(node('a', {label: '받침 있는\n여러 줄', width: 240, height: 180})).fontSize >= 24);
  assert.throws(() => nodeLabel(node('small', {width: 30, height: 20})), /label-padding/);
  assert.throws(() => fitCopy('받침', 10, 10, 36), /text-overflow/);
});
test('legal separated labels pass; overlapping protection regions fail with IDs and time', () => {
  assert.doesNotThrow(() => assertDiagramLayout([node('a'), node('b', {x: 500})], .5));
  assert.throws(() => assertDiagramLayout([node('a'), node('b', {x: 220})], .37), /text-overlap.*t=0.370000.*a,b/);
});
test('hidden lines are legal; visible dot-like lines and transformed clipping fail', () => {
  const dot = node('line', {shape: 'line', label: '', width: 1, height: 1});
  assert.doesNotThrow(() => assertDiagramLayout([{...dot, opacity: 0}], 0));
  assert.throws(() => assertDiagramLayout([dot], .1), /line-dot/);
  assert.throws(() => assertDiagramLayout([node('rotated', {x: 100, rotation: 45})], .5), /safe-area/);
});
test('lines crossing text or filled objects fail, even when endpoints are outside', () => {
  const line = node('edge', {shape: 'line', label: '', width: 300, height: 1});
  assert.throws(() => assertDiagramLayout([line, node('text')], .5), /line-text/);
  assert.throws(() => assertDiagramLayout([line, node('box', {label: '', fill: 'white'})], .5), /line-object/);
});
test('filled objects cannot hide text; intentional unlabeled territory overlap is allowed', () => {
  assert.throws(() => assertDiagramLayout([node('text'), node('cover', {label: '', fill: 'gray'})], .5), /text-object/);
  assert.doesNotThrow(() => assertDiagramLayout([node('a', {label: '', fill: 'hatch'}), node('b', {label: ''})], .5));
});
test('connector follows translated, scaled and rotated anchors, suppresses hidden endpoints', () => {
  const edge = node('edge', {shape: 'line', label: '', connector: {source: 'a', target: 'b', sourceSide: 'right', targetSide: 'left', gap: 8}});
  const states = [node('a'), node('b', {x: 600}), edge];
  const first = resolveConnectors(states)[2];
  assert.equal(first.x, 400);
  assert.equal(first.width, 201);
  const moved = resolveConnectors([{...states[0], x: 230, rotation: 30, scale: 1.1}, states[1], edge])[2];
  assert.notEqual(moved.x, first.x);
  assert.notEqual(moved.rotation, 0);
  assert.equal(resolveConnectors([{...states[0], opacity: 0}, states[1], edge])[2].opacity, 0);
});
test('preflight includes short event boundaries and interior states beyond coarse sampling', () => {
  const times = layoutSampleTimes({events: [{start: .33331, end: .33339}]});
  assert.ok(times.includes(.33331));
  assert.ok(times.some(t => t > .33331 && t < .33339));
  assert.equal(times[0], 0); assert.equal(times.at(-1), 1);
});
