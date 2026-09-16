import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {describeCandidate} from '../scripts/describe-candidates.mjs';

const directory = new URL('../content/insaengyeogjeoneul-baraneun-dangsin-roddoneun-sassnayo/', import.meta.url);

test('lottery readable storyboard matches the current candidate and excludes common CTA', async t => {
  const manifest = JSON.parse(await fs.readFile(new URL('candidate-01.json', directory), 'utf8'));
  const expected = describeCandidate(manifest, 'candidate-01.json');
  const actual = await fs.readFile(new URL('candidate-01.md', directory), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  if (actual !== expected) {
    // Print the canonical output on failure so remote editors can repair a stale companion.
    t.diagnostic(`GENERATED_STORYBOARD_START\n${expected}\nGENERATED_STORYBOARD_END`);
  }
  assert.ok(actual === expected, 'Run node shorts/scripts/describe-candidates.mjs shorts/content/insaengyeogjeoneul-baraneun-dangsin-roddoneun-sassnayo');
  assert.equal((expected.match(/^## \d+\./gm) ?? []).length, 9);
  assert.ok(!expected.includes('## 10.'), 'common ending is assembled, not reviewed as an authored scene');
});
