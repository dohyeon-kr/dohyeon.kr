import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interactionAssetIds, getInteractionAsset, interactionAssetPath, placeInteractionAtAnchor} from '../src/visuals/workspace-interactions.mjs';

test('all four entries are actual, independent, monochrome vectors', () => {
  assert.equal(interactionAssetIds.length, 4);
  const catalog=JSON.parse(readFileSync(new URL('../public/stickers/workspace-svg/interaction-catalog.json',import.meta.url),'utf8'));
  for (const id of interactionAssetIds) {
    const meta = getInteractionAsset(id), svg = readFileSync(new URL(`../public/stickers/workspace-svg/${meta.file}`, import.meta.url), 'utf8');
    assert.deepEqual(meta,catalog.assets[id]);
    assert.match(svg, new RegExp(`viewBox="${meta.viewBox.join(' ')}"`));
    assert.match(svg, /stroke-linejoin="miter"/);
    assert.doesNotMatch(svg, /<image|<text|<filter|<script|<foreignObject|data:image|\b(?:rx|ry|href)=/i);
    for (const [,c] of svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi))
      assert.ok(c.slice(1,3)===c.slice(3,5) && c.slice(3,5)===c.slice(5,7));
    assert.equal(interactionAssetPath(id), `stickers/workspace-svg/${meta.file}`);
  }
});
test('malformed IDs and anchors fail', () => {
  for (const id of ['__proto__','constructor','../../secret.svg','missing']) assert.throws(()=>getInteractionAsset(id));
  assert.throws(()=>placeInteractionAtAnchor({asset:'mouse',anchor:'tip',at:[100,100],width:240}));
});
test('metadata is returned as a defensive copy', () => {
  const meta = getInteractionAsset('mouse'); meta.anchors.wheel[0]=0;
  assert.equal(getInteractionAsset('mouse').anchors.wheel[0],120);
});
test('hand tip is placed at the requested point', () => {
  const hand = placeInteractionAtAnchor({asset:'pointing-hand',at:[400,250],width:144});
  assert.deepEqual([hand.x,hand.y],[337,235]);
});
test('rotation and scaling preserve the target anchor', () => {
  for (const angle of [0,45,90,180,270]) {
    const p = placeInteractionAtAnchor({asset:'mouse-pointer',at:[320,240],width:192,scale:.75,rotation:angle});
    const r=angle*Math.PI/180,s=1.5;
    assert.ok(Math.abs(p.x+s*(12*Math.cos(r)-10*Math.sin(r))-320)<1e-8);
    assert.ok(Math.abs(p.y+s*(12*Math.sin(r)+10*Math.cos(r))-240)<1e-8);
  }
});
test('scribble and invalid dimensions fail', () => {
  const base={asset:'pointing-hand',at:[400,250],width:144};
  for(const patch of [{scribble:true},{width:0},{width:NaN},{rotation:Infinity},{scale:0},{scale:5},{at:[0]}])
    assert.throws(()=>placeInteractionAtAnchor({...base,...patch}));
});
test('bubble text slot stays within its rectangular body', () => {
  const [x,y,w,h]=getInteractionAsset('speech-bubble').labelArea;
  assert.ok(x>18&&y>22&&x+w<222&&y+h<140);
});
