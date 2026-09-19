import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {motionFrameNames, pathExists} from '../scripts/storyboard-assets.mjs';

test('motion storyboard frames are optional and require a complete pair', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'storyboard-assets-'));
  try {
    const stem = 'candidate-scene-01';
    assert.deepEqual(await motionFrameNames(directory, stem), []);

    await fs.writeFile(path.join(directory, `${stem}-initial.png`), 'initial');
    assert.deepEqual(await motionFrameNames(directory, stem), []);

    await fs.writeFile(path.join(directory, `${stem}-change.png`), 'change');
    assert.deepEqual(
      await motionFrameNames(directory, stem),
      [`${stem}-initial.png`, `${stem}-change.png`],
    );

    assert.equal(await pathExists(path.join(directory, 'missing.png')), false);
  } finally {
    await fs.rm(directory, {recursive: true, force: true});
  }
});
