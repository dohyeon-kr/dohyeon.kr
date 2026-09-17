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
      kind: 'statement', layout: 'diagram-centered', headline: '요청은 어디로 흐를까요?',
      subline: '브라우저에서 저장소까지', narration: '브라우저의 요청은 서비스와 저장소를 거쳐 데이터베이스에 도착합니다.',
      imageQuery: null, comparisonLeft: null, comparisonRight: null, image: null,
      visual: {type: 'diagram', motif: 'request-flow', query: null, value: null, xLabel: null, yLabel: null},
      beats: [{text: '브라우저의 요청은 서비스와 저장소를 거칩니다.', emphasis: 'high', pauseAfterMs: 0, delivery: 'normal', visualPriority: 'high', keyword: '요청', visualCue: null}],
      diagramSpec: {
        version: 1,
        renderer: 'auto',
        physics: null,
        description: '브라우저 요청이 UseCase를 거쳐 DB에 저장되는 흐름',
        nodes: [
          {id: 'browser', shape: 'rect', label: 'Browser', x: 140, y: 280, width: 190, height: 140, fill: 'none', connector: null, strokeStyle: 'solid'},
          {id: 'service', shape: 'rect', label: 'UseCase', x: 400, y: 280, width: 190, height: 140, fill: 'none', connector: null, strokeStyle: 'solid'},
          {id: 'db', shape: 'rect', label: 'DB', x: 660, y: 280, width: 190, height: 140, fill: 'none', connector: null, strokeStyle: 'solid'},
          {id: 'request', shape: 'line', label: 'request', x: 270, y: 280, width: 70, height: 2, fill: 'none', connector: {source: 'browser', target: 'service', sourceSide: 'right', targetSide: 'left', gap: 12}, strokeStyle: 'solid'},
          {id: 'persist', shape: 'line', label: 'persist', x: 530, y: 280, width: 70, height: 2, fill: 'none', connector: {source: 'service', target: 'db', sourceSide: 'right', targetSide: 'left', gap: 12}, strokeStyle: 'solid'},
        ],
        events: [
          {target: 'request', property: 'opacity', from: 0, to: 1, start: 0.15, end: 0.35},
          {target: 'service', property: 'scale', from: 0.96, to: 1, start: 0.3, end: 0.5},
          {target: 'persist', property: 'opacity', from: 0, to: 1, start: 0.48, end: 0.68},
          {target: 'db', property: 'opacity', from: 0.5, to: 1, start: 0.62, end: 0.82},
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
  const css = await fs.readFile(path.join(outputDir, 'theme.css'), 'utf8');
  const timings = JSON.parse(await fs.readFile(path.join(outputDir, 'timings.json'), 'utf8'));
  assert.match(html, /data-composition-id="aurora-explain"/);
  assert.match(html, /class="ax-theme"/);
  assert.match(html, /class="ax-ambient/);
  assert.match(html, /class="ax-caption-zone/);
  assert.match(html, /data-ax-object="browser"/);
  assert.match(html, /data-ax-object="service"/);
  assert.match(html, /data-ax-object="db"/);
  assert.match(html, /data-ax-connection="request"[^>]*x1="17\.50%" y1="50\.00%" x2="50\.00%" y2="50\.00%"/);
  assert.match(html, /data-ax-pulse="request"/);
  assert.match(css, /\.ax-connector\{[^}]*stroke-width:2(?:px)?[;}]/);
  assert.match(css, /\.ax-connector-pulse\{/);
  assert.match(html, /class="ax-cta/);
  assert.match(html, /data-layout-allow-overflow/);
  assert.doesNotMatch(html, /ml-presenter-overlay|presenter\.svg|ml-scene--common-cta/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|requestAnimationFrame|repeat:\s*-1/);
  assert.equal(timings.scenes.length, 3, 'two editorial scenes plus shared CTA should render');
});

test('aurora strict layout rejects diagram nodes whose rendered boxes are too close', async t => {
  const suffix = `gap-${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.aurora-runtime-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `aurora-runtime-${suffix}`);
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
    ]);
  });

  const manifest = auroraManifest();
  manifest.scenes[0].diagramSpec.nodes.find(node => node.id === 'browser').x = 330;
  manifest.scenes[0].diagramSpec.nodes.find(node => node.id === 'service').x = 430;
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'),
    path.relative(repoRoot, manifestPath),
    `--output=${path.relative(repoRoot, outputDir)}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.notEqual(result.status, 0, 'strict Aurora geometry must reject crowded nodes');
  assert.match(`${result.stderr}\n${result.stdout}`, /\[aurora:node-gap\]/);
});

test('aurora strict layout rejects any rendered diagram box outside the Shorts safe area', async t => {
  const suffix = `safe-${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.aurora-runtime-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `aurora-runtime-${suffix}`);
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
    ]);
  });

  const manifest = auroraManifest();
  const browser = manifest.scenes[0].diagramSpec.nodes.find(node => node.id === 'browser');
  browser.x = 5;
  browser.width = 300;
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'),
    path.relative(repoRoot, manifestPath),
    `--output=${path.relative(repoRoot, outputDir)}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.notEqual(result.status, 0, 'strict Aurora geometry must reject safe-area escape');
  assert.match(`${result.stderr}\n${result.stdout}`, /\[aurora:safe-area\]/);
});

test('Aurora final audio preparation keeps the composition presenter-less', async () => {
  const source = await fs.readFile(path.join(shortsRoot, 'scripts', 'render.mjs'), 'utf8');
  assert.match(source, /const template = resolveTemplate\(manifest\)/);
  assert.match(source, /template\.id === 'aurora-explain'/);
  assert.match(source, /manifest\.presenterOverlay = null/);
  assert.match(source, /for \(const scene of manifest\.scenes\) scene\.presenter = null/);
});

test('shared storyboard and final workflows accept aurora-explain only on HyperFrames', async () => {
  for (const file of ['storyboard-shorts.yml', 'render-shorts.yml']) {
    const source = await fs.readFile(path.join(repoRoot, '.github', 'workflows', file), 'utf8');
    assert.match(source, /aurora-explain/);
    assert.match(source, /monoliquid-v2.*aurora-explain|aurora-explain.*monoliquid-v2/s);
  }
});
