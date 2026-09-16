import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {withBlogCta} from '../scripts/blog-cta.mjs';

const shortsRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(shortsRoot, '..');

test('prepared captions do not turn a ten-scene reel into an oversized HTML composition', async t => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.hyperframes-captions-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `hyperframes-captions-${suffix}`);
  const preparedPath = path.join(shortsRoot, '.tmp', `hyperframes-captions-${suffix}.json`);
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.mkdir(path.dirname(preparedPath), {recursive: true});
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
      fs.rm(preparedPath, {force: true}),
    ]);
  });

  const candidate = {
    schemaVersion: 3,
    id: 'candidate-01',
    status: 'candidate',
    source: {url: 'https://blog.dohyeon.kr/example', title: 'Example'},
    candidate: {title: '자막 타이밍 회귀 검사'},
    presenterOverlay: {position: 'bottom-right', hideOnCommonCta: true, lipSync: 'none', nod: 'none'},
    style: {theme: 'monoliquid-v2', template: 'monoliquid-v2', colorScheme: 'dark'},
    scenes: Array.from({length: 9}, (_, index) => ({
      kind: 'statement',
      layout: 'statement-giant',
      headline: `구조를 확인합니다 ${index + 1}`,
      subline: '화면과 타이밍은 그대로 유지합니다',
      narration: '자막은 음성 타이밍에 맞춰 표시합니다.',
      visual: {type: 'none'},
      image: null,
    })),
  };
  const prepared = withBlogCta(structuredClone(candidate));
  for (const [index, scene] of prepared.scenes.slice(0, 9).entries()) {
    scene.audioDurationSeconds = 3.6;
    scene.captions = Array.from({length: 12}, (_, cueIndex) => ({
      text: `자막 ${index + 1}-${cueIndex + 1}`,
      startSeconds: 0.1 + cueIndex * 0.25,
      endSeconds: 0.3 + cueIndex * 0.25,
    }));
  }
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(candidate));
  await fs.writeFile(preparedPath, JSON.stringify(prepared));
  const build = () => spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'),
    path.relative(repoRoot, manifestPath),
    `--prepared=${path.relative(repoRoot, preparedPath)}`,
    `--output=${path.relative(repoRoot, outputDir)}`,
  ], {cwd: repoRoot, encoding: 'utf8'});
  const result = build();
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  const lineCount = html.split('\n').length;
  assert.ok(lineCount <= 300, `prepared HTML has ${lineCount} lines; caption animation code must not inflate the composition`);
  assert.match(html, /<script src="timeline\.js"><\/script>/);
  const timelineSource = await fs.readFile(path.join(outputDir, 'timeline.js'), 'utf8');
  const timings = JSON.parse(await fs.readFile(path.join(outputDir, 'timings.json'), 'utf8'));
  assert.equal(timings.scenes.length, 10, 'nine body scenes and exactly one shared CTA');
  assert.equal([...html.matchAll(/class="ml-caption"/g)].length, 108, 'all aligned captions remain in the DOM');
  assert.match(html, /ml-scene--common-cta/);

  // Execute emitted scripts in HTML order. A recording GSAP API verifies the
  // compiler's exact commands, not browser layout or interpolation.
  const calls = [];
  const timeline = {};
  for (const method of ['from', 'fromTo', 'to', 'set']) {
    timeline[method] = (...args) => {
      calls.push({method, args: JSON.parse(JSON.stringify(args))});
      return timeline;
    };
  }
  const context = vm.createContext({
    window: {},
    gsap: {timeline: options => {
      assert.equal(options.paused, true);
      return timeline;
    }},
  });
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = script[1].match(/\bsrc="([^"]+)"/)?.[1];
    if (src?.startsWith('https://')) continue;
    if (src) assert.equal(src, 'timeline.js');
    vm.runInContext(src ? timelineSource : script[2], context);
  }
  assert.equal(context.window.__timelines['monoliquid-v2'], timeline, 'the root paused timeline must still be registered');
  const expectedCaptions = [];
  for (const [index, scene] of prepared.scenes.slice(0, 9).entries()) {
    const timing = timings.scenes[index];
    for (const [cueIndex, cue] of scene.captions.entries()) {
      const selector = `#caption-${index}-${cueIndex}`;
      expectedCaptions.push({method: 'set', args: [selector, {opacity: 1}, Number((timing.startSeconds + cue.startSeconds).toFixed(3))]});
      expectedCaptions.push({method: 'set', args: [selector, {opacity: 0}, Number((timing.startSeconds + cue.endSeconds).toFixed(3))]});
    }
  }
  assert.deepEqual(calls.filter(call => call.args[0].startsWith('#caption-')), expectedCaptions);
  assert.ok(calls.some(call => call.method === 'fromTo' && call.args[0] === '#scene-10'), 'shared CTA dissolve is preserved');

  const second = build();
  assert.equal(second.status, 0, second.stderr || second.stdout);
  assert.equal(await fs.readFile(path.join(outputDir, 'index.html'), 'utf8'), html);
  assert.equal(await fs.readFile(path.join(outputDir, 'timeline.js'), 'utf8'), timelineSource);
});
