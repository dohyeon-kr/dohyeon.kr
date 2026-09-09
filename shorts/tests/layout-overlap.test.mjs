import test from 'node:test';
import assert from 'node:assert/strict';
import {coveredRatio, HEADLINE_OVERLAP_LIMIT} from '../src/layout-overlap.ts';
import {validateNotebookUiMotion} from '../src/visuals/notebook-ui-motion.ts';
import {NotebookUiMotionSchema} from '../src/visuals/notebook-ui-motion-schema.ts';
import fs from 'node:fs';
const target={left:0,right:100,top:0,bottom:100};
const strip=(left,right)=>({left,right,top:0,bottom:100});
test('headline coverage uses clipped union area',()=>{
 for(const [obstacles,expected] of [
  [[strip(95,120)],0.05],[[strip(94,120)],0.06],
  [[strip(0,3),strip(97,100)],0.06],[[strip(0,3),strip(0,3)],0.03],
  [[strip(0,3),strip(2,5)],0.05],[[strip(100,120)],0],[[strip(-100,200)],1],
 ]) assert.equal(coveredRatio(target,obstacles),expected);
 assert.equal(HEADLINE_OVERLAP_LIMIT,0.05);
});
test('candidate limits survive schema parsing and reject unsafe values',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../content/naneun-wae-storybookeul-aejail-doguro-sayonghagiro-haessneunga/candidate-01.json',import.meta.url)));
 for(const scene of manifest.scenes.filter(s=>s.uiMotion)){
  assert.equal(NotebookUiMotionSchema.parse(scene.uiMotion).headlineOverlapLimit,0.05);
  validateNotebookUiMotion(scene.uiMotion);
  for(const limit of [-0.01,0.06,NaN]){
   assert.throws(()=>validateNotebookUiMotion({...scene.uiMotion,headlineOverlapLimit:limit}));
   assert.equal(NotebookUiMotionSchema.safeParse({...scene.uiMotion,headlineOverlapLimit:limit}).success,false);
  }
  validateNotebookUiMotion({...scene.uiMotion,headlineOverlapLimit:0});
 }
});
