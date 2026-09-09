import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,parseDraft} from '../review/model.ts';
import {diagramState} from '../src/visuals/diagram-spec.ts';
import {assertDiagramLayout,resolveConnectors,layoutSampleTimes} from '../src/visuals/layout-guard.ts';
const base=JSON.parse(await readFile(new URL('../content/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/candidate-01.json',import.meta.url)));
test('review JSON roundtrips geometry, page layout and discussion without changing narration',()=>{
 const d=fresh(base);d.layouts['0:photo']={dx:20,dy:-35,scale:1.1};d.notes['0']='사진 크기를 함께 검토합니다.';d.candidate.scenes[1].diagramSpec.nodes[0].x+=10;
 const restored=parseDraft(JSON.stringify(d),base);assert.deepEqual(restored,d);assert.equal(restored.candidate.scenes[1].narration,base.scenes[1].narration);assert.notEqual(d.candidate.scenes[1].diagramSpec.nodes[0].x,base.scenes[1].diagramSpec.nodes[0].x);
});
test('review refuses stale source, malformed layout, narration edits and unknown attachment targets',()=>{
 for(const mutate of [d=>d.sourceFingerprint='stale',d=>d.layouts['0:photo']={dx:0,dy:0,scale:0},d=>d.candidate.scenes[1].narration='rewrite',d=>d.candidate.scenes[1].diagramSpec.nodes.find(n=>n.role==='sticker').stickerAttachment={target:'missing',preset:'edge-note'}]){
 const d=fresh(base);mutate(d);assert.throws(()=>parseDraft(JSON.stringify(d),base));
 }
});
test('all initial review diagrams pass the production intermediate-state geometry gate',()=>{
 for(const s of base.scenes)if(s.diagramSpec)for(const t of layoutSampleTimes(s.diagramSpec))assertDiagramLayout(resolveConnectors(diagramState(s.diagramSpec,t)),t,s.diagramSpec.notebook);
 const s=structuredClone(base.scenes[1].diagramSpec);s.nodes[0].x=0;
 assert.throws(()=>assertDiagramLayout(resolveConnectors(diagramState(s,1)),1,s.notebook),/layout:/);
});
