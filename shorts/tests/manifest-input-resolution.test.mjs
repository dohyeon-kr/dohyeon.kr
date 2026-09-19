import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveManifestInput} from '../scripts/resolve-manifest-input.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const post = 'shorts/content/usecase-domain-repository-seolgyebuteo-dongsiseongggaji';

test('explicit candidate JSON remains unchanged', async () => {
  const manifest = `${post}/candidate-02.json`;
  const result = await resolveManifestInput(manifest, {repoRoot});
  assert.deepEqual(result, {manifest, recovered: false, reason: null});
});

test('post directory auto-recovers to candidate-01 when several candidates exist', async () => {
  const result = await resolveManifestInput(post, {repoRoot});
  assert.equal(result.manifest, `${post}/candidate-01.json`);
  assert.equal(result.recovered, true);
  assert.equal(result.reason, 'directory-default-candidate-01');
});

test('post directory with one JSON candidate auto-recovers that candidate', async (t) => {
  const dirname = `.manifest-resolution-${process.pid}-${Date.now()}`;
  const relativeDir = `shorts/content/${dirname}`;
  const absoluteDir = path.join(repoRoot, relativeDir);
  await fs.mkdir(absoluteDir, {recursive: true});
  await fs.writeFile(path.join(absoluteDir, 'candidate-07.json'), '{}\n');
  t.after(() => fs.rm(absoluteDir, {recursive: true, force: true}));

  const result = await resolveManifestInput(relativeDir, {repoRoot});
  assert.equal(result.manifest, `${relativeDir}/candidate-07.json`);
  assert.equal(result.recovered, true);
  assert.equal(result.reason, 'directory-single-json');
});

test('workflow uses resolved manifest and blocks dependent always-steps after resolution failure', async () => {
  const workflow = await fs.readFile(path.join(repoRoot, '.github/workflows/storyboard-shorts.yml'), 'utf8');
  assert.match(workflow, /node shorts\/scripts\/resolve-manifest-input\.mjs/);
  assert.match(workflow, /MANIFEST_INPUT: \$\{\{ steps\.manifests\.outputs\.manifest \}\}/);
  assert.match(workflow, /steps\.manifests\.outcome == 'success' && inputs\.engine == 'hyperframes'/);
  assert.match(workflow, /report 'manifest resolution' "\$MANIFEST_RESOLUTION_OUTCOME"/);
});
