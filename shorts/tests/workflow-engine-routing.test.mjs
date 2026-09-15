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

test('storyboard workflow batches recoverable HyperFrames failures before failing once at the end', () => {
  const source = workflow('storyboard-shorts.yml');
  for (const id of ['hyperframes_build', 'hyperframes_lint', 'hyperframes_check', 'hyperframes_render', 'hyperframes_compact', 'hyperframes_extract', 'package']) {
    assert.match(source, new RegExp(`id: ${id}\\n(?:[\\s\\S]*?\\n){0,4}        continue-on-error: true`), `${id} should continue after failure`);
  }
  assert.match(source, /name: HyperFrames visual check[\s\S]*?if: always\(\) && inputs\.engine == 'hyperframes'/);
  assert.match(source, /name: Render draft HyperFrames motion preview[\s\S]*?if: always\(\) && inputs\.engine == 'hyperframes' && steps\.hyperframes_build\.outcome == 'success'/);
  assert.doesNotMatch(source, /render --quality draft --fps 30 --output preview\.mp4 --strict/);
  assert.match(source, /HYPERFRAMES_CHECK_OUTCOME: \$\{\{ steps\.hyperframes_check\.outcome \}\}/);
  assert.match(source, /HYPERFRAMES_RENDER_OUTCOME: \$\{\{ steps\.hyperframes_render\.outcome \}\}/);
  assert.match(source, /Storyboard failed after batch diagnostics/);
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
