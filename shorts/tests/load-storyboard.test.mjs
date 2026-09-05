import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadPublishedStoryboard, readReviewOriginal, pinnedLinks, parseStoryboardSource, storyboardFrames} from '../scripts/load-storyboard.mjs';

const repository = 'owner/repo';
const manifestPath = 'shorts/content/post/candidate-01.json';
const sourceCommit = 'a'.repeat(40), documentCommit = 'b'.repeat(40), imageCommit = 'c'.repeat(40);
const manifest = {id: 'candidate-01', scenes: [{headline: '첫 장면'}, {headline: '도식', diagramSpec: {}}, {headline: '영상', backgroundVideo: {assetId: 'sample'}}]};
const {prefix, names} = storyboardFrames(manifest, manifestPath);
const sourceUrl = `https://github.com/${repository}/blob/${sourceCommit}/${manifestPath}`;
const docUrl = `https://github.com/${repository}/blob/${documentCommit}/${prefix}-STORYBOARD.md`;
const frameUrl = name => `https://raw.githubusercontent.com/${repository}/${imageCommit}/${name}`;
const png = Buffer.alloc(24); Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.writeUInt32BE(1080,16); png.writeUInt32BE(1920,20);
async function fixture(t, {inline = false, omit, corrupt = false} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'load-storyboard-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, path.dirname(manifestPath)), {recursive: true});
  await fs.writeFile(path.join(root, manifestPath), JSON.stringify(manifest));
  const images = names.filter(n => n !== omit).map(n => `![frame](${frameUrl(n)})`).join('\n');
  const document = `[원본](${sourceUrl})\n${images}`;
  const release = {id: 1, tag_name: 'shorts-storyboard-123', html_url: `https://github.com/${repository}/releases/tag/untagged-alias`,
    body: `[원본](${sourceUrl})\n${inline ? images : `[스토리보드](${docUrl})`}`};
  const calls = [];
  const github = {release: async () => release, file: async link => {
    calls.push(link);
    if (link.file === manifestPath) return Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    if (link.file === `${prefix}-STORYBOARD.md`) return Buffer.from(document);
    assert.ok(names.includes(link.file));
    assert.equal(link.commit, imageCommit);
    return corrupt ? Buffer.from('not png') : png;
  }};
  return {root, reportDir: path.join(root, 'report'), repository, source: release.tag_name, manifestPath, github, release, calls};
}
test('accepts explicit tags and draft URLs but refuses foreign sources and mutable refs', () => {
  assert.deepEqual(parseStoryboardSource('shorts-storyboard-123', repository), {tag: 'shorts-storyboard-123'});
  assert.equal(parseStoryboardSource(`https://github.com/${repository}/releases/tag/untagged-alias`, repository).tag, 'untagged-alias');
  for (const value of ['', 'https://evil.example/releases/tag/test', 'https://github.com/other/repo/releases/tag/test', 'https://github.com/owner/repo/releases/tag/test?x=1']) assert.throws(() => parseStoryboardSource(value, repository));
  assert.equal(pinnedLinks(`[x](https://github.com/${repository}/blob/main/${manifestPath})`, repository).length, 0);
  assert.equal(pinnedLinks(`[x](https://github.com/other/repo/blob/${sourceCommit}/${manifestPath})`, repository).length, 0);
});
for (const inline of [false, true]) test(`loads original JSON and every photo/diagram/video frame from ${inline ? 'legacy inline links' : 'pinned Markdown'}`, async t => {
  const args = await fixture(t, {inline});
  const provenance = await loadPublishedStoryboard(args);
  assert.equal(provenance.frames.length, 7);
  assert.equal(provenance.sourceCommit, sourceCommit);
  assert.equal(provenance.documentCommit, inline ? null : documentCommit);
  const stored = await readReviewOriginal(manifestPath, args.reportDir, args.root);
  assert.deepEqual(stored.original, manifest);
  assert.equal(await fs.readFile(path.join(args.root, manifestPath), 'utf8'), JSON.stringify(manifest), 'working JSON must never be replaced');
  assert.ok(args.calls.every(c => /^[abc]{40}$/.test(c.commit)), 'never reads HEAD/latest');
  await fs.writeFile(path.join(args.reportDir, 'before', prefix, names[0]), 'changed');
  await assert.rejects(readReviewOriginal(manifestPath, args.reportDir, args.root), /frame changed/);
});
test('refuses a stale storyboard before downloading frames or overwriting newer candidate edits', async t => {
  const args = await fixture(t);
  const current = {...manifest, changed: true};
  await fs.writeFile(path.join(args.root, manifestPath), JSON.stringify(current));
  await assert.rejects(loadPublishedStoryboard(args), /differs from the published/);
  assert.equal(args.calls.length, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(args.root, manifestPath))), current);
});
for (const kind of ['missing', 'corrupt', 'network']) test(`fails without render fallback on ${kind} frames`, async t => {
  const args = await fixture(t, {omit: kind === 'missing' ? names[2] : undefined, corrupt: kind === 'corrupt'});
  if (kind === 'network') {
    const file = args.github.file;
    args.github.file = async link => {if (link.file.endsWith('.png')) throw new Error('download failed'); return file(link);};
  }
  await assert.rejects(loadPublishedStoryboard(args), kind === 'missing' ? /immutable link/ : kind === 'corrupt' ? /Invalid storyboard PNG/ : /download failed/);
  await assert.rejects(fs.access(path.join(args.reportDir, 'review-source.json')));
});
test('rejects ambiguous JSON versions and candidate edits after loading', async t => {
  const args = await fixture(t);
  args.release.body += `\n[other](${sourceUrl.replace(sourceCommit, 'd'.repeat(40))})`;
  await assert.rejects(loadPublishedStoryboard(args), /found 2/);
  args.release.body = args.release.body.split('\n[other]')[0];
  await loadPublishedStoryboard(args);
  await fs.writeFile(path.join(args.root, manifestPath), JSON.stringify({...manifest, changed: true}));
  await assert.rejects(readReviewOriginal(manifestPath, args.reportDir, args.root), /changed after loading/);
});
test('review workflow only renders the improved storyboard', async () => {
  const workflow = await fs.readFile(new URL('../../.github/workflows/review-storyboard.yml', import.meta.url), 'utf8');
  assert.match(workflow, /storyboard_source:[\s\S]*?required: false/);
  assert.match(workflow, /Load published storyboard and original JSON/);
  assert.equal((workflow.match(/node shorts\/scripts\/render\.mjs/g) || []).length, 1);
  assert.ok(workflow.indexOf('load-storyboard.mjs') < workflow.indexOf('review-storyboard.mjs improve'));
  assert.ok(workflow.indexOf('review-storyboard.mjs improve') < workflow.indexOf('render.mjs'));
  assert.doesNotMatch(workflow, /Render original storyboard/);
});
test('rejects mixed image commits and changed stored JSON', async t => {
  const args = await fixture(t, {inline: true});
  const originalBody = args.release.body;
  args.release.body = originalBody.replace(frameUrl(names[0]), frameUrl(names[0]).replace(imageCommit, 'd'.repeat(40)));
  await assert.rejects(loadPublishedStoryboard(args), /mixed commits/);
  args.release.body = originalBody;
  await loadPublishedStoryboard(args);
  await fs.writeFile(path.join(args.reportDir, 'before.json'), JSON.stringify({...manifest, changed: true}));
  await assert.rejects(readReviewOriginal(manifestPath, args.reportDir, args.root), /Stored review source/);
});
test('automatic selection skips unrelated and changed JSON and chooses newest matching draft', async t => {
  const args = await fixture(t);
  const staleCommit = 'd'.repeat(40);
  const stale = {...args.release, id: 4, updated_at: '2026-09-06T04:00:00Z', body: args.release.body.replaceAll(sourceCommit, staleCommit)};
  const matching = {...args.release, id: 3, draft: true, updated_at: '2026-09-06T03:00:00Z'};
  args.source = '';
  args.github.releases = async () => [
    {...args.release, id: 1, updated_at: '2026-09-06T01:00:00Z'},
    stale, {...stale, id: 5, updated_at: '2026-09-06T05:00:00Z'},
    {id: 6, updated_at: '2026-09-06T06:00:00Z', body: 'another candidate'}, matching,
  ];
  const file = args.github.file;
  let staleReads = 0;
  args.github.file = async link => {
    if (link.commit === staleCommit) {staleReads++; return Buffer.from(JSON.stringify({...manifest, changed: true}));}
    return file(link);
  };
  const selected = await loadPublishedStoryboard(args);
  assert.equal(selected.releaseId, 3);
  assert.equal(selected.selection, 'automatic');
  assert.equal(staleReads, 1, 'same source commit is not downloaded repeatedly');
});
test('automatic selection does not render or overwrite when no JSON matches', async t => {
  const args = await fixture(t);
  args.source = undefined;
  args.github.releases = async () => [args.release];
  await fs.writeFile(path.join(args.root, manifestPath), JSON.stringify({...manifest, newer: true}));
  await assert.rejects(loadPublishedStoryboard(args), /No published storyboard matches/);
  await assert.rejects(fs.access(path.join(args.reportDir, 'review-source.json')));
});
test('explicit source overrides automatic order and newest missing images never fall back to old release', async t => {
  const args = await fixture(t);
  args.github.releases = async () => {throw new Error('explicit source must not scan all releases');};
  assert.equal((await loadPublishedStoryboard(args)).selection, 'explicit');
  const other = await fixture(t, {inline: true, omit: names[0]});
  other.source = '';
  other.github.releases = async () => [
    {...other.release, id: 2, updated_at: '2026-09-06T02:00:00Z'},
    {...args.release, id: 1, updated_at: '2026-09-06T01:00:00Z'},
  ];
  await assert.rejects(loadPublishedStoryboard(other), /immutable link/);
});
