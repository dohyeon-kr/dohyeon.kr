import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {cachedSpeech, speechCacheKey, cachedTranscription} from '../scripts/audio-cache.mjs';

const request = {model:'tts-model', voice:'alloy', input:'안녕하세요.', instructions:'차분하게', response_format:'mp3'};
const fixture = async t => {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'speech-cache-'));
  t.after(() => fs.rm(cacheDir, {recursive:true, force:true}));
  return cacheDir;
};
test('completed scenes survive a later failure and rerun only pays for missing audio', async t => {
  const cacheDir = await fixture(t); const calls=[];
  const client={audio:{speech:{create:async req=>{calls.push(req.input);if(req.input==='실패') throw new Error('provider failed');return new Response('audio-bytes');}}}};
  const first = await cachedSpeech({client, request, cacheDir});
  await assert.rejects(cachedSpeech({client, request:{...request,input:'실패'}, cacheDir}), /provider failed/);
  // Simulate a new process/client after the downstream render crashed.
  const noNetwork={audio:{speech:{create:()=>{throw new Error('Unexpected paid call');}}}};
  assert.deepEqual(await cachedSpeech({client:noNetwork,request,cacheDir}), first);
  assert.deepEqual(calls,[request.input,'실패']);
  for (const field of ['model','voice','input','instructions','response_format']) assert.notEqual(speechCacheKey(request),speechCacheKey({...request,[field]:'changed'}));
  assert.equal(speechCacheKey(request),speechCacheKey(Object.fromEntries(Object.entries(request).reverse())));
});
test('partial/corrupted audio is never reused and provider errors are not cached', async t => {
  const cacheDir=await fixture(t);let calls=0;
  const client={audio:{speech:{create:async()=>{calls++;return new Response('valid-audio');}}}};
  await cachedSpeech({client,request,cacheDir});
  await fs.writeFile(path.join(cacheDir,`${speechCacheKey(request)}.mp3`),'corrupted');
  assert.equal((await cachedSpeech({client,request,cacheDir})).toString(),'valid-audio');
  assert.equal(calls,2);
});
test('alignment is reused for unchanged audio but invalidated by audio, narration or retry', async t => {
  const cacheDir=await fixture(t), audioFile=path.join(cacheDir,'final.mp3');await fs.writeFile(audioFile,'audio');let calls=0;
  const client={audio:{transcriptions:{create:async()=>{calls++;return {text:'안녕',words:[{word:'안녕',start:0,end:1}]};}}}};
  const options={client,audioFile,narration:'안녕',attempt:1,cacheDir,createFile:x=>x};
  await cachedTranscription(options);await cachedTranscription(options);assert.equal(calls,1);
  await cachedTranscription({...options,attempt:2});assert.equal(calls,2);
  await cachedTranscription({...options,narration:'반갑습니다'});assert.equal(calls,3);
  await fs.writeFile(audioFile,'different-speed');await cachedTranscription(options);assert.equal(calls,4);
});

test('final render cache-only mode cannot accidentally call paid speech or alignment', async t => {
  const cacheDir=await fixture(t);const previous=process.env.SHORTS_AUDIO_CACHE_ONLY;
  process.env.SHORTS_AUDIO_CACHE_ONLY='true';
  t.after(()=>{if(previous===undefined) delete process.env.SHORTS_AUDIO_CACHE_ONLY;else process.env.SHORTS_AUDIO_CACHE_ONLY=previous;});
  const client={audio:{speech:{create:()=>assert.fail('paid TTS called')},transcriptions:{create:()=>assert.fail('paid transcription called')}}};
  await assert.rejects(cachedSpeech({client,request,cacheDir}),/TTS cache miss/);
  const audioFile=path.join(cacheDir,'audio.mp3');await fs.writeFile(audioFile,'audio');
  await assert.rejects(cachedTranscription({client,audioFile,narration:'안녕',attempt:1,cacheDir,createFile:x=>x}),/Alignment cache miss/);
});
