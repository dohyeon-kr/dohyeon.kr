import test from 'node:test';
import assert from 'node:assert/strict';
import {physicsExample} from '../src/visuals/physics-example.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {evaluatedDiagramState, selectDiagramEngine} from '../src/visuals/physics.ts';

test('automatic routing respects explicit overrides', () => {
  assert.equal(selectDiagramEngine(physicsExample), 'motion-canvas');
  assert.equal(selectDiagramEngine({...physicsExample, physics: null}), 'remotion');
  assert.equal(selectDiagramEngine({...physicsExample, renderer: 'remotion'}), 'remotion');
});
test('physics collision, pin and reverse/out-of-order seeking are deterministic', () => {
  const spec = validateDiagram(physicsExample);
  const start = evaluatedDiagramState(spec, 0);
  const end = evaluatedDiagramState(spec, 1);
  const middle = evaluatedDiagramState(spec, .5);
  assert.deepEqual(evaluatedDiagramState(spec, 0), start);
  assert.deepEqual(evaluatedDiagramState(spec, 1), end);
  assert.deepEqual(evaluatedDiagramState(spec, .5), middle);
  const beam = end.find(n => n.id === 'beam');
  assert.ok(Math.abs(beam.rotation) > 5, 'falling weight must rotate the beam');
  assert.ok(Math.hypot(beam.x - 400, beam.y - 330) < 2, 'pivot stays anchored');
  assert.ok(end.find(n => n.id === 'weight').y < 510, 'floor stops the weight');
  assert.deepEqual(end, evaluatedDiagramState({...spec, renderer: 'remotion'}, 1));
});
test('reject unknown/duplicate bodies, ellipses, pins and transform conflicts', () => {
  for (const mutate of [
    s => s.physics.bodies[0].target = 'missing',
    s => s.physics.bodies.push({...s.physics.bodies[0]}),
    s => s.nodes[1].height = 90,
    s => s.physics.pins[0].target = 'floor',
    s => s.physics.seconds = 100,
    s => s.events.push({target: 'beam', property: 'rotation', from: 0, to: 30, start: 0, end: 1}),
  ]) {
    const spec = structuredClone(physicsExample); mutate(spec);
    assert.throws(() => validateDiagram(spec));
  }
});
