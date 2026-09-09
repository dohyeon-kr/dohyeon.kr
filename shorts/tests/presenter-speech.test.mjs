import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {wordsToPresenter, normalizeWordTiming} from '../src/presenter/word-timing.ts';
import {compilePresenter} from '../src/presenter/api.ts';
import {overlayTimeline, overlayVisible} from '../src/presenter/overlay.ts';
import {alignPresenter} from '../scripts/align-presenter.mjs';
const options={position:'bottom-right',hideOnCommonCta:true,lipSync:'word-timestamps',nod:'speech'};
const words=[{word:'프로는',start:.4,end:1.2},{word:'어려운',start:1.3,end:2.1},{word:'일을',start:2.2,end:2.8},{word:'해냅니다.',start:3.6,end:4.8}];
test('provider normalization bounds tiny overlap and audio-edge corrections',()=>{
 const raw=[{word:'우리',start:-.01,end:.5},{word:'조직',start:.49,end:1.01}];
 const normalized=normalizeWordTiming(raw,1);
 assert.deepEqual(normalized.words,[{word:'우리',start:0,end:.5},{word:'조직',start:.5,end:1}]);
 assert.equal(normalized.corrections.length,2);
 assert.equal(raw[0].start,-.01);
 assert.doesNotThrow(()=>wordsToPresenter(normalized.words,1,options));
 for(const input of [null,[],[null],[{word:'아',start:0,end:0}], [{word:'아',start:0,end:NaN}], [{word:'아',start:0,end:1.03}], [{word:'아',start:0,end:.6},{word:'이',start:.5,end:1}]]) assert.throws(()=>normalizeWordTiming(input,1));
});
test('invalid alignment retries once and retains both raw responses on failure or recovery',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-retry-'));
 try {
  const audioFile=path.join(dir,'audio.mp3'),reportFile=path.join(dir,'report.json');
  await fs.writeFile(audioFile,'fixture');
  for(const recover of [true,false]) {
   let calls=0;
   const client={audio:{transcriptions:{create:async request=>{request.file.destroy();calls++;return {text:'아',words:recover&&calls===2?[{word:'아',start:0,end:1}]:[{word:'아',start:0,end:0}]};}}}};
   const run=()=>alignPresenter({client,audioFile,reportFile,duration:1,narration:'아',options,scene:{}});
   if(recover) await run(); else await assert.rejects(run,/No positive-duration speech word timestamps/);
   assert.equal(calls,2);
   const report=JSON.parse(await fs.readFile(reportFile));
   assert.equal(report.attempts.length,2);assert.equal(report.attempts[0].words[0].end,0);
   assert.match(report.attempts[0].error,/No positive-duration/);
   assert.equal(Boolean(report.tracks),recover);
  }
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('final-audio word intervals drive Korean vowels, bilabial closure and rest during gaps',()=>{
 const tracks=wordsToPresenter(words,5,options), pose=compilePresenter(tracks,5);
 assert.equal(pose(.1).mouthShape,'rest');
 assert.equal(pose(.41).mouthShape,'M');
 assert.equal(pose(.48).mouthShape,'I');
 assert.equal(pose(1.25).mouthShape,'rest');
 assert.equal(pose(3.2).mouthShape,'rest');
 assert.equal(pose(4.81).mouthShape,'rest');
 assert.equal(pose(5).mouthShape,'rest');
 assert.ok(tracks.mouths.every(c=>words.some(w=>c.start>=w.start-1e-8 && c.end<=w.end+1e-8)));
});
test('nod is bounded to spoken phrases and remains deterministic on seek',()=>{
 const tracks=wordsToPresenter(words,5,options), pose=compilePresenter(tracks,5);
 assert.ok(tracks.actions.length>=2);
 assert.ok(pose(.9).headNod>0);
 assert.equal(pose(3.2).headNod,0);
 assert.equal(pose(5).headNod,0);
 const first=pose(.9);pose(4);assert.deepEqual(pose(.9),first);
});
test('invalid, missing, overlapping or unsupported word timing fails instead of fabricating speech',()=>{
 for(const input of [[],[{word:'아',start:0,end:NaN}],[{word:'아',start:1,end:1}], [{word:'아',start:-.1,end:.2}], [{word:'아',start:0,end:6}], [{word:'아',start:0,end:2},{word:'이',start:1,end:3}], [{word:'漢字',start:0,end:1}]]) assert.throws(()=>wordsToPresenter(input,5,options));
});
test('timeline uses the exact scene tail and hides the presenter at the CTA boundary',()=>{
 const scenes=[{narration:'프로는',audioDurationSeconds:5,overlayPresenter:wordsToPresenter(words,5,options)}, {commonPage:'blog-cta-v1',audioDurationSeconds:6}];
 const t=overlayTimeline(scenes,options,30);
 assert.equal(t[0].end,159);assert.equal(t[1].start,159);
 assert.equal(overlayVisible(options,t[0].scene),true);
 assert.equal(overlayVisible(options,t[1].scene),false);
 assert.equal(overlayVisible({position:'bottom-right'},t[1].scene),true);
 assert.throws(()=>overlayTimeline([{narration:'프로는',audioPath:'speech.mp3',audioDurationSeconds:1}],options,30),/tracks missing/);
});
test('alignment sends the final audio to word timestamp API and records provenance',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-align-'));
 try {
  const audioFile=path.join(dir,'scene-01.mp3'),reportFile=path.join(dir,'alignment.json');
  await fs.writeFile(audioFile,'test final rate-adjusted audio');
  let calls=0;
  const client={audio:{transcriptions:{create:async request=>{
   calls++;assert.equal(request.file.path,audioFile);request.file.destroy();
   assert.equal(request.model,'whisper-1');assert.equal(request.language,'ko');
   assert.equal(request.response_format,'verbose_json');assert.deepEqual(request.timestamp_granularities,['word']);
   return {words,text:'프로는 어려운 일을 해냅니다.'};
  }}}};
  const tracks=await alignPresenter({client,audioFile,duration:5,narration:'프로는 어려운 일을 해냅니다.',options,scene:{},reportFile});
  const report=JSON.parse(await fs.readFile(reportFile));
  assert.match(report.audioSha256,/^[0-9a-f]{64}$/);assert.equal(report.timing,'final-audio-word-timestamps');assert.deepEqual(report.tracks,tracks);
  assert.equal(await alignPresenter({client,audioFile,duration:5,narration:'안내',options,scene:{commonPage:'blog-cta-v1'},reportFile}),null);
  assert.equal(calls,1);
  await assert.rejects(()=>alignPresenter({client,audioFile,duration:null,narration:'본문',options,scene:{},reportFile}),/measured final audio/);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});

test('logged scene-06 zero-duration boundary retains adjacent measured speech',()=>{
 const t=4.579999923706055;
 const raw=[{word:'판단을',start:4,end:t},{word:'할',start:t,end:t},{word:'사람',start:t,end:5.1}];
 const result=normalizeWordTiming(raw,6.432);
 assert.deepEqual(result.words,[raw[0],raw[2]]);
 assert.deepEqual(result.omitted,[{index:1,word:raw[1],reason:'zero-duration'}]);
 assert.deepEqual(result.corrections,[]);
 const tracks=wordsToPresenter(result.words,6.432,options);
 assert.ok(tracks.mouths.length>0);
 assert.ok(tracks.mouths.every(c=>c.end>c.start));
 for(const raw of [
  [{word:'아',start:0,end:1},{word:'이',start:2,end:1}],
  [{word:'아',start:0,end:1},{word:'이',start:7,end:7}],
  [{word:'아',start:0,end:1},{word:'이',start:2,end:2},{word:'우',start:1.5,end:3}],
 ]) assert.throws(()=>normalizeWordTiming(raw,6.432));
});
test('mixed zero-duration response succeeds without repeating transcription',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-zero-'));
 try {
  const audioFile=path.join(dir,'audio.mp3'),reportFile=path.join(dir,'report.json');
  await fs.writeFile(audioFile,'fixture');let calls=0;
  const raw=[{word:'아',start:0,end:.5},{word:'이',start:.5,end:.5},{word:'우',start:.5,end:1}];
  const client={audio:{transcriptions:{create:async request=>{request.file.destroy();calls++;return {text:'아 이 우',words:raw};}}}};
  await alignPresenter({client,audioFile,reportFile,duration:1,narration:'아 이 우',options,scene:{}});
  assert.equal(calls,1);
  const report=JSON.parse(await fs.readFile(reportFile));
  assert.deepEqual(report.attempts[0].words,raw);assert.equal(report.attempts[0].omitted.length,1);
  assert.equal(report.words.length,2);assert.ok(report.tracks.mouths.length);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
