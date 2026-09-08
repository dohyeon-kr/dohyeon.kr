import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod/v4';
import {generateInStages, STAGE_MODELS} from '../scripts/generation-stages.mjs';

const post = {title: '신뢰', url: 'https://blog.dohyeon.kr/trust/', body: '성과와 판단을 확인합니다. 신뢰를 쌓습니다.'};
const candidateSchema = z.object({scenes: z.array(z.object({narration: z.string(), beats: z.array(z.object({text: z.string()}))}))});
function fixture() {
  const analysis = {evidence: [{id: 'e1', quote: post.body, claim: '신뢰', conditions: []}], candidates: Array.from({length: 3}, (_, i) => ({
    id: `c${i}`, question: '왜 맡길까요?', answer: '신뢰입니다.', scope: '위임', excludedTopics: ['연고주의'], extensionReason: null, terms: [],
    script: ['opening', 'development', 'turn', 'conclusion'].map((arc, j) => ({id: `s${j}`, arc, narration: ['왜 맡길까요?', '성과를 봅니다.', '판단도 봅니다.', '신뢰입니다.'][j], evidenceIds: ['e1'], necessaryPremises: [], connectionFromPrevious: '판단의 근거를 구체화합니다.'})),
  }))};
  const visual = {candidates: analysis.candidates.map(c => ({analysisId: c.id, candidate: {scenes: c.script.map(s => ({narration: s.narration, beats: [{text: s.narration}]}))}}))};
  const review = {scope: 'json-only', status: 'passed', blockingReasons: [], findings: [], candidates: structuredClone(visual.candidates)};
  return {analysis, visual, review};
}
function setup(f = fixture()) {
  const calls = [], checkpoints = [];
  const replies = [f.analysis, f.visual, f.review];
  const client = {responses: {parse: async request => {calls.push(request); return {output_parsed: replies.shift()};}}};
  return {calls, checkpoints, run: () => generateInStages({client, post, count: 3, candidateSchema, visualInstructions: 'Renderer capabilities only', videoCatalog: [], checkpoint: async (stage, result) => checkpoints.push({stage, result})})};
}
test('three JSON calls use Astra/Sol/Astra low and preserve candidate output contract', async () => {
  const s = setup(); const result = await s.run();
  assert.deepEqual(s.calls.map(c => c.model), Object.values(STAGE_MODELS));
  assert.ok(s.calls.every(c => c.reasoning.effort === 'low' && c.store === false));
  assert.equal(result.length, 3); assert.equal(result[0].analysisId, undefined);
  assert.deepEqual(s.checkpoints.map(c => c.stage), ['analysis', 'visual', 'review']);
  const second = JSON.parse(s.calls[1].input);
  assert.ok(second.analysis); assert.equal(second.sourceArticle, undefined);
  assert.doesNotMatch(s.calls[0].instructions, /Renderer capabilities/);
  assert.ok(JSON.parse(s.calls[2].input).sourceArticle);
});
test('missing source quote or evidence link stops before visual generation', async () => {
  for (const change of [f => f.analysis.evidence[0].quote = '조작한 인용', f => f.analysis.candidates[0].script[1].evidenceIds = ['missing']]) {
    const f = fixture(); change(f); const s = setup(f);
    await assert.rejects(s.run, /quote not found|Unknown evidence/); assert.equal(s.calls.length, 1);
  }
});
test('visual rewrite, subtitle loss, or candidate swap is rejected before review', async () => {
  for (const change of [
    f => f.visual.candidates[0].candidate.scenes[0].narration = '주장 변경',
    f => f.visual.candidates[0].candidate.scenes[0].beats = [],
    f => f.visual.candidates.reverse(),
  ]) {
    const f = fixture(); change(f); const s = setup(f);
    await assert.rejects(s.run, /changed locked narration|Subtitle\/narration mismatch|identity\/order/);
    assert.equal(s.calls.length, 2);
  }
});
test('blocked review is checkpointed and never returned for publication', async () => {
  const f = fixture(); f.review.status = 'blocked'; f.review.blockingReasons = ['근거 부족'];
  const s = setup(f); await assert.rejects(s.run, /Review blocked: 근거 부족/);
  assert.equal(s.checkpoints.at(-1).stage, 'review'); assert.equal(s.calls.length, 3);
});
test('review changes require a reason and synchronized subtitles', async () => {
  const f = fixture(); const scene = f.review.candidates[0].candidate.scenes[0];
  scene.narration = '무엇을 믿을까요?'; scene.beats[0].text = scene.narration;
  await assert.rejects(setup(f).run, /without recording a reason/);
  f.review.findings = [{analysisId: 'c0', location: 'scene 1', category: 'narrative', problem: '질문 연결', reason: '결론과 질문 일치', change: '질문 수정', resolved: true}];
  assert.equal((await setup(f).run())[0].scenes[0].narration, scene.narration);
  f.review.findings[0].resolved = false;
  await assert.rejects(setup(f).run, /unresolved findings/);
});
test('refusal and malformed output stop and save diagnostic error', async () => {
  for (const reply of [null, {evidence: []}]) {
    const f = fixture(); f.analysis = reply; const s = setup(f);
    await assert.rejects(s.run, /analysis:/); assert.equal(s.calls.length, 1);
    assert.equal(s.checkpoints.at(-1).stage, 'analysis-error');
  }
});
