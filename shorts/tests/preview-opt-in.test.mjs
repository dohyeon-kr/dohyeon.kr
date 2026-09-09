import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = name => fs.readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8');
const jobs = source => [...source.split('\njobs:\n')[1].matchAll(/^  ([\w-]+):\n([\s\S]*?)(?=^  [\w-]+:\n|$(?![\s\S]))/gm)];
const guard = "if: github.event_name == 'workflow_dispatch' && inputs.generate_previews";

for (const name of ['shorts-check.yml', 'storyboard-shorts.yml', 'shorts-template-preview.yml']) {
  test(`${name}: preview jobs require manual checkbox opt-in`, () => {
    const source = workflow(name);
    assert.match(source, /  workflow_dispatch:\n    inputs:\n      generate_previews:\n        description: [^\n]+\n        type: boolean\n        default: false/);
    const all = jobs(source);
    assert.ok(all.length > 0);
    for (const [, id, body] of all) {
      if (id === 'validate') {
        assert.match(body, /npm run typecheck/);
        assert.match(body, /npm test/);
        assert.doesNotMatch(body, /remotion|render\.mjs|upload-artifact/);
      } else assert.ok(body.includes(guard), `${id} must be guarded`);
    }
    if (name !== 'shorts-check.yml') assert.doesNotMatch(source.split('\npermissions:')[0], /  (push|pull_request|workflow_run):/);
    else assert.match(source, /types: \[opened, synchronize, reopened\]/);
  });
}

test('candidate preview selects a validated manual manifest, not PR checkboxes', () => {
  const source = workflow('shorts-check.yml');
  const candidate = jobs(source).find(([, id]) => id === 'candidate-review')[2];
  assert.ok(candidate.includes("inputs.manifest != ''"));
  assert.ok(candidate.includes('await validateSelection([manifest])'));
  assert.doesNotMatch(source, /select-preview-candidates\.mjs|github\.event\.pull_request/);
});
