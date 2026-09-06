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
test('multiple shaded avatars have unique gradient IDs and valid references',()=>{
  const svg=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(Presenter),React.createElement(Presenter,{expression:'curious'})));
  const ids=[...svg.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,8); assert.equal(new Set(ids).size,ids.length);
  for(const [,ref] of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(ref));
});
