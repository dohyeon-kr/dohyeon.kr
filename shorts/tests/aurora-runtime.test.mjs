import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const shortsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(shortsRoot, '..');

const auroraManifest = () => ({
  schemaVersion: 3,
  id: 'candidate-01',
  status: 'candidate',
  source: {url: 'https://blog.dohyeon.kr/example', title: 'Example'},
  candidate: {
    angle: 'explain', hook: '요청은 어디로 흐를까요?', title: 'Aurora runtime fixture',
    rationale: 'runtime fixture', viralScore: 0, suggestedCaption: '', hashtags: [],
  },
  style: {
    theme: 'aurora-explain', template: 'aurora-explain', colorScheme: 'dark',
    subtitles: 'burned-in', safeArea: 'shorts-reels',
  },
  presenterOverlay: null,
  scenes: [
    {
      kind: 'diagram', layout: 'diagram-centered', headline: '요청은 어디로 흐를까요?',
      subline: '브라우저에서 저장소까지', narration: '브라우저의 요청은 서비스와 저장소를 거쳐 데이터베이스에 도착합니다.',
      imageQuery: null, comparisonLeft: null, comparisonRight: null, image: null,
      visual: {type: 'diagram', motif: 'request-flow', query: null, value: null, xLabel: null, yLabel: null},
      beats: [{text: '브라우저의 요청은 서비스와 저장소를 거칩니다.', emphasis: 'high', pauseAfterMs: 0, delivery: 'normal', visualPriority: 'high', keyword: '요청', visualCue: null}],
      diagramSpec: {
        objects: [
          {id: 'browser', role: 'browser', label: 'Browser'},
          {id: 'service', role: 'module', label: 'UseCase'},
          {id: 'db', role: 'datastore', label: 'DB'},
        ],
        connections: [
          {id: 'request', from: 'browser', to: 'service'},
          {id: 'persist', from: 'service', to: 'db'},
        ],
        steps: [
          {at: 0.2, action: 'activate', target: 'browser'},
          {at: 0.45, action: 'activate-connector', target: 'request'},
          {at: 0.7, action: 'activate', target: 'db'},
        ],
      },
    },
    {
      kind: 'statement', layout: 'statement-offset', headline: '상태와 책임의 경계를 정합니다.',
      subline: null, narration: '계층을 늘리는 것이 목적이 아니라 상태와 책임의 경계를 분명히 하는 것이 목적입니다.',
      imageQuery: null, comparisonLeft: null, comparisonRight: null, image: null,
      visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
      beats: [{text: '상태와 책임의 경계를 정합니다.', emphasis: 'high', pauseAfterMs: 0, delivery: 'hold', visualPriority: 'high', keyword: '경계', visualCue: null}],
    },
  ],
});

test('aurora-explain is a registered HyperFrames template', async () => {
  const source = await fs.readFile(path.join(shortsRoot, 'src', 'templates', 'registry.ts'), 'utf8');
  assert.match(source, /id:\s*'aurora-explain'/);
  assert.match(source, /id:\s*'aurora-explain'[\s\S]*?engine:\s*'hyperframes'/);
});

test('aurora-explain compiles through the shared HyperFrames entry point', async t => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.aurora-runtime-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `aurora-runtime-${suffix}`);
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
    ]);
  });

  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(auroraManifest()));
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'),
    path.relative(repoRoot, manifestPath),
    `--output=${path.relative(repoRoot, outputDir)}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  const timings = JSON.parse(await fs.readFile(path.join(outputDir, 'timings.json'), 'utf8'));
  assert.match(html, /data-composition-id="aurora-explain"/);
  assert.match(html, /class="ax-theme"/);
  assert.match(html, /class="ax-ambient/);
  assert.match(html, /class="ax-caption-zone/);
  assert.match(html, /data-ax-object="browser"/);
  assert.match(html, /data-ax-object="service"/);
  assert.match(html, /data-ax-object="db"/);
  assert.match(html, /data-ax-connection="request"/);
  assert.match(html, /class="ax-cta/);
  assert.doesNotMatch(html, /ml-presenter-overlay|presenter\.svg|ml-scene--common-cta/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|requestAnimationFrame|repeat:\s*-1/);
  assert.equal(timings.scenes.length, 3, 'two editorial scenes plus shared CTA should render');
});

test('shared storyboard and final workflows accept aurora-explain only on HyperFrames', async () => {
  for (const file of ['storyboard-shorts.yml', 'render-shorts.yml']) {
    const source = await fs.readFile(path.join(repoRoot, '.github', 'workflows', file), 'utf8');
    assert.match(source, /aurora-explain/);
    assert.match(source, /monoliquid-v2\|aurora-explain|monoliquid-v2.*aurora-explain/s);
  }
});
