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
        assert.match(body, /node --test/);
        assert.doesNotMatch(body, /remotion|render\.mjs|upload-artifact/);
      } else if (id === 'hyperframes-contract') {
        assert.match(body, /hyperframes@\$\{HYPERFRAMES_VERSION\}/);
        assert.doesNotMatch(body, /render --quality/);
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

test('automatic validation runs fast checks before installing media tools and isolates FFmpeg integration', () => {
  const body = jobs(workflow('shorts-check.yml')).find(([, id]) => id === 'validate')[2];
  assert.ok(body.includes('command -v ffmpeg'));
  assert.ok(body.includes('command -v ffprobe'));
  assert.ok(body.includes('sudo apt-get install -y ffmpeg'));
  const fast = body.indexOf("! -name 'video-background.test.mjs'");
  const install = body.indexOf('sudo apt-get install -y ffmpeg');
  const media = body.indexOf('node --test tests/video-background.test.mjs');
  assert.ok(fast >= 0 && install > fast && media > install);
  for (const check of ['ffmpeg -version', 'ffprobe -version']) assert.ok(body.indexOf(check) > install && body.indexOf(check) < media);
  assert.doesNotMatch(body, /generate_previews|remotion|render\.mjs|upload-artifact/);
});
