import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBlogCta, withBlogCta, BLOG_CTA_ID, BLOG_URL} from '../scripts/blog-cta.mjs';

const shortsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.dirname(shortsRoot);
const manifestPath = path.join(shortsRoot, 'content/insaengyeogjeoneul-baraneun-dangsin-roddoneun-sassnayo/candidate-01.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const compact = text => String(text ?? '').replace(/\s+/g, ' ').trim();

test('lottery opening uses the original full-bleed still, not B-roll', () => {
  const scene = manifest.scenes[0];
  assert.equal(scene.backgroundVideo, null);
  assert.equal(scene.layout, 'photo-full-bleed');
  assert.equal(scene.visual.type, 'photo');
  assert.match(scene.image.originalUrl, /8266775/);
  assert.equal(scene.camera.motion, 'static');
});

test('lottery retains the two body videos and normalizes to exactly one canonical common CTA', () => {
  assert.deepEqual(manifest.scenes.flatMap((scene, index) => scene.backgroundVideo ? [index + 1] : []), [6, 9]);
  assert.equal(manifest.scenes.filter(scene => scene.commonPage).length, 1);
  assert.equal(manifest.scenes.at(-2).backgroundVideo.assetId, 'open-door-sunlight');
  const normalized = withBlogCta(manifest);
  assert.equal(normalized.scenes.filter(scene => scene.commonPage === BLOG_CTA_ID).length, 1);
  assert.deepEqual(normalized.scenes.at(-1), createBlogCta());
});

for (const [index, scene] of manifest.scenes.entries()) {
  test(`lottery scene ${index + 1}: subtitles reproduce narration without paraphrase or omissions`, () => {
    assert.equal(compact(scene.beats.map(beat => beat.text).join(' ')), compact(scene.narration));
    for (const beat of scene.beats) {
      assert.ok(!beat.keyword || beat.text.includes(beat.keyword), 'emphasis must refer to spoken copy');
    }
  });
}

test('HyperFrames renders the reusable blog CTA, without generic title-card chrome', async t => {
  const suffix = `${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(shortsRoot, 'content', `.common-cta-test-${suffix}`);
  const outputDir = path.join(shortsRoot, '.tmp', `common-cta-test-${suffix}`);
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(async () => {
    await fs.rm(fixtureDir, {recursive: true, force: true});
    await fs.rm(outputDir, {recursive: true, force: true});
  });
  const fixturePath = path.join(fixtureDir, 'candidate.json');
  await fs.writeFile(fixturePath, JSON.stringify({...manifest, scenes: [createBlogCta()]}));
  const result = spawnSync(process.execPath, [
    path.join(shortsRoot, 'scripts/build-hyperframes.mjs'),
    path.relative(repoRoot, fixturePath), `--output=${path.relative(repoRoot, outputDir)}`,
  ], {cwd: repoRoot, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
  const scene = html.match(/<section\b[\s\S]*?<\/section>/)?.[0];
  assert.ok(scene, 'common CTA has a timed scene');
  assert.ok(scene.includes(BLOG_URL), 'shared CTA must display the blog address');
  assert.match(scene, /data-overlay-reserve="cta"/);
  assert.match(scene, /더 자세한 이야기는\n블로그에서/);
  assert.match(scene, /3px dotted #fff/);
  assert.doesNotMatch(scene, /ml-kicker|ml-index|ml-grid|ml-tick|ml-rule|ml-presenter-overlay/);
  assert.doesNotMatch(html, /tl\.(?:from|to)\("#scene-01 \.ml-(?:headline|content|subline|topline)/);
  await fs.access(path.join(outputDir, 'fonts/Pretendard-Bold.woff'));
  await fs.access(path.join(outputDir, 'fonts/Pretendard-Regular.woff'));
  const compiled = JSON.parse(await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf8'));
  assert.equal(compiled.scenes.filter(s => s.commonPage === BLOG_CTA_ID).length, 1);
});
