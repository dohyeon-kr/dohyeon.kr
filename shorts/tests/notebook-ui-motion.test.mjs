import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileNotebookUiMotion,validateNotebookUiMotion,arrowStrokeProgress,validateSceneUiMotion} from '../src/visuals/notebook-ui-motion.ts';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
const manifest=JSON.parse(fs.readFileSync(new URL('../content/naneun-wae-storybookeul-aejail-doguro-sayonghagiro-haessneunga/candidate-01.json',import.meta.url)));
test('actual scenes retain UI tracks through structured output parsing',()=>{
 const parsed=CandidateSchema.parse({...manifest.candidate,scenes:manifest.scenes.filter(s=>!s.commonPage)});
 assert.deepEqual(parsed.scenes.filter(s=>s.uiMotion).map(s=>s.uiMotion),manifest.scenes.filter(s=>s.uiMotion).map(s=>s.uiMotion));
 assert.ok(zodTextFormat(CandidateSchema,'candidate').schema);
});
test('arrow body completes before two independent head strokes',()=>{
 assert.deepEqual(arrowStrokeProgress(0),[0,0,0]);
 assert.deepEqual(arrowStrokeProgress(.35),[.5,0,0]);
 assert.deepEqual(arrowStrokeProgress(.7),[1,0,0]);
 assert.ok(arrowStrokeProgress(.8)[1]>0);assert.equal(arrowStrokeProgress(.8)[2],0);
 assert.deepEqual(arrowStrokeProgress(1),[1,1,1]);
});
test('actual scene states and intermediate poses remain deterministic and within canvas',()=>{
 for(const scene of manifest.scenes.filter(s=>s.uiMotion)){
  validateSceneUiMotion(scene);const evaluate=compileNotebookUiMotion(scene.uiMotion);
  assert.deepEqual(evaluate(.45),evaluate(.45));
  for(let step=0;step<=100;step++)for(const n of evaluate(step/100)){
   assert.ok(n.x>=0&&n.y>=0&&n.x+n.width<=scene.uiMotion.width,`${n.id} outside canvas`);
  }
  for(const s of scene.uiMotion.states??[]){assert.equal(evaluate(s.at).find(n=>n.id===s.target).asset,s.asset);}
 }
 const popup=compileNotebookUiMotion(manifest.scenes[5].uiMotion);
 assert.equal(popup(.39).find(n=>n.id==='popup').opacity,0);
 assert.equal(popup(.5).find(n=>n.id==='popup').opacity,1);
});
test('reject broken tracks, invalid state geometry and simultaneous image',()=>{
 const input=manifest.scenes[5].uiMotion;
 let bad=structuredClone(input);bad.events.push({...bad.events[0]});assert.throws(()=>validateNotebookUiMotion(bad),/Overlapping/);
 bad=structuredClone(input);bad.events[0].from+=10;assert.throws(()=>validateNotebookUiMotion(bad),/discontinuous/);
 bad=structuredClone(input);bad.states[0].asset='popup';assert.throws(()=>validateNotebookUiMotion(bad),/geometry/);
 assert.throws(()=>validateSceneUiMotion({...manifest.scenes[5],image:{}}),/exclusive/);
});
