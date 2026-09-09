// Silent candidate layout verification; --photos also fetches the actual source images.
import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';
import {withBlogCta} from './blog-cta.mjs';
import {previewSceneFrames} from '../src/template-preview.ts';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'out/collaboration-layout');
await fs.mkdir(output,{recursive:true});
await fs.mkdir(path.join(root,'public/fonts'),{recursive:true});
for(const f of ['Pretendard-Bold.woff','Pretendard-Regular.woff']) await fs.copyFile(path.join(root,'../scripts/thumbnail-fonts',f),path.join(root,'public/fonts',f));
const manifest=JSON.parse(await fs.readFile(path.join(root,'content/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/candidate-01.json'),'utf8'));
const inputProps=withBlogCta(manifest);
inputProps.scenes=inputProps.scenes.map(s=>({...s,audioDurationSeconds:6}));
const photos=process.argv.includes('--photos');
if(photos) {
 const media=path.join(root,'public/generated/collaboration-check');
 await fs.mkdir(media,{recursive:true});
 for(const [i,s] of inputProps.scenes.entries()) if(s.visual.type==='photo') {
  const response=await fetch(s.image.originalUrl,{signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`Photo ${i+1}: HTTP ${response.status}`);
  const name=`photo-${i+1}.jpg`;
  await fs.writeFile(path.join(media,name),Buffer.from(await response.arrayBuffer()));
  s.imagePath=`generated/collaboration-check/${name}`;
 }
}
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.tsx'),publicDir:path.join(root,'public')});
const browserExecutable=process.env.SHORTS_BROWSER_EXECUTABLE || undefined;
const composition=await selectComposition({serveUrl,id:'ShortVideo',inputProps,browserExecutable});
let start=0,count=0;
for(const [i,s] of inputProps.scenes.entries()) {
 const duration=previewSceneFrames(s);
 if(photos || s.visual.type!=='photo') for(const f of [...new Set([5,22,Math.floor(duration*.45),Math.floor(duration*.85), ...((i===1 || i===3 || i===11) ? [159,160,161,162] : [])])]) {
  await renderStill({serveUrl,composition,inputProps,browserExecutable,frame:start+f,scale:.5,output:path.join(output,`scene-${String(i+1).padStart(2,'0')}-${f}.png`)});count++;
 }
 start+=duration;
}
console.log(`Rendered ${count} frames including CTA to ${output}`);
