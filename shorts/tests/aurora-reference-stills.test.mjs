import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const htmlUrl = new URL('../hyperframes/aurora-explain/reference-stills.html', import.meta.url);
const cssUrl = new URL('../hyperframes/aurora-explain/reference-stills.css', import.meta.url);

const html = fs.readFileSync(htmlUrl, 'utf8');
const css = fs.readFileSync(cssUrl, 'utf8');

test('aurora browser still uses recognizable browser chrome details', () => {
  assert.match(html, /class="window-controls"/);
  assert.match(html, /class="browser-toolbar"/);
  assert.match(html, /class="address-bar"/);
  assert.match(html, /class="browser-favicon"/);
  assert.match(html, /aria-label="뒤로"/);
  assert.match(html, /aria-label="앞으로"/);
});

test('aurora pipeline uses a consistent SVG icon system instead of glyph placeholders', () => {
  assert.doesNotMatch(html, />◫</);
  assert.match(html, /class="node-visual browser-glyph"/);
  assert.match(html, /class="node-visual cache-glyph"/);
  assert.match(html, /class="node-visual server-glyph"/);
  assert.match(css, /\.node-visual\{/);
  assert.match(css, /\.glyph-shell\{/);
});
