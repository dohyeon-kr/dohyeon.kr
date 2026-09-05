import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveManifest, validateRevision, frameInput, ReviewSchema} from '../scripts/review-storyboard.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';

const scene = () => ({narration: '그럴 수 있다.', beats: [{text: '그럴 수 있다', keyword: '있다'}], camera: {startProgress: 0, endProgress: 1}, visual: {type: 'none'}});
test('accepts standard and extended scene counts only', () => {
  for (let count = 0; count <= 22; count++) {
    const candidate = {scenes: Array.from({length: count}, scene)};
    if ((count >= 6 && count <= 9) || (count >= 18 && count <= 21)) {
      assert.doesNotThrow(() => validateRevision(candidate), `${count} scenes`);
    } else {
      assert.throws(() => validateRevision(candidate), /Expected 6–9 or 18–21 scenes/, `${count} scenes`);
    }
  }
});
test('validates scenes beyond the standard count in extended revisions', () => {
  const candidate = {scenes: Array.from({length: 20}, scene)};
  candidate.scenes[19].beats[0].text = '그럴 수 없다';
  assert.throws(() => validateRevision(candidate), /Scene 20: narration\/beats mismatch/);
});
test('rejects traversal before reading candidate', async () => {
  for (const name of ['shorts/content/../candidate-01.json', '/etc/passwd', 'shorts/content/a/candidate-01.json\n']) {
    await assert.rejects(resolveManifest(name));
  }
});
test('requires exact narration coverage and valid motion', () => {
  const candidate = {scenes: Array.from({length: 6}, scene)};
  validateRevision(candidate);
  candidate.scenes[0].beats[0].text = '그럴 수 없다';
  assert.throws(() => validateRevision(candidate), /mismatch/);
  candidate.scenes[0] = scene();
  candidate.scenes[0].camera.endProgress = 0;
  assert.throws(() => validateRevision(candidate), /camera/);
});
test('includes all diagram phases and fails closed on missing frame', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-test-'));
  try {
    const folder = path.join(dir, 'post-candidate-01');
    await fs.mkdir(folder);
    for (const phase of ['-initial', '-change', '']) await fs.writeFile(path.join(folder, `post-candidate-01-scene-01${phase}.png`), 'image');
    const args = {manifest: 'shorts/content/post/candidate-01.json', frames: dir};
    const manifest = {id: 'candidate-01', scenes: [{diagramSpec: {}}]};
    const content = await frameInput(manifest, args);
    assert.equal(content.filter(x => x.type === 'input_image').length, 3);
    await fs.unlink(path.join(folder, 'post-candidate-01-scene-01-change.png'));
    await assert.rejects(frameInput(manifest, args));
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});
test('SDK can serialize both output schemas', () => {
  assert.equal(zodTextFormat(ReviewSchema, 'review').type, 'json_schema');
  assert.equal(zodTextFormat(CandidateSchema, 'candidate').type, 'json_schema');
});
