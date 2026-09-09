import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getTemplate, listTemplates, resolveTemplate, DEFAULT_TEMPLATE} from '../src/templates/registry.ts';
import {describeCandidate} from '../scripts/describe-candidates.mjs';

test('legacy manifests retain their renderer and explicit template takes precedence', () => {
  assert.equal(resolveTemplate({}).id, DEFAULT_TEMPLATE);
  for (const theme of ['monochrome-editorial', 'monochrome-editorial-dark']) assert.equal(resolveTemplate({style: {theme}}).renderer, 'editorial');
  assert.equal(resolveTemplate({style: {theme: DEFAULT_TEMPLATE, template: 'notebook-grid'}}).renderer, 'notebook');
  assert.throws(() => getTemplate('../../unknown'), /Unknown shorts template/);
  assert.throws(() => resolveTemplate({style: {template: 'unknown'}}), /Unknown/);
});
test('workflow selector matches registered templates and packaged assets exist', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/generate-shorts.yml', import.meta.url), 'utf8');
  const selector = workflow.split('      template:')[1].split('      candidate_count:')[0];
  const options = [...selector.matchAll(/- '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(options.sort(), listTemplates().map(t => t.id).sort());
  assert.match(workflow, /SHORTS_TEMPLATE: \$\{\{ inputs.template \}\}/);
  for (const t of listTemplates()) if (t.background) assert.ok(fs.existsSync(new URL(`../public/${t.background}`, import.meta.url)));
  const tape = fs.readFileSync(new URL('../public/templates/notebook-grid/tape.png', import.meta.url));
  assert.equal(tape[25], 6, 'PNG IHDR color type must be RGBA');
});
test('review Markdown identifies photo treatment instead of promising full bleed', () => {
  const result = describeCandidate({style: {template: 'notebook-grid'}, scenes: [{kind: 'photo', layout: 'photo-full-bleed', headline: '사진', narration: '', imageQuery: 'desk'}]}, 'candidate.json');
  assert.match(result, /반투명 테이프/);
  assert.match(result, /notebook-grid/);
  assert.doesNotMatch(result, /사진을 화면 전체에 배치/);
});
