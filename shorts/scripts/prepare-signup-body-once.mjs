import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {alignBeatTimings, captionsFromBeatTimings} from './caption-alignment.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'shorts/content/signup-phone-number-input/candidate-02.json'),'utf8'));
const scene=manifest.scenes[0];
const text=scene.narration;
const digest=createHash('sha256').update(text).digest('hex');
const approvedTextSha='fe45c5eec9f13031a968aa64270a5e88e0a65f892d3acc4809573c8243800eeb';
if(digest!==approvedTextSha || text.length>500 || scene.beats.length!==7)throw new Error('Narration differs from the approved bounded request.');
const budget={approvedMaxUsd:.10,plannedUsdRange:[.02,.05],speechCalls:1,transcriptionCalls:1,bodyCharacters:text.length,model:'gpt-4o-mini-tts',voice:'alloy',speechRate:1.25,automaticRetries:0};
if(process.argv.includes('--preflight')){console.log(JSON.stringify({...budget,textSha256:digest}));process.exit(0);}
if(process.env.GITHUB_RUN_ATTEMPT!=='1'||process.env.GITHUB_REF!=='refs/heads/codex/signup-video-v2'||process.env.SIGNUP_AUDIO_APPROVED_MAX_USD!=='0.10')throw new Error('Only the approved first workflow attempt may generate speech.');
if(!process.env.OPENAI_API_KEY)throw new Error('Configured OpenAI connection unavailable.');
const out=path.join(root,'shorts/.tmp/signup-audio-once');await fs.mkdir(out,{recursive:true});
const receipt={...budget,textSha256:digest,speechCalls:0,transcriptionCalls:0,actualCostUsd:null,costNote:'Speech endpoint does not provide invoiced cost. Do not claim estimate as billed usage.'};
const save=()=>fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
const measure=f=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',f],{encoding:'utf8'}));
try{
 const {default:OpenAI}=await import('./shorts-openai.mjs');const client=new OpenAI({maxRetries:0,timeout:180000});
 receipt.speechCalls=1;await save();
 const speech=await client.audio.speech.create({model:budget.model,voice:budget.voice,input:text,instructions:'한국어로 차분하고 또렷하게 말한다. 프레젠테이션 숏폼 내레이션처럼 군더더기 없이, 자연스러운 속도와 낮은 과장도로 읽는다.',response_format:'wav'},{maxRetries:0}).withResponse();
 receipt.speechRequestId=speech.response.headers.get('x-request-id');
 const raw=path.join(out,'body-raw.wav');await fs.writeFile(raw,Buffer.from(await speech.data.arrayBuffer()));
 receipt.rawDurationSeconds=measure(raw);await save();
 // Provider has no per-request dollar-cap parameter. Constrain the exact approved
 // text and call count; stop before another paid operation on unexpected output.
 if(!Number.isFinite(receipt.rawDurationSeconds)||receipt.rawDurationSeconds>120)throw new Error('Unexpected speech duration; stopping before alignment.');
 const audio=path.join(out,'body.wav');
 execFileSync('ffmpeg',['-y','-v','error','-i',raw,'-af','atempo=1.25','-c:a','pcm_s16le',audio]);
 receipt.durationSeconds=measure(audio);
 receipt.transcriptionCalls=1;await save();
 const aligned=await client.audio.transcriptions.create({file:createReadStream(audio),model:'whisper-1',language:'ko',response_format:'verbose_json',timestamp_granularities:['word'],prompt:text},{maxRetries:0}).withResponse();
 receipt.transcriptionRequestId=aligned.response.headers.get('x-request-id');
 await fs.writeFile(path.join(out,'transcription.json'),JSON.stringify(aligned.data,null,2));
 const words=aligned.data.words;
 const alignment=alignBeatTimings(scene.beats,words,receipt.durationSeconds);
 if(!alignment||alignment.method==='estimated')throw new Error('Measured alignment failed; no paid retry is authorized.');
 receipt.alignmentMethod=alignment.method;
 const body={...scene,audioPath:'generated/signup-body-once/body.wav',audioDurationSeconds:receipt.durationSeconds,beatTimings:alignment.timings,captions:captionsFromBeatTimings(scene.beats,alignment.timings,{phraseLevel:true})};
 await fs.writeFile(path.join(out,'body-prepared.json'),JSON.stringify(body,null,2));
 receipt.status='completed';await save();
 console.log(JSON.stringify({status:receipt.status,bodyDuration:receipt.durationSeconds,alignment:receipt.alignmentMethod,speechCalls:receipt.speechCalls,transcriptionCalls:receipt.transcriptionCalls,actualCostUsd:null}));
}catch(error){receipt.status='failed';receipt.failure=String(error.message).replace(/sk-[\w-]+/g,'[redacted]');await save();console.error('Audio preparation failed; no retry performed. Review the bounded output artifact.');process.exitCode=1;}
