import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';
import {ACTIONS,HAND_SHAPES,MOUTH_SHAPES,EXPRESSIONS,PresenterSchema,GeneratedPresenterSchema,normalizeGeneratedPresenter,validatePresenter,validateScenePresenter,compilePresenter,statePose} from '../src/presenter/api.ts';
import {phonemesToMouthCues} from '../src/presenter/tts.ts';
import {REST_POSE,solveArm} from '../src/presenter/rig.ts';
import {CandidateSchema,SYSTEM_PROMPT} from '../scripts/generate-candidates.mjs';
import {enrichVisuals} from '../scripts/resolve-visuals.mjs';
import {describeCandidate} from '../scripts/describe-candidates.mjs';

const cue={start:1,end:3,name:'explain'};
test('empty public tracks, gaps and exclusive end return to default',()=>{
  assert.deepEqual(compilePresenter({})(0),REST_POSE);
  const evaluate=compilePresenter({actions:[cue]},4);
  for(const t of [0,1,3,4,-1,NaN]) assert.equal(evaluate(t).rightHandY,690);
  assert.ok(evaluate(2).rightHandY<600);
  const p=evaluate(2); evaluate(0); assert.deepEqual(evaluate(2),p);
});
test('all semantic action/hand/expression/mouth cases are supported',()=>{
  for(const action of ACTIONS) for(const side of ['left','right']) for(const hand of HAND_SHAPES) {
    const p=statePose({action,side,hand});
    assert.equal(p[`${side}HandShape`],action==='idle'?'relaxed':hand);
    const a=solveArm(side,{x:p[`${side}HandX`],y:p[`${side}HandY`]});
    assert.ok(Number.isFinite(a.elbow.x));
  }
  for(const expression of EXPRESSIONS) for(const shape of MOUTH_SHAPES) {
    const p=statePose({expression,mouth:{shape,intensity:.6}});
    assert.equal(p.expression,expression); assert.equal(p.mouthShape,shape);
  }
});
test('unknown keys, cases, NaN, negative/reversed/out-of-range and overlapping intervals fail closed',()=>{
  for(const input of [
    {actions:[{...cue,name:'dance'}]}, {actions:[{...cue,side:'both'}]},
    {actions:[{...cue,hand:'claw'}]}, {actions:[{...cue,intensity:NaN}]},
    {actions:[{...cue,start:-1}]}, {actions:[{...cue,start:3}]},
    {actions:[{...cue,end:5}]}, {actions:[cue,{...cue,start:2}]},
    {expressions:[{...cue,name:'angry'}]}, {mouths:[{start:0,end:1,shape:'E'}]},
    {mouths:[{start:0,end:2,shape:'A'},{start:1,end:3,shape:'O'}]},
    {actions:[{...cue,jointX:44}]}, {version:2}, {code:'alert(1)'},
  ]) assert.throws(()=>validatePresenter(input,4));
  assert.doesNotThrow(()=>validatePresenter({actions:[{...cue,start:3,end:4},cue]},4));
});
test('short adjacent gestures return their hands below the crop before replacing presets',()=>{
  const evaluate=compilePresenter({actions:[{start:0,end:.3,name:'point'},{start:.3,end:.6,name:'emphasize'}]},1);
  assert.equal(evaluate(.3).rightHandY,690);
  assert.equal(evaluate(.3).rightHandShape,'relaxed');
  assert.equal(evaluate(.45).rightHandShape,'fist');
  assert.ok(Math.abs(evaluate(.2999).rightHandY-evaluate(.3001).rightHandY)<.01);
});
test('speech mouth takes precedence and returns to the independent expression',()=>{
  const evaluate=compilePresenter({expressions:[{start:0,end:3,name:'smile'}],mouths:[{start:1,end:1.5,shape:'M',intensity:0},{start:1.5,end:2,shape:'O',intensity:.8}]},3);
  assert.equal(evaluate(1).mouthShape,'M'); assert.equal(evaluate(1.5).mouthShape,'O');
  assert.equal(evaluate(2).mouthShape,'rest'); assert.equal(evaluate(2).expression,'smile');
});
test('scene validation reserves a white presenter page and forbids silently hidden visuals',()=>{
  assert.doesNotThrow(()=>validateScenePresenter({}));
  assert.doesNotThrow(()=>validateScenePresenter({layout:'presenter-bust',presenter:{}}));
  for(const scene of [{layout:'presenter-bust'}, {presenter:{}}, {layout:'presenter-bust',presenter:{},commonPage:'blog-cta-v1'}, {layout:'presenter-bust',presenter:{},visual:{type:'photo'}}]) assert.throws(()=>validateScenePresenter(scene));
});
test('strict generator contract is serializable, normalizes nulls and excludes generated phonemes',()=>{
  const input={version:1,actions:[{...cue,side:null,hand:null,intensity:null}],expressions:[]};
  assert.deepEqual(normalizeGeneratedPresenter(input),{version:1,actions:[cue],expressions:[]});
  assert.throws(()=>GeneratedPresenterSchema.parse({...input,mouths:[]}));
  const format=zodTextFormat(CandidateSchema,'candidate');
  const serialized=JSON.stringify(format);
  for(const id of ['presenter-bust','palmUp','emphasize','surprised']) assert.ok(serialized.includes(id));
  assert.match(SYSTEM_PROMPT,/발음 타이밍을 추측하지/);
});
test('candidate enrichment and review Markdown preserve the normalized public tracks',async()=>{
  const presenter={version:1,actions:[{...cue,side:null,hand:null,intensity:null}],expressions:[]};
  const result=await enrichVisuals({title:'test',scenes:[{layout:'presenter-bust',presenter,visual:{type:'none'},camera:{motion:'static',startProgress:0,endProgress:1},headline:'검토',narration:'설명합니다.'}]},{search:()=>{throw Error('Unexpected photo search');}});
  assert.deepEqual(result.scenes[0].presenter.actions,[cue]);
  assert.match(describeCandidate({scenes:result.scenes},'demo.json'),/explain/);
});
test('TTS adapter accepts timed basic phonemes, preserves closures, rejects guessed/unknown input',()=>{
  const mouths=phonemesToMouthCues(['ㅗ','ㅣ','ㅏ','ㅁ','sil'].map((symbol,i)=>({start:i*.2,end:(i+1)*.2,symbol})),1);
  assert.deepEqual(mouths.map(m=>m.shape),['O','I','A','M','rest']);
  assert.equal(mouths[3].intensity,0);
  assert.throws(()=>phonemesToMouthCues([{start:0,end:1,symbol:'word'}],1));
  assert.throws(()=>phonemesToMouthCues([{start:0,end:2,symbol:'a'}],1));
});
test('published JSON schema matches the runtime source',()=>{
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../docs/presenter.schema.json',import.meta.url),'utf8')),z.toJSONSchema(PresenterSchema));
});
test('direct motion controls are independent and clamped without changing the v1 candidate schema',()=>{
  const p=statePose({motion:{nod:5,tilt:-30,blink:2,browLeft:-2,browRight:.5}});
  assert.equal(p.headNod,1); assert.equal(p.headTilt,-12); assert.equal(p.blink,1);
  assert.equal(p.browLeft,-1); assert.equal(p.browRight,.5);
  assert.equal(statePose({motion:{nod:NaN}}).headNod,0);
  assert.throws(()=>validatePresenter({motion:{nod:1}}));
});
test('authored actions produce one bounded nod, return to rest and support random access',()=>{
  const evaluate=compilePresenter({actions:[{start:1,end:3,name:'emphasize'}]},4);
  assert.ok(evaluate(1.5).headNod>0);
  for(const t of [0,1,2,2.9,3,4]) assert.equal(evaluate(t).headNod,0);
  const saved=evaluate(1.4); evaluate(3); assert.deepEqual(evaluate(1.4),saved);
  assert.equal(compilePresenter({actions:[{start:1,end:3,name:'idle'}]},4)(1.5).headNod,0);
});
test('eye and brow transitions blend at expression boundaries including adjacent cues',()=>{
  const evaluate=compilePresenter({expressions:[{start:0,end:1,name:'smile'},{start:1,end:2,name:'curious'}]},3);
  assert.equal(evaluate(1).expressionFrom,'smile'); assert.equal(evaluate(1).expressionMix,0);
  assert.ok(Math.abs(evaluate(1.09).expressionMix-.5)<1e-8);
  assert.equal(evaluate(1.3).expressionMix,1);
  assert.equal(evaluate(2).expressionFrom,'curious'); assert.equal(evaluate(2).expression,'neutral');
});
