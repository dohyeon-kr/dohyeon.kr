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
function setup(f = fixture(), transformReview = value => value, templateInstructions = '') {
  const calls = [], checkpoints = [];
  const replies = [f.analysis, f.visual, ...f.review.candidates.map(candidate => transformReview({...f.review, candidates: [candidate], findings: f.review.findings.filter(finding => finding.analysisId === candidate.analysisId)}))];
  const client = {responses: {parse: async request => {calls.push(request); return {output_parsed: replies.shift()};}}};
  return {calls, checkpoints, run: () => generateInStages({client, post, count: 3, candidateSchema, visualInstructions: 'Renderer capabilities only', templateInstructions, videoCatalog: [], checkpoint: async (stage, result) => checkpoints.push({stage, result})})};
}
test('candidate reviews use Astra/Sol/Astra low and preserve candidate output contract', async () => {
  const s = setup(); const result = await s.run();
  assert.deepEqual(s.calls.map(c => c.model), [STAGE_MODELS.analysis, STAGE_MODELS.visual, ...Array(3).fill(STAGE_MODELS.review)]);
  assert.ok(s.calls.every(c => c.reasoning.effort === 'low' && c.store === false));
  assert.equal(result.length, 3); assert.equal(result[0].analysisId, undefined);
  assert.deepEqual(s.checkpoints.map(c => c.stage), ['analysis', 'visual', 'review-1', 'review-2', 'review-3', 'review']);
  const second = JSON.parse(s.calls[1].input);
  assert.ok(second.analysis); assert.equal(second.sourceArticle, undefined);
  assert.doesNotMatch(s.calls[0].instructions, /Renderer capabilities/);
  s.calls.slice(2).forEach((call, index) => {
    const input = JSON.parse(call.input);
    assert.deepEqual(input.sourceArticle, post);
    assert.equal(input.analysis.candidates.length, 3);
    assert.equal(input.generated.candidates.length, 1);
    assert.equal(input.generated.candidates[0].analysisId, `c${index}`);
  });
  assert.deepEqual(s.checkpoints.at(-1).result.result.candidates.map(c => c.candidate), result);
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
  assert.equal(s.checkpoints.at(-1).stage, 'review-1'); assert.equal(s.calls.length, 3);
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

test('later candidate timeout keeps completed review diagnostics and returns no partial result', async () => {
  const f = fixture(); const checkpoints = [];
  const replies = [f.analysis, f.visual, {...f.review, candidates: [f.review.candidates[0]]}];
  let calls = 0;
  const client = {responses: {parse: async () => {
    calls++;
    if (!replies.length) throw new Error('Request timed out.');
    return {output_parsed: replies.shift()};
  }}};
  await assert.rejects(() => generateInStages({client, post, count: 3, candidateSchema, visualInstructions: '', videoCatalog: [], checkpoint: async (stage, result) => checkpoints.push({stage, result})}), /review-2: Request timed out/);
  assert.equal(calls, 4);
  assert.deepEqual(checkpoints.map(c => c.stage), ['analysis', 'visual', 'review-1', 'review-2-error']);
  assert.equal(checkpoints[2].result.result.candidates[0].analysisId, 'c0');
});

test('review cannot return extra candidates, wrong identity, or a mismatched subtitle', async () => {
  for (const change of [
    f => f.review.candidates[0].analysisId = 'c1',
    f => f.review.candidates[0].candidate.scenes[0].beats = [],
    f => f.review.candidates.splice(0, 1),
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(setup(f).run, /identity\/order|Subtitle\/narration mismatch/);
  }
});

test('single-candidate reviews reject extra output and findings for another candidate', async () => {
  await assert.rejects(setup(fixture(), review => ({...review, candidates: [...review.candidates, ...review.candidates]})).run, /Stage changed candidate count/);
  const finding = {analysisId: 'c1', location: 'scene 1', category: 'visual', problem: 'overlap', reason: 'readability', change: 'spacing', resolved: true};
  await assert.rejects(setup(fixture(), review => ({...review, findings: [finding]})).run, /Review finding references unknown candidate/);
});

test('selected template reaches visual generation and every review but not narrative analysis', async () => {
  const s = setup(fixture(), value => value, 'NOTEBOOK_POLICY_OVERRIDE');
  await s.run();
  assert.doesNotMatch(s.calls[0].instructions, /NOTEBOOK_POLICY_OVERRIDE/);
  for (const call of s.calls.slice(1)) assert.match(call.instructions, /NOTEBOOK_POLICY_OVERRIDE/);
});
