import {readFileSync} from 'node:fs';
import {SHORTS_EDITORIAL_POLICY} from './generation-input.mjs';

// Resolve relative to this module, never the caller's working directory.
export function renderPrompt(name, values = {}) {
  if (!/^[a-z-]+$/.test(name)) throw new Error(`Invalid prompt name: ${name}`);
  const template = readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), 'utf8');
  if (!template.trim()) throw new Error(`Empty prompt: ${name}`);
  return template.replace(/\{\{([a-zA-Z]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key) || typeof values[key] !== 'string') throw new Error(`Missing prompt value: ${name}/${key}`);
    // A single pass: substituted source text is never evaluated as a template.
    return values[key];
  });
}
export const TRUST = renderPrompt('trust');
export const VISUAL_POLICY = renderPrompt('visual-policy');
export const SYSTEM_PROMPT = renderPrompt('renderer') + renderPrompt('content') + renderPrompt('art-direction');
export const VISUAL_SYSTEM_PROMPT = renderPrompt('renderer') + renderPrompt('art-direction') + VISUAL_POLICY;
export const ANALYSIS_PROMPT = renderPrompt('analysis', {trust: TRUST});
export const REVIEW_PROMPT = renderPrompt('review', {trust: TRUST, visualPolicy: VISUAL_POLICY});
export function buildStagePrompts(visualInstructions = VISUAL_SYSTEM_PROMPT, templateInstructions = '') {
  const {sceneGuidance, ...narrativePolicy} = SHORTS_EDITORIAL_POLICY;
  const values = {trust: TRUST, visualPolicy: VISUAL_POLICY, analysisPrompt: ANALYSIS_PROMPT,
    reviewPrompt: REVIEW_PROMPT, visualInstructions, templateInstructions, narrativePolicy: JSON.stringify(narrativePolicy)};
  return Object.fromEntries(['analysis', 'visual', 'review'].map(stage => [stage, renderPrompt(`${stage}-stage`, values)]));
}
export function buildPromptBundle(templateInstructions = '') {
  const values = {systemPrompt: SYSTEM_PROMPT, templateInstructions, narrationPolicy: JSON.stringify(SHORTS_EDITORIAL_POLICY, null, 2),
    creativePolicy: readFileSync(new URL('../docs/creative-system.md', import.meta.url), 'utf8')};
  return {...buildStagePrompts(VISUAL_SYSTEM_PROMPT, templateInstructions),
    storyboardReview: renderPrompt('storyboard-review', values), storyboardImprove: renderPrompt('storyboard-improve', values),
    diagramRepair: renderPrompt('diagram-repair', values), photoQueryRepair: renderPrompt('photo-query-repair'),
    tts: renderPrompt('tts'), templateTts: renderPrompt('template-tts')};
}
