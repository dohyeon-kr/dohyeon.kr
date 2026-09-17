import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowUrl = new URL('../../.github/workflows/aurora-explain-stills.yml', import.meta.url);

test('aurora still workflow renders three 1080x1920 Playwright screenshots to a release', () => {
  assert.equal(fs.existsSync(workflowUrl), true, 'aurora still workflow should exist');
  const source = fs.readFileSync(workflowUrl, 'utf8');
  assert.match(source, /workflow_dispatch:/);
  assert.match(source, /runs-on: ubuntu-latest/);
  assert.match(source, /playwright install --with-deps chromium/);
  assert.match(source, /render-aurora-stills\.mjs/);
  assert.match(source, /1080/);
  assert.match(source, /1920/);
  assert.match(source, /aurora-browser-terminal\.png/);
  assert.match(source, /aurora-glass-pipeline\.png/);
  assert.match(source, /aurora-cta\.png/);
  assert.match(source, /gh release/);
  assert.doesNotMatch(source, /upload-artifact/);
});
