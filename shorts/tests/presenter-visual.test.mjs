import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
// Use the declared TypeScript compiler to render source TSX, without a browser or image mock.
const hooks=new Map(['.ts','.tsx'].map(ext=>[ext,require.extensions[ext]]));
for(const ext of hooks.keys()) require.extensions[ext]=(module,filename)=>{
  const {outputText}=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}});
  module._compile(outputText,filename);
};
const {Presenter}=require('../src/presenter/Presenter.tsx');
for(const [ext,hook] of hooks) {if(hook) require.extensions[ext]=hook; else delete require.extensions[ext];}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');

test('all legacy hand/action inputs render a hand-free stable bust with rounded eyebrows',()=>{
  let contour;
  for(const action of ['idle','explain','present','point','emphasize']) for(const hand of ['relaxed','open','palmUp','point','fist']) {
    const svg=renderToStaticMarkup(React.createElement(Presenter,{action,hand,expression:'smile'}));
    assert.doesNotMatch(svg,/data-(?:part|hand-shape)="[^"]*(?:hand|forearm|sleeve)/);
    assert.match(svg,/data-part="eyebrows"[^>]*stroke-linecap="round"/);
    assert.match(svg,/data-part="collar"/);
    const shape=svg.match(/data-part="overshirt"><path d="([^"]+)"/)[1];
    if(contour) assert.equal(shape,contour); contour=shape;
  }
});
test('multiple ink avatars have unique eye clip IDs and valid references',()=>{
  const svg=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(Presenter),React.createElement(Presenter,{expression:'curious'})));
  const ids=[...svg.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,6); assert.equal(new Set(ids).size,ids.length);
  for(const [,ref] of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(ref));
});
test('nod, eyelids and brows are separate layers while glasses and torso stay stable',()=>{
  const render=pose=>renderToStaticMarkup(React.createElement(Presenter,{pose}));
  const rest=render({}), moving=render({headNod:1,blink:1,browLeft:-1,browRight:.5});
  const part=(svg,name)=>svg.match(new RegExp(`data-part="${name}"[^>]*>([\\s\\S]*?)</g>`))?.[1];
  assert.equal(part(rest,'glasses'),part(moving,'glasses'));
  assert.equal(part(rest,'overshirt'),part(moving,'overshirt'));
  assert.notEqual(part(rest,'eyebrows'),part(moving,'eyebrows'));
  assert.match(moving,/data-part="head" transform="translate\(0 9\)/);
  assert.notEqual(rest.match(/data-part="upper-eyelid" d="([^"]+)"/)[1],moving.match(/data-part="upper-eyelid" d="([^"]+)"/)[1]);
  assert.doesNotMatch(moving,/Gradient|NaN|Infinity/);
});
