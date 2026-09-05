import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {START, END, selectedCandidates, validateSelection} from '../scripts/candidate-selection.mjs';
const name = 'shorts/content/post/candidate-03.json';
const block = content => `${START}\n${content}\n${END}`;
test('no selection never falls back to all candidates', () => {
  assert.deepEqual(selectedCandidates('legacy PR body'), []);
  assert.deepEqual(selectedCandidates(block(`- [ ] \`${name}\``)), []);
  assert.deepEqual(selectedCandidates(`- [x] \`${name}\``), []);
});
test('only checked entries inside the block are selected, deduplicated', () => {
  assert.deepEqual(selectedCandidates(block(`- [ ] \`shorts/content/post/candidate-01.json\`\n- [x] \`${name}\`\n- [X] \`${name}\``)), [name]);
});
test('malformed blocks and unsafe paths fail closed', () => {
  for (const body of [START, END + START, block('') + block(''), block('- [x] `shorts/content/../candidate-03.json`'), block('- [x] `../../secret.json`'), block('- [x] broken')]) {
    assert.throws(() => selectedCandidates(body));
  }
});
test('selection checks existence, JSON scenes and symlink containment', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-selection-'));
  try {
    await fs.mkdir(path.join(root, 'shorts/content/post'), {recursive: true});
    await fs.writeFile(path.join(root, name), JSON.stringify({scenes: [{}]}));
    assert.deepEqual(await validateSelection([name], root), [name]);
    await assert.rejects(validateSelection(['shorts/content/post/candidate-04.json'], root));
    await fs.writeFile(path.join(root, name), '{}');
    await assert.rejects(validateSelection([name], root));
    await fs.writeFile(path.join(root, 'outside.json'), JSON.stringify({scenes: [{}]}));
    await fs.unlink(path.join(root, name));
    await fs.symlink(path.join(root, 'outside.json'), path.join(root, name));
    await assert.rejects(validateSelection([name], root), /escapes/);
  } finally { await fs.rm(root, {recursive: true, force: true}); }
});

test('merged PR selection produces only selected manifests and empty selection produces zero', async () => {
  const {execFileSync} = await import('node:child_process');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-merged-selection-'));
  const script = fileURLToPath(new URL('../scripts/candidate-selection.mjs', import.meta.url));
  try {
    await fs.mkdir(path.join(root, 'shorts/content/post'), {recursive: true});
    for (const id of ['01', '02', '03']) await fs.writeFile(path.join(root, `shorts/content/post/candidate-${id}.json`), JSON.stringify({scenes: [{}]}));
    const eventPath = path.join(root, 'event.json');
    const output = path.join(root, 'output.txt');
    const env = {...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: output, RUNNER_TEMP: root, GITHUB_STEP_SUMMARY: path.join(root, 'summary.md')};
    await fs.writeFile(eventPath, JSON.stringify({pull_request: {merged: true, body: block(`- [x] \`${name}\``)}}));
    execFileSync(process.execPath, [script], {cwd: root, env});
    assert.equal(await fs.readFile(path.join(root, 'shorts-selected-candidates.txt'), 'utf8'), name + '\n');
    assert.match(await fs.readFile(output, 'utf8'), /count=1/);
    await fs.writeFile(eventPath, JSON.stringify({pull_request: {merged: true, body: ''}}));
    execFileSync(process.execPath, [script], {cwd: root, env});
    assert.equal(await fs.readFile(path.join(root, 'shorts-selected-candidates.txt'), 'utf8'), '');
    assert.match(await fs.readFile(output, 'utf8'), /count=0/);
    execFileSync(process.execPath, [script, 'body', 'shorts/content/post', path.join(root, 'body.md')], {cwd: root, env});
    const body = await fs.readFile(path.join(root, 'body.md'), 'utf8');
    assert.equal((body.match(/- \[ \]/g) || []).length, 3);
    assert.deepEqual(selectedCandidates(body), []);
    assert.deepEqual(selectedCandidates(body.replace(`- [ ] \`${name}\``, `- [x] \`${name}\``)), [name]);
  } finally { await fs.rm(root, {recursive: true, force: true}); }
});
