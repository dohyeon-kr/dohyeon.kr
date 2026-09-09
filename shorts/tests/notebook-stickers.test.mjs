import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDiagramLayout} from '../src/visuals/layout-guard.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {NOTEBOOK_ASSETS,STICKER_USAGE} from '../src/visuals/notebook-catalog.ts';
const policy={theme:'error-notebook',maxStickerOverlap:.2};
const node=(id,x,y,width,height,extra={})=>({id,x,y,width,height,shape:'rect',label:'',fill:'none',rotation:0,scale:1,opacity:1,noiseAmount:0,...extra});
const target=node('photo',400,300,300,200);
const tape=node('tape',400,200,140,60,{role:'sticker',stickerAsset:'tape',stickerAttachment:{target:'photo',preset:'tape'}});
test('tape straddles only its declared target; unrelated coverage and text protection remain strict',()=>{
 assert.doesNotThrow(()=>assertDiagramLayout([target,tape],.5,policy));
 assert.throws(()=>assertDiagramLayout([target,{...tape,y:300}],.5,policy),/sticker-attachment/);
 assert.throws(()=>assertDiagramLayout([target,{...tape,y:100}],.5,policy),/sticker-attachment/);
 assert.throws(()=>assertDiagramLayout([target,tape,node('other',400,170,200,70)],.5,policy),/sticker-overlap/);
 assert.throws(()=>assertDiagramLayout([{...target,opacity:0},tape],.5,policy),/sticker-target/);
 assert.throws(()=>assertDiagramLayout([target,tape,node('words',400,200,150,70,{shape:'text',label:'보호'})],.5,policy),/text-object/);
 // Reverse seeking and the rotated target use the same pure geometry.
 const rotated=[{...target,rotation:15},{...tape,x:400+100*Math.sin(Math.PI/12),y:300-100*Math.cos(Math.PI/12),rotation:15}];
 assert.doesNotThrow(()=>assertDiagramLayout(rotated,.75,policy));
 assert.doesNotThrow(()=>assertDiagramLayout([target,tape],.1,policy));
});
test('attachment rejects unknown targets and inappropriate assets; atlas crop and usage cover every asset',()=>{
 const spec={version:1,renderer:'remotion',notebook:policy,description:'taped photograph',nodes:[target,tape],events:[]};
 assert.doesNotThrow(()=>validateDiagram(spec));
 for(const patch of [{stickerAttachment:{target:'missing',preset:'tape'}},{stickerAsset:'star'},{label:'금지'}]) assert.throws(()=>validateDiagram({...spec,nodes:[target,{...tape,...patch}]}));
 for(const [id,s] of Object.entries(NOTEBOOK_ASSETS)) {
  assert.ok(STICKER_USAGE[id]);assert.ok(s.crop[0]>=0 && s.crop[1]>=0);
  assert.ok(s.crop[0]+s.crop[2]<=s.sheet[0] && s.crop[1]+s.crop[3]<=s.sheet[1]);
 }
});
