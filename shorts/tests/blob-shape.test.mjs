import test from 'node:test';
import assert from 'node:assert/strict';
import {organicBlobPoints} from '../src/visuals/blob-shape.ts';

test('organic blob contour is deterministic and smooths as noiseAmount approaches zero', () => {
  const base = {width: 200, height: 200, blob: {seed: 42, amount: .28, points: 32, frequency: 2.4}};
  const roughA = organicBlobPoints({...base, noiseAmount: .28});
  const roughB = organicBlobPoints({...base, noiseAmount: .28});
  const smooth = organicBlobPoints({...base, noiseAmount: 0});
  assert.deepEqual(roughA, roughB);
  assert.equal(roughA.length, 32);
  const radii = smooth.map(([x, y]) => Math.hypot(x, y));
  assert.ok(radii.every(r => Math.abs(r - 100) < 1e-9));
  assert.ok(roughA.some(([x, y]) => Math.abs(Math.hypot(x, y) - 100) > 1));
});
