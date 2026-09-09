import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {wordsToPresenter} from '../src/presenter/word-timing.ts';
import {compilePresenter} from '../src/presenter/api.ts';
import {alignPresenter} from '../scripts/align-presenter.mjs';
const options={position:'bottom-right',lipSync:'word-timestamps',nod:'speech'};

test('mixed words keep raw tokens and final-audio intervals', () => {
 const raw=['SDK가','API를','Bruno에서','Git으로','traceparent로','PR에','1.5배','Foo42'].map((word,i)=>({word,start:i+.1,end:i+.9}));
 const before=structuredClone(raw);
 const tracks=wordsToPresenter(raw,8,options);
 assert.deepEqual(raw,before);
 assert.ok(tracks.mouths.length>0);assert.ok(tracks.actions.length>0);
 assert.ok(tracks.mouths.every(c=>raw.some(w=>c.start>=w.start-1e-8 && c.end<=w.end+1e-8)));
 const pose=compilePresenter(tracks,8);
 for(let i=0;i<8;i++) assert.equal(pose(i+.99).mouthShape,'rest');
 assert.doesNotThrow(()=>wordsToPresenter([{word:'漢字',start:0,end:1}],1,{lipSync:'none',nod:'speech'}));
 for(const d of [0,NaN,Infinity]) assert.throws(()=>wordsToPresenter(raw,d,options),/audio duration/);
});

test('SDK가 succeeds once; unsupported script fails once; diagnostics retain provider text',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-mixed-'));
 try {
  const audioFile=path.join(dir,'audio.mp3'),reportFile=path.join(dir,'report.json');
  await fs.writeFile(audioFile,'fixture');
  for(const token of ['SDK가','漢字']) {
   let calls=0;
   const raw=[{word:token,start:0,end:1}];
   const client={audio:{transcriptions:{create:async request=>{request.file.destroy();calls++;assert.equal(request.prompt,token);return {text:token,words:raw};}}}};
   const run=()=>alignPresenter({client,audioFile,reportFile,duration:1,narration:token,options,scene:{}});
   if(token==='SDK가') await run(); else await assert.rejects(run,/Unsupported speech text/);
   const report=JSON.parse(await fs.readFile(reportFile));
   assert.equal(calls,1);assert.equal(report.version,3);assert.equal(report.attempts.length,1);
   assert.deepEqual(report.attempts[0].words,raw);
   if(token==='SDK가') {
    assert.deepEqual(report.words,raw);assert.equal(report.text,token);
    assert.equal(report.readings[0].text,'에스디케이가');
    assert.equal(report.readings[0].start,0);assert.equal(report.readings[0].end,1);
    assert.equal(report.readings[0].substitutions[0].method,'lexicon');
   } else assert.equal(report.attempts[0].retryable,false);
  }
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
