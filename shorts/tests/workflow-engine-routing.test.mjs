import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowsRoot = new URL('../../.github/workflows/', import.meta.url);
const workflow = name => fs.readFileSync(new URL(name, workflowsRoot), 'utf8');

const assertEngineChoice = source => {
  assert.match(source, /      engine:\n        description: [^\n]+\n        required: true\n        default: remotion\n        type: choice\n        options:\n          - remotion\n          - hyperframes/);
};

test('storyboard workflow selects Remotion or HyperFrames from one manual workflow', () => {
  const source = workflow('storyboard-shorts.yml');
  assertEngineChoice(source);
  assert.match(source, /inputs\.engine == 'remotion'/);
  assert.match(source, /inputs\.engine == 'hyperframes'/);
  assert.match(source, /node shorts\/scripts\/render\.mjs .* --storyboard/);
  assert.match(source, /node shorts\/scripts\/build-hyperframes\.mjs/);
  assert.match(source, /hyperframes@\$\{HYPERFRAMES_VERSION\}.*render --quality draft/s);
  assert.match(source, /extract-hyperframes-storyboard\.mjs/);
  assert.match(source, /publish-storyboard\.mjs/);
});

test('final render workflow selects Remotion or HyperFrames from one manual workflow', () => {
  const source = workflow('render-shorts.yml');
  assertEngineChoice(source);
  assert.match(source, /inputs\.engine == 'remotion'/);
  assert.match(source, /inputs\.engine == 'hyperframes'/);
  assert.match(source, /render-reels\.mjs/);
  assert.match(source, /build-hyperframes\.mjs .*--prepared=/s);
  assert.match(source, /hyperframes@\$\{HYPERFRAMES_VERSION\}.*render --quality high/s);
  assert.match(source, /mix-hyperframes-bgm\.mjs/);
  assert.match(source, /write-hyperframes-release-assets\.mjs/);
  assert.match(source, /publish-video-release\.mjs/);
});

test('the dedicated HyperFrames workflow is removed after engine routing is unified', () => {
  assert.equal(fs.existsSync(new URL('hyperframes-shorts.yml', workflowsRoot)), false);
});
