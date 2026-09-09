import {buildStagePrompts} from './shorts-prompts.mjs';
export {ANALYSIS_PROMPT, VISUAL_POLICY, REVIEW_PROMPT} from './shorts-prompts.mjs';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {normalizeAdditionalRequest} from './generation-input.mjs';

export const STAGE_MODELS = Object.freeze({analysis: 'gpt-6-astra', visual: 'gpt-5.6-sol', review: 'gpt-6-astra'});
const text = z.string().min(1);
export const AnalysisSchema = z.object({
  evidence: z.array(z.object({id: text, quote: text, claim: text, conditions: z.array(text)})).min(1),
  candidates: z.array(z.object({
    id: text, question: text, answer: text, scope: text,
    excludedTopics: z.array(text), extensionReason: z.string().nullable(),
    terms: z.array(z.object({term: text, meaning: text})),
    script: z.array(z.object({
      id: text, arc: z.enum(['opening', 'development', 'turn', 'conclusion']),
      narration: text, evidenceIds: z.array(text).min(1),
      necessaryPremises: z.array(text), connectionFromPrevious: text,
    })).min(4),
  })).min(3).max(8),
});

const compact = value => value.replace(/\s+/gu, '');
const unique = (values, label) => {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
};
export function validateAnalysis(analysis, post, count) {
  if (analysis.candidates.length !== count) throw new Error(`Analysis expected ${count} independent candidates, received ${analysis.candidates.length}; insufficient scope/evidence or invalid count.`);
  unique(analysis.evidence.map(e => e.id), 'evidence IDs');
  unique(analysis.candidates.map(c => c.id), 'candidate IDs');
  const ids = new Set(analysis.evidence.map(e => e.id));
  for (const e of analysis.evidence) {
    if (!compact(post.body).includes(compact(e.quote))) throw new Error(`Evidence ${e.id} quote not found in source article`);
  }
  for (const c of analysis.candidates) {
    unique(c.script.map(s => s.id), `script IDs in ${c.id}`);
    const arcs = c.script.map(s => ['opening', 'development', 'turn', 'conclusion'].indexOf(s.arc));
    if (new Set(arcs).size !== 4 || arcs.some((arc, i) => i && arc < arcs[i - 1])) throw new Error(`Incomplete or unordered narrative arc: ${c.id}`);
    for (const s of c.script) for (const id of s.evidenceIds) {
      if (!ids.has(id)) throw new Error(`Unknown evidence ${id} in ${c.id}/${s.id}`);
    }
  }
}

function validateCandidates(entries, analysis, {preserveScript = false} = {}) {
  if (entries.length !== analysis.candidates.length) throw new Error('Stage changed candidate count');
  entries.forEach((entry, i) => {
    const plan = analysis.candidates[i];
    if (entry.analysisId !== plan.id) throw new Error(`Stage changed candidate identity/order: ${plan.id}`);
    const scenes = entry.candidate.scenes;
    if (!scenes.length || scenes.some(s => !s.narration.trim())) throw new Error(`Empty narration: ${plan.id}`);
    if (preserveScript && compact(scenes.map(s => s.narration).join('')) !== compact(plan.script.map(s => s.narration).join(''))) {
      throw new Error(`Visual stage changed locked narration: ${plan.id}`);
    }
    for (const [index, scene] of scenes.entries()) {
      if (compact(scene.beats.map(b => b.text).join('')) !== compact(scene.narration)) throw new Error(`Subtitle/narration mismatch: ${plan.id} scene ${index + 1}`);
    }
  });
}

export async function generateInStages({client, post, count, additionalRequest = '', candidateSchema, visualInstructions, templateInstructions = '', videoCatalog, checkpoint = async () => {}, models = STAGE_MODELS}) {
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Candidate count must be an integer from 3 to 8.');
  const editorialRequest = normalizeAdditionalRequest(additionalRequest);
  const entries = z.array(z.object({analysisId: text, candidate: candidateSchema}));
  const VisualSchema = z.object({candidates: entries});
  const ReviewSchema = z.object({
    scope: z.literal('json-only'), status: z.enum(['passed', 'blocked']),
    blockingReasons: z.array(text),
    findings: z.array(z.object({analysisId: text, location: text, category: z.enum(['narrative', 'visual', 'fidelity']), problem: text, reason: text, change: text, resolved: z.boolean()})),
    candidates: entries,
  });
  const call = async (stage, schema, instructions, input, checkpointName = stage) => {
    const model = models[stage];
    console.log(`Shorts generation stage: ${checkpointName} (${model}, low)`);
    try {
      const response = await client.responses.parse({model, store: false, reasoning: {effort: 'low'}, instructions, input: JSON.stringify(input), text: {format: zodTextFormat(schema, `shorts_${stage}_v1`)}});
      if (!response.output_parsed) throw new Error('Model refused or returned incomplete structured output');
      await checkpoint(checkpointName, {model, effort: 'low', result: response.output_parsed});
      return schema.parse(response.output_parsed);
    } catch (error) {
      await checkpoint(`${checkpointName}-error`, {model, error: error.message});
      throw new Error(`${checkpointName}: ${error.message}`, {cause: error});
    }
  };
  const prompts = buildStagePrompts(visualInstructions, templateInstructions);
  const analysis = await call('analysis', AnalysisSchema, prompts.analysis, {sourceArticle: post, candidateCount: count, editorialRequest});
  validateAnalysis(analysis, post, count);
  const visual = await call('visual', VisualSchema, prompts.visual, {analysis, videoCatalog});
  validateCandidates(visual.candidates, analysis, {preserveScript: true});
  const reviewedCandidates = [];
  const findings = [];
  for (const [index, original] of visual.candidates.entries()) {
    // Keep the full source and analysis for fidelity/scope checks, but only emit
    // one candidate's large scene JSON per request to avoid batch timeouts.
    const reviewed = await call('review', ReviewSchema, prompts.review, {sourceArticle: post, analysis, generated: {candidates: [original]}, videoCatalog}, `review-${index + 1}`);
    if (reviewed.status !== 'passed' || reviewed.blockingReasons.length || reviewed.findings.some(f => !f.resolved)) throw new Error(`Review blocked: ${reviewed.blockingReasons.join('; ') || 'unresolved findings'}`);
    validateCandidates(reviewed.candidates, {candidates: [analysis.candidates[index]]});
    if (reviewed.findings.some(f => f.analysisId !== original.analysisId)) throw new Error('Review finding references unknown candidate');
    const entry = reviewed.candidates[0];
    if (JSON.stringify(entry.candidate) !== JSON.stringify(original.candidate) && !reviewed.findings.length) throw new Error(`Review changed ${entry.analysisId} without recording a reason`);
    reviewedCandidates.push(entry);
    findings.push(...reviewed.findings);
  }
  validateCandidates(reviewedCandidates, analysis);
  await checkpoint('review', {model: models.review, effort: 'low', result: {scope: 'json-only', status: 'passed', blockingReasons: [], findings, candidates: reviewedCandidates}});
  return reviewedCandidates.map(entry => entry.candidate);
}
