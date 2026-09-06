import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {wordsToPresenter} from '../src/presenter/word-timing.ts';
import {compilePresenter} from '../src/presenter/api.ts';
import {overlayTimeline, overlayVisible} from '../src/presenter/overlay.ts';
import {alignPresenter} from '../scripts/align-presenter.mjs';
const options={position:'bottom-right',hideOnCommonCta:true,lipSync:'word-timestamps',nod:'speech'};
const words=[{word:'프로는',start:.4,end:1.2},{word:'어려운',start:1.3,end:2.1},{word:'일을',start:2.2,end:2.8},{word:'해냅니다.',start:3.6,end:4.8}];
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
 for(const input of [[],[{word:'아',start:0,end:NaN}],[{word:'아',start:1,end:1}], [{word:'아',start:-.1,end:.2}], [{word:'아',start:0,end:6}], [{word:'아',start:0,end:2},{word:'이',start:1,end:3}], [{word:'code',start:0,end:1}]]) assert.throws(()=>wordsToPresenter(input,5,options));
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
