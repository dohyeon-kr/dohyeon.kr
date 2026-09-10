import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workspaceAssetIds,getWorkspaceAsset,workspaceAssetPath,placeWorkspaceAsset,placeWorkspaceAtAnchor,validateWorkspaceScene} from '../src/visuals/workspace-assets.mjs';

test('workspace catalog exposes independent SVG files',()=>{
  assert.ok(workspaceAssetIds.length>=20);
  for(const id of workspaceAssetIds){const meta=getWorkspaceAsset(id);const svg=readFileSync(new URL(`../public/stickers/workspace-svg/${meta.file}`,import.meta.url),'utf8');assert.match(svg,/^<svg/);assert.match(svg,new RegExp(`viewBox="${meta.viewBox.join(' ')}"`));assert.doesNotMatch(svg,/<image|<filter|<script|<foreignObject|data:image/i);assert.equal(workspaceAssetPath(id),`stickers/workspace-svg/${meta.file}`);}
});
test('scribble is forbidden and labels require a label area',()=>{assert.throws(()=>placeWorkspaceAsset({asset:'desktop',x:0,y:0,width:200,scribble:true}));assert.throws(()=>placeWorkspaceAsset({asset:'desktop',x:0,y:0,width:200,label:'x'}));assert.equal(placeWorkspaceAsset({asset:'speech-bubble',x:0,y:0,width:240,label:'안녕하세요'}).label,'안녕하세요');});
test('anchor placement aligns the requested point',()=>{const p=placeWorkspaceAtAnchor({asset:'mouse-pointer',anchor:'tip',at:[300,200],width:96});assert.equal(p.x,288);assert.equal(p.y,190);});
test('scene contract is deterministic and bounded',()=>{const scene={version:1,scribble:false,nodes:[{id:'desk',asset:'desk',x:100,y:200,width:300,scribble:false},{id:'plant',asset:'plant',x:180,y:80,width:120,scribble:false}]};assert.equal(validateWorkspaceScene(scene),scene);assert.throws(()=>validateWorkspaceScene({...scene,scribble:true}));});
