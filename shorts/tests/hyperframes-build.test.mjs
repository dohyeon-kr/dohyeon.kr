import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const shortsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(shortsRoot, '..');

test('monoliquid-v2 compiles candidate JSON to deterministic HyperFrames HTML', async t => {
  const fixtureDir = path.join(shortsRoot, 'content', `.hyperframes-test-${process.pid}-${Date.now()}`);
  const outputDir = path.join(shortsRoot, '.tmp', `hyperframes-test-${process.pid}-${Date.now()}`);
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
    ]);
  });

  const manifest = {
    schemaVersion: 3,
    id: 'candidate-01',
    status: 'candidate',
    source: {url: 'https://blog.dohyeon.kr/example', title: 'Example'},
    candidate: {
      angle: 'reframe', hook: '구조가 먼저다', title: '자동화보다 구조', rationale: 'compiler fixture',
      viralScore: 0, suggestedCaption: '', hashtags: [],
    },
    style: {
      theme: 'monoliquid-v2', template: 'monoliquid-v2', subtitles: 'burned-in', safeArea: 'shorts-reels',
    },
    scenes: [{
      kind: 'statement', layout: 'statement-giant', headline: '자동화보다 구조', subline: '누락을 줄이는 흐름',
      narration: '자동화는 시간을 아끼기 전에 누락을 줄이는 구조를 만듭니다.', imageQuery: null,
      comparisonLeft: null, comparisonRight: null, image: null,
      visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
      beats: [{text: '누락을 줄이는 구조', emphasis: 'high', pauseAfterMs: 0, delivery: 'hold', visualPriority: 'high', keyword: '구조', visualCue: null}],
    }],
  };
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const relativeManifest = path.relative(repoRoot, manifestPath);
  const relativeOutput = path.relative(repoRoot, outputDir);
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'), relativeManifest, `--output=${relativeOutput}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  const timings = JSON.parse(await fs.readFile(path.join(outputDir, 'timings.json'), 'utf8'));
  assert.match(html, /data-composition-id="monoliquid-v2"/);
  assert.match(html, /window\.__timelines\["monoliquid-v2"\] = tl/);
  assert.match(html, /자동화보다 구조/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|repeat:\s*-1/);
  assert.ok(timings.scenes.length >= 2, 'shared blog CTA should be part of compiled preview');
  assert.ok(timings.totalDurationSeconds > 0);
});
