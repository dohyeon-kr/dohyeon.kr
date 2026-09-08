import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveManifest, validateRevision, frameInput, ReviewSchema} from '../scripts/review-storyboard.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';

const scene = () => ({narration: '그럴 수 있다.', beats: [{text: '그럴 수 있다', keyword: '있다'}], camera: {startProgress: 0, endProgress: 1}, visual: {type: 'none'}});
test('accepts narrative-driven scene counts and rejects empty revisions', () => {
  for (let count = 0; count <= 22; count++) {
    const candidate = {scenes: Array.from({length: count}, scene)};
    if (count > 0) {
      assert.doesNotThrow(() => validateRevision(candidate), `${count} scenes`);
    } else {
      assert.throws(() => validateRevision(candidate), /Expected at least one body scene/, `${count} scenes`);
    }
  }
});
test('validates scenes beyond the standard count in extended revisions', () => {
  const candidate = {scenes: Array.from({length: 20}, scene)};
  candidate.scenes[19].beats[0].text = '그럴 수 없다';
  assert.throws(() => validateRevision(candidate), /Scene 20: narration\/beats mismatch/);
});
test('rejects traversal before reading candidate', async () => {
  for (const name of ['shorts/content/../candidate-01.json', '/etc/passwd', 'shorts/content/a/candidate-01.json\n']) {
    await assert.rejects(resolveManifest(name));
  }
});
test('requires exact narration coverage and valid motion', () => {
  const candidate = {scenes: Array.from({length: 6}, scene)};
  validateRevision(candidate);
  candidate.scenes[0].beats[0].text = '그럴 수 없다';
  assert.throws(() => validateRevision(candidate), /mismatch/);
  candidate.scenes[0] = scene();
  candidate.scenes[0].camera.endProgress = 0;
  assert.throws(() => validateRevision(candidate), /camera/);
});
test('includes all diagram phases and fails closed on missing frame', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-test-'));
  try {
    const folder = path.join(dir, 'post-candidate-01');
    await fs.mkdir(folder);
    for (const phase of ['-initial', '-change', '']) await fs.writeFile(path.join(folder, `post-candidate-01-scene-01${phase}.png`), 'image');
    const args = {manifest: 'shorts/content/post/candidate-01.json', frames: dir};
    const manifest = {id: 'candidate-01', scenes: [{diagramSpec: {}}]};
    const content = await frameInput(manifest, args);
    const videoContent = await frameInput({...manifest, scenes: [{backgroundVideo: {assetId: 'sample'}}]}, args);
    assert.equal(videoContent.filter(x => x.type === 'input_image').length, 3);
    assert.equal(content.filter(x => x.type === 'input_image').length, 3);
    await fs.unlink(path.join(folder, 'post-candidate-01-scene-01-change.png'));
    await assert.rejects(frameInput(manifest, args));
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});
test('SDK can serialize both output schemas', () => {
  assert.equal(zodTextFormat(ReviewSchema, 'review').type, 'json_schema');
  assert.equal(zodTextFormat(CandidateSchema, 'candidate').type, 'json_schema');
});

const diagram = (invalid = false) => ({version: 1, renderer: 'auto', description: '입력', nodes: [
  {id: 'input', shape: 'rect', label: '입력', x: 200, y: 200, width: 160, height: 100, fill: 'white'},
  ...(invalid ? [{id: 'lever', shape: 'rect', x: 200, y: 200, width: 160, height: 100, fill: 'white'}] : []),
], events: []});
for (const succeeds of [true, false]) test(`review repair loop ${succeeds ? 'recovers through redesign' : 'saves exhausted diagnostics'}`, async () => {
  const {resolveReviewVisuals} = await import('../scripts/review-storyboard.mjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-repair-'));
  try {
    const candidate = {title: '검토', scenes: Array.from({length: 6}, scene)};
    candidate.scenes[0] = {...scene(), visual: {type: 'diagram'}, diagramSpec: diagram(true)};
    candidate.scenes[1].visual = {type: 'photo', query: ' existing '};
    candidate.scenes[2].visual = {type: 'photo', query: 'new photo'};
    const before = structuredClone(candidate);
    const requests = [], searches = [];
    const client = {responses: {parse: async request => {
      requests.push(JSON.parse(request.input));
      assert.equal(request.model, 'review-model');
      return {output_parsed: {diagramSpec: diagram(!succeeds || requests.length < 4)}};
    }}};
    const run = resolveReviewVisuals(candidate, {scenes: [{visual: {query: 'existing'}, image: {originalUrl: 'licensed'}}]}, {
      client, model: 'review-model', reportDir: dir, warn: () => {},
      search: async query => {searches.push(query); return {originalUrl: 'new-licensed'};},
    });
    if (succeeds) {
      const result = await run;
      assert.deepEqual(requests.map(r => r.mode), ['repair', 'repair', 'repair', 'redesign']);
      assert.equal(requests[3].history.length, 4);
      assert.deepEqual(requests[3].originalScene, before.scenes[0]);
      assert.deepEqual(result.scenes[0].beats, before.scenes[0].beats);
      assert.equal(result.scenes[0].narration, before.scenes[0].narration);
      assert.equal(result.scenes[1].image.originalUrl, 'licensed');
      assert.deepEqual(searches, ['new photo']);
    } else {
      await assert.rejects(run, /after 8 repair attempts/);
      assert.equal(requests.length, 8);
    }
    assert.deepEqual(candidate, before);
    const checkpoint = JSON.parse(await fs.readFile(path.join(dir, 'visual-repair.json')));
    assert.equal(checkpoint.status, succeeds ? 'validated' : 'failed');
    assert.deepEqual(checkpoint.scenes[0].diagramSpec, diagram(!succeeds));
    if (!succeeds) assert.equal(checkpoint.history.at(-1).errors.length, 9);
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});

