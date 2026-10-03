import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withBlogCta} from './blog-cta.mjs';
import {planBeatDeletion, resolveSignupModel, normalized} from './signup-continuous-model.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const argv = process.argv.slice(2);
const option = key => argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const candidateArg = argv.find(a => !a.startsWith('--'));
if (!candidateArg || !option('source-prepared')) throw new Error('Usage: node shorts/scripts/prepare-signup-reused-audio.mjs <candidate.json> --source-prepared=shorts/.tmp/original.json [--output=shorts/.tmp/edited.json]');
const contained = (value, directory) => {
  const result = path.resolve(root,value);
  if (!result.startsWith(path.resolve(root,directory)+path.sep)) throw new Error(`Path must be under ${directory}`);
  return result;
};
const candidatePath = contained(candidateArg,'shorts/content');
const sourcePath = contained(option('source-prepared'),'shorts/.tmp');
const candidate = JSON.parse(await fs.readFile(candidatePath,'utf8'));
const source = JSON.parse(await fs.readFile(sourcePath,'utf8'));
const desired = withBlogCta(candidate);
if (source.scenes?.length !== 2 || normalized(source.scenes[1].narration) !== normalized(desired.scenes[1].narration)) throw new Error('Shared CTA audio does not match; supply matching cached CTA.');
const plan = planBeatDeletion(source.scenes[0],desired.scenes[0]);
const audio = contained(path.join('shorts/public',source.scenes[0].audioPath),'shorts/public');
const seconds = Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',audio],{encoding:'utf8'}));
if (Math.abs(seconds-source.scenes[0].audioDurationSeconds)>.08) throw new Error('Body speech duration does not match prepared data.');
const sourceHash = createHash('sha256').update(await fs.readFile(audio)).digest('hex');
const key = createHash('sha256').update(JSON.stringify({sourceHash,cuts:plan.cuts,narration:desired.scenes[0].narration})).digest('hex');
const outputAudio = path.join(root,'shorts/public/generated/signup-reuse',`${key}.wav`);
await fs.mkdir(path.dirname(outputAudio),{recursive:true});
const filters = plan.keep.map((range,i) => {
  const length = range.end-range.start;
  const fadeIn = i>0?',afade=t=in:d=0.02':'';
  const fadeOut = i<plan.keep.length-1?`,afade=t=out:st=${Math.max(0,length-.02)}:d=0.02`:'';
  return `[0:a]atrim=start=${range.start}:end=${range.end},asetpts=PTS-STARTPTS${fadeIn}${fadeOut}[a${i}]`;
});
filters.push(`${plan.keep.map((_,i)=>`[a${i}]`).join('')}concat=n=${plan.keep.length}:v=0:a=1[out]`);
// Pure local reuse. This module never imports the OpenAI client or calls TTS.
execFileSync('ffmpeg',['-y','-v','error','-i',audio,'-filter_complex',filters.join(';'),'-map','[out]','-c:a','pcm_s16le',outputAudio],{stdio:'inherit'});
const manifest = {...desired, audioReuse:{method:'exact-beat-deletion',sourceAudioSha256:sourceHash,cuts:plan.cuts,retainedBeatIndices:plan.retained,timingSource:source.audioReuse?.timingSource ?? 'prepared-beat-timings'},audioAlreadyMixed:source.audioAlreadyMixed===true,scenes:[{...desired.scenes[0],audioPath:path.relative(path.join(root,'shorts/public'),outputAudio),audioDurationSeconds:plan.audioDurationSeconds,beatTimings:plan.beatTimings},structuredClone(source.scenes[1])]};
const resolved = resolveSignupModel(candidate,manifest).manifest;
const prefix = `${path.basename(path.dirname(candidatePath))}-${candidate.id}`;
const output = contained(option('output') ?? `shorts/.tmp/${prefix}.json`,'shorts/.tmp');
if(output===sourcePath)throw new Error('Refusing to overwrite source prepared manifest.');
await fs.mkdir(path.dirname(output),{recursive:true});
await fs.writeFile(output,JSON.stringify(resolved,null,2)+'\n');
console.log(JSON.stringify({prepared:path.relative(root,output),cuts:plan.cuts,duration:plan.audioDurationSeconds,sourceAudioSha256:sourceHash,paidCalls:0}));
