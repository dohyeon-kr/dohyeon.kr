import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {eligible, GhostClient, ghostToken, processPost} from '../scripts/ghost-feature-images.mjs';
import {featureDiagram, validateFeaturePlan} from '../scripts/feature-image-plan.mjs';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {evaluatedDiagramState} from '../src/visuals/physics.ts';
import {nodeLabel} from '../src/visuals/node-layout.ts';

const plan = {title: ['판단을 규칙으로'], relationship: 'sequence', labels: [['문제', '발견'], ['규칙', '저장'], ['자동', '검증']], description: '발견한 문제를 규칙으로 저장해 자동 검증한다.'};
const post = {id: 'a'.repeat(24), title: '릴스 자동화', html: `<p>${'충분히 긴 본문. '.repeat(20)}</p>`, status: 'draft', updated_at: '2026-01-01T00:00:00Z', feature_image: null};

test('existing images, fresh edits and empty drafts never invoke generation', async () => {
  for (const changed of [{feature_image: 'https://example.com/custom.png'}, {updated_at: new Date().toISOString()}, {html: ''}, {status: 'sent'}]) {
    assert.equal(eligible({...post, ...changed}), false);
    const result = await processPost({...post, ...changed}, {planPost() {throw new Error('must not call model');}});
    assert.equal(result.status, 'skipped');
  }
});

test('all three fixed layouts pass shared geometry checks with long Korean labels', () => {
  for (const relationship of ['sequence', 'contrast', 'branch']) {
    const labels = Array.from({length: relationship === 'contrast' ? 2 : 3}, () => ['받침문구', '여러줄말']);
    const spec = validateDiagram(featureDiagram({...plan, relationship, labels}));
    assert.equal(spec.events.length, 0); // Cover is static; no intermediate motion states.
    evaluatedDiagramState(spec, 0);
    evaluatedDiagramState(spec, 1);
    for (const node of spec.nodes.filter(node => node.label)) {
      assert.equal(nodeLabel(node).text, node.label, 'renderer must preserve semantic line breaks');
    }
  }
  assert.throws(() => validateFeaturePlan({...plan, relationship: 'contrast'}));
  assert.throws(() => validateFeaturePlan({...plan, labels: [['이문구는너무깁니다'], ['a'], ['b']]}));
  assert.throws(() => validateFeaturePlan({...plan, labels: [['지침·검사'], ['a'], ['b']]}));
});

test('draft attaches only image fields with current revision and verifies the result', async () => {
  let body;
  const client = new GhostClient({url: 'https://blog.example.com', key: `${'a'.repeat(24)}:${'b'.repeat(64)}`, fetchImpl: async (url, options) => {
    body = JSON.parse(options.body);
    assert.equal(options.method, 'PUT');
    assert.match(url, /posts\/a+\/$/);
    return {ok: true, json: async () => ({posts: [post]})};
  }});
  await client.attach(post, 'https://blog.example.com/cover.png', plan.description);
  assert.deepEqual(Object.keys(body.posts[0]).sort(), ['feature_image', 'feature_image_alt', 'updated_at']);
  const claims = JSON.parse(Buffer.from(ghostToken(client.key).split('.')[1], 'base64url'));
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(claims.aud, '/admin/');
});

test('preview and concurrent edits never attach; revision conflicts are not overwritten', async t => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'feature-images-'));
  t.after(() => rm(outputDir, {recursive: true, force: true}));
  for (const scenario of ['preview', 'new-image', 'changed-body', 'upload-race', 'conflict', 'success']) {
    let reads = 0, uploads = 0, writes = 0;
    const ghost = {
      getPost: async () => {
        reads++;
        if (scenario === 'new-image' || scenario === 'upload-race' && reads === 2) return {...post, feature_image: 'manual.png'};
        if (scenario === 'changed-body') return {...post, html: '<p>수정한 본문</p>'};
        if (writes) return {...post, feature_image: 'generated.png'};
        return {...post, updated_at: '2026-01-02T00:00:00Z'};
      },
      upload: async () => { uploads++; return 'generated.png'; },
      attach: async current => { writes++; assert.equal(current.updated_at, '2026-01-02T00:00:00Z'); if (scenario === 'conflict') throw Object.assign(new Error(), {status: 409}); },
    };
    const result = await processPost(post, {ghost, outputDir, planPost: async () => plan, render: async () => {}, apply: scenario !== 'preview'});
    assert.equal(writes, ['success', 'conflict'].includes(scenario) ? 1 : 0, scenario);
    if (['preview', 'new-image', 'changed-body'].includes(scenario)) assert.equal(uploads, 0);
    if (scenario === 'success') assert.equal(result.status, 'attached');
    if (scenario === 'conflict') assert.equal(result.status, 'edit-conflict');
  }
});

test('missing start date fails closed and scan walks past ineligible drafts', async () => {
  let calls = 0;
  const client = new GhostClient({url: 'https://blog.example.com', key: `${'a'.repeat(24)}:${'b'.repeat(64)}`, fetchImpl: async () => {
    calls++;
    return {ok: true, json: async () => ({posts: calls === 1 ? [{...post, html: ''}] : [post], meta: {pagination: {next: calls === 1 ? 2 : null}}})};
  }});
  await assert.rejects(client.candidates(), /explicit ISO date/);
  assert.equal(calls, 0);
  assert.equal((await client.candidates('2026-01-01T00:00:00Z')).length, 1);
  assert.equal(calls, 2);
});