for (const outcome of ['recovered', 'exhausted', 'api-error']) test(`review photo recovery ${outcome} preserves content and diagnostics`, async () => {
  const {resolveReviewVisuals} = await import('../scripts/review-storyboard.mjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'review-photo-'));
  try {
    const candidate = {title: '검토', scenes: Array.from({length: 6}, scene)};
    candidate.scenes[0] = {...scene(), layout: 'photo-full-bleed', visual: {type: 'photo', query: 'person sorting task cards on desk'}};
    const before = structuredClone(candidate);
    const searches = [], requests = [];
    const client = {responses: {parse: async request => {
      requests.push(request);
      if (outcome === 'api-error') throw new Error('API unavailable');
      return {output_parsed: {alternatives: [{query: 'task cards', rationale: '정리할 업무를 카드로 보여준다.'}, {query: 'sticky notes', rationale: '책상 위 메모로 업무 구분을 보여준다.'}, {query: 'desk notes', rationale: '업무를 적은 메모를 보여준다.'}]}};
    }}};
    const run = resolveReviewVisuals(candidate, {scenes: []}, {client, model: 'review-model', reportDir: dir, curated: () => null,
      search: async query => {searches.push(query); return outcome === 'recovered' && query === 'sticky notes' ? {originalUrl: 'https://example.com/photo.jpg', license: 'cc0'} : null;},
    });
    if (outcome === 'recovered') {
      const result = await run;
      assert.equal(result.scenes[0].visual.type, 'photo');
      assert.equal(result.scenes[0].layout, 'photo-full-bleed');
      assert.equal(result.scenes[0].visual.query, 'sticky notes');
      assert.equal(result.scenes[0].image.license, 'cc0');
      assert.equal(result.scenes[0].narration, before.scenes[0].narration);
      assert.deepEqual(result.scenes[0].beats, before.scenes[0].beats);
      assert.deepEqual(result.scenes.slice(1), before.scenes.slice(1).map(s => ({...s, imageQuery: null, image: null})));
      assert.equal(searches.length, 3);
    } else await assert.rejects(run, outcome === 'exhausted' ? /Scene 1: photo unavailable after 4 searches/ : /Scene 1: photo query repair failed: API unavailable/);
    assert.deepEqual(candidate, before);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, 'review-model');
    const checkpoint = JSON.parse(await fs.readFile(path.join(dir, 'visual-repair.json')));
    assert.equal(checkpoint.status, outcome === 'recovered' ? 'validated' : 'failed');
    assert.equal(checkpoint.scenes[0].visual.type, 'photo');
    assert.equal(checkpoint.scenes[0].layout, 'photo-full-bleed');
    assert.ok(checkpoint.history.some(e => e.errors?.some(h => h.query === 'person sorting task cards on desk')));
    if (outcome === 'exhausted') assert.equal(searches.length, 4);
  } finally {await fs.rm(dir, {recursive: true, force: true});}
});
test('photo query planner enforces its run budget and schema', async () => {
  const {createPhotoQueryRepair, PhotoQueryRepairSchema} = await import('../scripts/repair-photo-query.mjs');
  assert.equal(zodTextFormat(PhotoQueryRepairSchema, 'photo').type, 'json_schema');
  let calls = 0;
  const client = {responses: {parse: async () => {calls++; return {output_parsed: {alternatives: [{query: 'task cards', rationale: '업무 카드'}]}};}}};
  const repair = createPhotoQueryRepair(client, {model: 'review-model', maxCalls: 1});
  await repair({scene: scene()});
  await assert.rejects(repair({scene: scene()}), /budget exhausted/);
  assert.equal(calls, 1);
  await assert.rejects(createPhotoQueryRepair(client, {deadline: Date.now() - 1})({scene: scene()}), /budget exhausted/);
});
