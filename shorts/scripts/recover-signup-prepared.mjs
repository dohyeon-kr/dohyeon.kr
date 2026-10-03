import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {withBlogCta} from './blog-cta.mjs';
import {normalized, validateAlignedScene, SCENE_TAIL} from './signup-continuous-model.mjs';

// Recovery only: use an existing release MP4 + its exact beat-level SRT when raw
// cached speech/prepared artifacts cannot be downloaded. This is not a TTS cache.
const root=path.resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2),opt=k=>args.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3);
const candidateArg=args.find(a=>!a.startsWith('--'));
if(!candidateArg||!opt('video')||!opt('srt')||!opt('output'))throw new Error('Usage: node shorts/scripts/recover-signup-prepared.mjs <original-candidate.json> --video=/path/original.mp4 --srt=/path/original.srt --output=shorts/.tmp/original-prepared.json');
const candidatePath=path.resolve(root,candidateArg),output=path.resolve(root,opt('output'));
if(!candidatePath.startsWith(path.join(root,'shorts/content/'))||!output.startsWith(path.join(root,'shorts/.tmp/')))throw new Error('Invalid candidate/prepared location.');
const video=path.resolve(opt('video')),srt=path.resolve(opt('srt'));
const text=await fs.readFile(srt,'utf8');
const seconds=t=>{const [h,m,s]=t.replace(',','.').split(':').map(Number);return h*3600+m*60+s;};
const captions=text.trim().split(/\r?\n\s*\r?\n/).map(block=>{
  const lines=block.split(/\r?\n/),times=lines[1]?.split(' --> ');
  if(times?.length!==2)throw new Error('Expected beat-level SRT.');
  return {startSeconds:seconds(times[0]),endSeconds:seconds(times[1]),text:lines.slice(2).join(' ')};
});
const manifest=withBlogCta(JSON.parse(await fs.readFile(candidatePath,'utf8')));
const allBeats=manifest.scenes.flatMap(s=>s.beats);
if(manifest.scenes.length!==2||captions.length!==allBeats.length||captions.some((c,i)=>normalized(c.text)!==normalized(allBeats[i].text)))throw new Error('SRT must match every source beat exactly, including the shared CTA.');
const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',video],{encoding:'utf8'}));
const bodyCount=manifest.scenes[0].beats.length;
const starts=[0,captions[bodyCount].startSeconds];
const sourceSha256=createHash('sha256').update(await fs.readFile(video)).digest('hex');
const outputDir=path.join(root,'shorts/public/generated/signup-release-recovery',sourceSha256.slice(0,16));
await fs.mkdir(outputDir,{recursive:true});
let offset=0;
for(let i=0;i<2;i++){
  const scene=manifest.scenes[i],sceneSpan=(i===0?starts[1]:duration)-starts[i];
  scene.audioDurationSeconds=sceneSpan-SCENE_TAIL;
  scene.beatTimings=captions.slice(offset,offset+scene.beats.length).map(c=>({startSeconds:c.startSeconds-starts[i],endSeconds:c.endSeconds-starts[i]}));
  validateAlignedScene(scene);
  const file=path.join(outputDir,`scene-${i+1}.wav`);
  execFileSync('ffmpeg',['-y','-v','error','-i',video,'-af',`atrim=start=${starts[i]}:end=${starts[i]+scene.audioDurationSeconds},asetpts=PTS-STARTPTS`,'-vn','-c:a','pcm_s16le',file],{stdio:'inherit'});
  scene.audioPath=path.relative(path.join(root,'shorts/public'),file);offset+=scene.beats.length;
}
manifest.audioAlreadyMixed=true;
manifest.audioReuse={method:'release-recovery',timingSource:'release-srt-beat-boundaries',sourceSha256,srtSha256:createHash('sha256').update(text).digest('hex')};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(manifest,null,2)+'\n');
console.log(`Recovered prepared data from exact SRT scene boundaries: ${path.relative(root,output)}. Audio contains the release mix; do not add BGM again.`);
