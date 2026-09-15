import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const shortsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(shortsRoot, '..');

const fixtureScene = index => ({
  kind: 'statement',
  layout: 'statement-giant',
  headline: `자동화보다 구조 ${index + 1}`,
  subline: '누락을 줄이는 흐름',
  narration: '자동화는 시간을 아끼기 전에 누락을 줄이는 구조를 만듭니다.',
  imageQuery: null,
  comparisonLeft: null,
  comparisonRight: null,
  image: null,
  visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
  beats: [{text: '누락을 줄이는 구조', emphasis: 'high', pauseAfterMs: 0, delivery: 'hold', visualPriority: 'high', keyword: '구조', visualCue: null}],
});

const candidateManifest = scenes => ({
  schemaVersion: 3,
  id: 'candidate-01',
  status: 'candidate',
  presenterOverlay: {position: 'bottom-right', hideOnCommonCta: true, lipSync: 'none', nod: 'none'},
  source: {url: 'https://blog.dohyeon.kr/example', title: 'Example'},
  candidate: {
    angle: 'reframe', hook: '구조가 먼저다', title: '자동화보다 구조', rationale: 'compiler fixture',
    viralScore: 0, suggestedCaption: '', hashtags: [],
  },
  style: {
    theme: 'monoliquid-v2', template: 'monoliquid-v2', colorScheme: 'dark', subtitles: 'burned-in', safeArea: 'shorts-reels',
  },
  scenes,
});

test('monoliquid-v2 compiles candidate JSON to deterministic HyperFrames HTML', async t => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.hyperframes-test-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `hyperframes-test-${suffix}`);
  const publicImageName = `.hyperframes-test-${suffix}.svg`;
  const publicImagePath = path.join(shortsRoot, 'public', publicImageName);
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.writeFile(publicImagePath, '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="black"/></svg>');
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
      fs.rm(publicImagePath, {force: true}),
    ]);
  });

  const scenes = Array.from({length: 10}, (_, index) => fixtureScene(index));
  scenes[0] = {
    ...scenes[0],
    kind: 'photo',
    layout: 'photo-full-bleed',
    imagePath: publicImageName,
    visual: {type: 'photo', motif: 'test-photo', query: null, value: null, xLabel: null, yLabel: null},
  };

  const manifest = candidateManifest(scenes);
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const relativeManifest = path.relative(repoRoot, manifestPath);
  const relativeOutput = path.relative(repoRoot, outputDir);
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'), relativeManifest, `--output=${relativeOutput}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  const themeCss = await fs.readFile(path.join(outputDir, 'theme.css'), 'utf8');
  const timings = JSON.parse(await fs.readFile(path.join(outputDir, 'timings.json'), 'utf8'));
  await fs.access(path.join(outputDir, 'presenter.svg'));
  assert.match(html, /data-composition-id="monoliquid-v2"/);
  assert.match(html, /class="ml-theme--dark"/);
  assert.match(html, /ml-scene--fullbleed/);
  assert.match(html, /ml-fullbleed-image/);
  assert.match(html, /ml-presenter-overlay/);
  assert.match(html, /class="ml-content" data-layout-allow-overflow/);
  assert.doesNotMatch(html, /<img[^>]+src="presenter\.svg"/);
  assert.match(themeCss, /\.ml-presenter-overlay\s*\{[^}]*url\("\.\/presenter\.svg"\)/s);
  assert.match(themeCss, /\.ml-caption-zone\s*\{[^}]*min-height:\s*210px/s);
  assert.match(html, /window\.__timelines\["monoliquid-v2"\] = tl/);
  assert.match(html, /자동화보다 구조/);
  assert.doesNotMatch(html, /Math\.random|Date\.now|repeat:\s*-1/);
  assert.ok(timings.scenes.length >= 11, 'ten fixture scenes plus shared blog CTA should be compiled');
  assert.ok(timings.totalDurationSeconds > 0);

  const visualTracks = [...html.matchAll(/<section[^>]+class="clip ml-scene[^>]+data-track-index="(\d+)"/g)].map(match => Number(match[1]));
  assert.equal(visualTracks.length, timings.scenes.length, 'every visual scene should declare a track');
  assert.equal(new Set(visualTracks).size, visualTracks.length, 'dense storyboards should distribute visual scenes across tracks');
});

test('monoliquid-v2 emits prepared background video as a root-level HyperFrames clip', async t => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.hyperframes-video-test-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `hyperframes-video-test-${suffix}`);
  const preparedPath = path.join(shortsRoot, '.tmp', `.hyperframes-video-test-${suffix}.json`);
  const publicVideoName = `.hyperframes-video-test-${suffix}.mp4`;
  const publicVideoPath = path.join(shortsRoot, 'public', publicVideoName);
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.mkdir(path.dirname(preparedPath), {recursive: true});
  await fs.writeFile(publicVideoPath, 'fixture-video-bytes');
  t.after(async () => {
    await Promise.all([
      fs.rm(fixtureDir, {recursive: true, force: true}),
      fs.rm(outputDir, {recursive: true, force: true}),
      fs.rm(preparedPath, {force: true}),
      fs.rm(publicVideoPath, {force: true}),
    ]);
  });

  const candidateScene = fixtureScene(0);
  const manifest = candidateManifest([candidateScene]);
  const manifestPath = path.join(fixtureDir, 'candidate-01.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest));

  const preparedScene = {
    ...candidateScene,
    audioDurationSeconds: 3.6,
    videoPath: publicVideoName,
    camera: {motion: 'static', target: 'center', intensity: 'subtle', startProgress: 0, endProgress: 1},
    backgroundVideo: {
      assetId: 'teluk-prancis-waves',
      startSeconds: 1,
      endSeconds: 5,
      playbackRate: 1,
      endBehavior: 'error',
      cropX: .42,
      cropY: .55,
      overlayOpacity: .52,
    },
  };
  await fs.writeFile(preparedPath, JSON.stringify(candidateManifest([preparedScene])));

  const relativeManifest = path.relative(repoRoot, manifestPath);
  const relativePrepared = path.relative(repoRoot, preparedPath);
  const relativeOutput = path.relative(repoRoot, outputDir);
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts', 'build-hyperframes.mjs'), relativeManifest,
    `--prepared=${relativePrepared}`, `--output=${relativeOutput}`,
  ], {cwd: repoRoot, encoding: 'utf8'});

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  await fs.access(path.join(outputDir, 'media', 'scene-01-background.mp4'));
  assert.match(html, /<video id="video-scene-01" class="ml-background-video"/);
  assert.match(html, /data-start="0\.000" data-duration="3\.880" data-track-index="201"/);
  assert.match(html, /style="object-position:42% 55%;" muted playsinline/);
  assert.match(html, /ml-scene--video/);
  assert.match(html, /--ml-video-overlay-opacity:0\.52/);
  const videoIndex = html.indexOf('<video id="video-scene-01"');
  const sceneIndex = html.indexOf('<section id="scene-01"');
  assert.ok(videoIndex >= 0 && videoIndex < sceneIndex, 'background video must be a root-level sibling before the scene overlay');
  const sceneMarkup = html.slice(sceneIndex, html.indexOf('</section>', sceneIndex));
  assert.doesNotMatch(sceneMarkup, /<video\b/, 'background video must not be nested inside a timed scene section');
});
