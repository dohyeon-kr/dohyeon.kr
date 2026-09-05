import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {selectPreviewCandidates} from '../scripts/select-preview-candidates.mjs';

test('PR preview excludes historical, deleted and base-only candidates', async t => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'shorts-selection-'));
  t.after(() => fs.rm(cwd, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
  const write = async (name, contents = '{}') => {
    await fs.mkdir(path.dirname(path.join(cwd, name)), {recursive: true});
    await fs.writeFile(path.join(cwd, name), contents);
  };
  const commit = () => {git('add', '.'); git('commit', '-qm', 'fixture'); return git('rev-parse', 'HEAD');};
  const file = (slug, n = '01') => `shorts/content/${slug}/candidate-${n}.json`;
  git('init', '-q'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Test');
  for (const slug of ['historical', 'modified', 'deleted', 'renamed']) await write(file(slug), JSON.stringify({slug}));
  const base = commit();
  assert.deepEqual(selectPreviewCandidates(base, base, cwd), []);
  git('checkout', '-qb', 'feature');
  await write(file('modified'), '{"updated":true}');
  await write(file('새 후보'));
  await fs.rm(path.join(cwd, file('deleted')));
  git('mv', file('renamed'), file('renamed', '02'));
  await write('shorts/content/historical/README.md', 'updated notes');
  await write('shorts/content/historical/metadata.json');
  const head = commit();
  git('checkout', '--detach', base);
  await write(file('base-only'));
  const advancedBase = commit();
  assert.deepEqual(selectPreviewCandidates(advancedBase, head, cwd), [file('modified'), file('renamed', '02'), file('새 후보')].sort());
  await write('shorts/scripts/bgm.mjs', '// engine change');
  const engineHead = commit();
  assert.deepEqual(selectPreviewCandidates(advancedBase, engineHead, cwd), []);
  assert.throws(() => selectPreviewCandidates('', head, cwd), /full Git commit SHAs/);
});
