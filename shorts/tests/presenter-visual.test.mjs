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
  assert.equal(ids.length,10); assert.equal(new Set(ids).size,ids.length);
  for(const [,ref] of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(ref));
});
test('ink noise is stable within an ink frame and local to character layers, not the white page or frame',()=>{
  const render=pose=>renderToStaticMarkup(React.createElement(Presenter,{pose}));
  const rest=render({}), nod=render({headNod:1,headTilt:3,blink:.5});
  const filter=svg=>svg.match(/<filter[\s\S]*?<\/filter>/)[0];
  assert.equal(filter(rest),filter(nod)); assert.equal(rest,render({}));
  assert.match(rest,/<feTurbulence[^>]*seed="23"/);
  assert.match(rest,/<feDisplacementMap[^>]*scale="3.2"/);
  assert.match(rest,/data-part="head"[^>]*><g data-part="head-ink" filter=/);
  assert.match(rest,/data-part="body-ink" filter=/);
  assert.doesNotMatch(rest,/<(?:rect|circle)[^>]*filter=/);
});
test('manufactured glasses have identical rims, no noise ancestor, and cancel nod squash',()=>{
  for(const headNod of [0,.5,1]) {
    const svg=renderToStaticMarkup(React.createElement(Presenter,{pose:{headNod,inkFrame:47}}));
    const rims=[...svg.matchAll(/<rect data-part="lens-rim"[^>]*>/g)].map(m=>m[0]);
    assert.equal(rims.length,2);
    assert.equal(rims[0].replace(/x="[^"]+"/,''),rims[1].replace(/x="[^"]+"/,''));
    const ancestors=[];
    for(const m of svg.matchAll(/<\/?g\b[^>]*>/g)) {
      if(m[0].includes('data-part="glasses"')) break;
      if(m[0].startsWith('</')) ancestors.pop(); else ancestors.push(m[0]);
    }
    assert.ok(ancestors.some(g=>g.includes('data-part="head"')));
    assert.ok(ancestors.every(g=>!g.includes('filter=')));
    const scale=Number(svg.match(/data-part="glasses"[^>]*scale\(1 ([\d.]+)\)/)[1]);
    assert.ok(Math.abs(scale*(1-headNod*.018)-1)<1e-12);
    assert.ok(svg.indexOf('data-part="collar"')<svg.indexOf('data-part="neck-front"'));
  }
});
test('changing ink frame changes texture but never changes glasses geometry',()=>{
  const render=inkFrame=>renderToStaticMarkup(React.createElement(Presenter,{pose:{inkFrame}}));
  const a=render(0),b=render(1);
  assert.notEqual(a.match(/seed="\d+"/)[0],b.match(/seed="\d+"/)[0]);
  assert.equal(a.match(/data-part="glasses"[\s\S]*?<\/g>/)[0],b.match(/data-part="glasses"[\s\S]*?<\/g>/)[0]);
});
test('collar panels are closed, uninterrupted faces painted over their underfold',()=>{
  const svg=renderToStaticMarkup(React.createElement(Presenter));
  for(const side of ['left','right']) {
    const path=svg.match(new RegExp(`data-part="collar-${side}" d="([^"]+)"`))[1];
    assert.equal((path.match(/M/g)||[]).length,1); assert.ok(path.endsWith('Z'));
    assert.ok(svg.indexOf('collar-underfold')<svg.indexOf(`collar-${side}`));
  }
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
