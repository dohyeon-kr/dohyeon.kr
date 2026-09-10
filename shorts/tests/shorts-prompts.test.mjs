import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPromptBundle, renderPrompt} from '../scripts/shorts-prompts.mjs';
import {imageGenerationGuard} from '../scripts/shorts-openai.mjs';
import {previewScale} from '../scripts/storyboard-renderer.mjs';

test('shared prompt bundle resolves every stage without unresolved slots',()=>{
  const prompts=buildPromptBundle();assert.equal(Object.keys(prompts).length,9);
  for(const prompt of Object.values(prompts)) {assert.ok(prompt.length>30);assert.doesNotMatch(prompt,/\{\{[a-zA-Z]+\}\}/);}
  assert.doesNotMatch(prompts.visual,/목표는 글을 요약해/);
  assert.match(prompts.visual,/요약·추가·재작성하지 않는다/);
  assert.throws(()=>renderPrompt('analysis'),/Missing prompt value/);
  assert.throws(()=>renderPrompt('../outside'),/Invalid prompt name/);
  assert.match(renderPrompt('analysis',{trust:'{{untrusted}}'}),/\{\{untrusted\}\}/);
});

test('instruction-to-ui leakage policy reaches UI-generating and reviewing prompts',()=>{
  const prompts=buildPromptBundle();
  for(const stage of ['visual','review','storyboardReview','storyboardImprove']) {
    assert.match(prompts[stage],/Instruction-to-UI Leakage/,stage);
    assert.match(prompts[stage],/Instruction을 Copy로 번역하지 말고, Instruction을 UI로 구현한다/,stage);
    assert.match(prompts[stage],/DEBUG_METADATA_LEAK/,stage);
  }
  assert.doesNotMatch(prompts.analysis,/Instruction-to-UI Leakage/);
});

test('image generation is blocked before network; text, image inputs and speech pass',async()=>{
  const calls=[];const guarded=imageGenerationGuard(async(...args)=>{calls.push(args);return new Response('{}');});
  for(const operation of ['generations','edits','variations']) await assert.rejects(guarded(`https://api.openai.com/v1/images/${operation}`,{method:'POST'}),/disabled/);
  await assert.rejects(guarded('https://api.openai.com/v1/responses',{body:JSON.stringify({tools:[{type:'image_generation'}]})}),/disabled/);
  await assert.rejects(guarded(new Request('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify({tools:[{type:'image_generation'}]})})),/disabled/);
  assert.equal(calls.length,0);
  for(const endpoint of ['responses','audio/speech','audio/transcriptions']) await guarded(`https://api.openai.com/v1/${endpoint}`,{method:'POST',body:JSON.stringify({input:[{type:'input_image',image_url:'https://example.com/photo.jpg'}]})});
  assert.equal(calls.length,3);
});
test('preview scales keep supported small and full-size choices',()=>{
  assert.equal(previewScale('0.5'),0.5);assert.equal(previewScale('0.25'),0.25);assert.equal(previewScale('1'),1);
  for(const value of ['0','-1','NaN','2']) assert.throws(()=>previewScale(value),/SHORTS_PREVIEW_SCALE/);
});

test('selected template rules reach visual, JSON review and storyboard review only', async()=>{
  const {getTemplate}=await import('../src/templates/registry.ts');
  const instructions=getTemplate('notebook-grid').instructions;
  const prompts=buildPromptBundle(instructions);
  for(const stage of ['visual','review','storyboardReview','storyboardImprove']) assert.ok(prompts[stage].includes(instructions),stage);
  assert.ok(!prompts.analysis.includes(instructions));
});
