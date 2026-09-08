import test from 'node:test';
import assert from 'node:assert/strict';
import {coveredFraction} from '../src/visuals/overlap-area.ts';
import {assertDiagramLayout} from '../src/visuals/layout-guard.ts';
import {sketchPoints} from '../src/visuals/notebook-style.ts';
const rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const node=(id,extra={})=>({id,shape:'rect',label:'',x:300,y:250,width:100,height:100,fill:'gray',rotation:0,scale:1,opacity:1,noiseAmount:0,...extra});
const policy={theme:'error-notebook',maxStickerOverlap:.2};
test('overlap is relative to sticker area; union avoids double-counting and accumulates distinct coverage',()=>{
  const sticker=rect(0,0,100,100), edge=rect(80,0,100,100);
  assert.ok(Math.abs(coveredFraction(sticker,[edge])-.2)<1e-8);
  assert.ok(Math.abs(coveredFraction(sticker,[edge,edge])-.2)<1e-8);
  assert.ok(Math.abs(coveredFraction(sticker,[edge,rect(0,0,10,100)])-.3)<1e-8);
  assert.equal(coveredFraction(sticker,[rect(100,0,10,100)]),0);
  assert.equal(coveredFraction(sticker,[rect(-5,-5,110,110)]),1);
  const rotate=points=>points.map(([x,y])=>[(x-y)/Math.sqrt(2),(x+y)/Math.sqrt(2)]);
  assert.ok(Math.abs(coveredFraction(rotate(sticker),[rotate(edge)])-.2)<1e-8);
});
test('only opted-in stickers can overlap a line; ordinary line-object checks stay strict',()=>{
  const sticker=node('sticker',{role:'sticker'}), line=node('line',{shape:'line',fill:'none',width:180,height:1});
  assert.doesNotThrow(()=>assertDiagramLayout([line,sticker],.5,policy));
  assert.throws(()=>assertDiagramLayout([line,sticker],.5),/sticker-policy/);
  assert.throws(()=>assertDiagramLayout([line,node('ordinary')],.5,policy),/line-object/);
});
test('threshold boundary includes stroke; each sticker and union are checked',()=>{
  const sticker=node('sticker',{role:'sticker'});
  // Footprints are 103 wide: displacement 82.4 gives exactly 20% overlap.
  assert.doesNotThrow(()=>assertDiagramLayout([sticker,node('edge',{x:382.4})],.5,policy));
  assert.throws(()=>assertDiagramLayout([sticker,node('edge',{x:382.3})],.5,policy),/sticker-overlap.*20/);
  assert.throws(()=>assertDiagramLayout([sticker,node('left',{x:210}),node('right',{x:390})],.5,policy),/sticker-overlap/);
  assert.throws(()=>assertDiagramLayout([node('large',{width:250}),node('tiny',{role:'sticker',width:20})],.5,policy),/100.00%/);
});
test('motion, hidden states and text protections are not bypassed by the theme',()=>{
  const sticker=node('sticker',{role:'sticker'}), edge=node('edge',{x:390});
  assert.doesNotThrow(()=>assertDiagramLayout([sticker,{...edge,opacity:0}],.5,policy));
  assert.throws(()=>assertDiagramLayout([sticker,{...edge,scale:1.4}],.5,policy),/sticker-overlap/);
  assert.throws(()=>assertDiagramLayout([{...sticker,label:'기록'},node('line',{shape:'line',width:180,height:1,fill:'none'})],.5,policy),/line-text/);
  assert.throws(()=>assertDiagramLayout([sticker,node('text',{shape:'text',fill:'none',label:'받침'})],.5,policy),/text-object/);
  assert.throws(()=>assertDiagramLayout([{...sticker,x:50,rotation:45}],.5,policy),/safe-area/);
});
test('doodle shape is deterministic and remains within the declared footprint',()=>{
  const n=node('stable');
  assert.deepEqual(sketchPoints(n),sketchPoints({...n,x:400,rotation:30}));
  assert.notDeepEqual(sketchPoints(n),sketchPoints({...n,id:'different'}));
  for(const [x,y] of sketchPoints(n)) {assert.ok(Math.abs(x)<=50);assert.ok(Math.abs(y)<=50);}
  const line=node('edge',{shape:'line',width:200,height:1});
  assert.deepEqual(sketchPoints(line)[0],[-100,0]);
  assert.deepEqual(sketchPoints(line).at(-1),[100,0]);
});
