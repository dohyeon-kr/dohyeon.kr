import assert from 'node:assert/strict';
import test from 'node:test';
import {diagramState, validateDiagram} from '../src/visuals/diagram-spec.ts';
const fixture = () => ({version: 1, renderer: 'remotion', description: '입력의 이동', nodes: [{id:'input', shape:'circle', label:'입력', x:100, y:200, width:80, height:80, fill:'none'}], events:[{target:'input', property:'x', from:100, to:500, start:0.2, end:0.8}]});
test('frame evaluation supports initial, intermediate, final and reverse seeking', () => {
  const spec = validateDiagram(fixture());
  assert.equal(diagramState(spec, 0)[0].x, 100);
  assert.equal(diagramState(spec, 1)[0].x, 500);
  assert.ok(Math.abs(diagramState(spec, .5)[0].x - 300) < 1e-8);
  assert.equal(diagramState(spec, 0)[0].x, 100);
});
test('both backends consume exactly the same evaluated states', () => {
  const a = fixture(); const b = {...a, renderer:'motion-canvas'};
  assert.deepEqual(diagramState(validateDiagram(a), .65), diagramState(validateDiagram(b), .65));
});
test('reject duplicate IDs, unknown targets, overlap and invalid time/value ranges', () => {
  for (const mutate of [
    s => s.nodes.push({...s.nodes[0]}),
    s => s.events[0].target = 'missing',
    s => s.events.push({...s.events[0]}),
    s => s.events[0].end = .1,
    s => {s.events[0].property = 'opacity'; s.events[0].to = 2;},
    s => s.nodes[0].x = Infinity,
  ]) {const s = fixture(); mutate(s); assert.throws(() => validateDiagram(s));}
});
test('event gaps hold previous result, later events override only when started', () => {
  const s = fixture(); s.events[0].end = .4;
  s.events.push({target:'input',property:'x',from:500,to:200,start:.7,end:1});
  assert.equal(diagramState(validateDiagram(s), .6)[0].x, 500);
});
