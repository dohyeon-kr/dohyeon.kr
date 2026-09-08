import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const target=fileURLToPath(new URL('../public/notebook/NanumPenScript-Regular.ttf',import.meta.url));
const url='https://raw.githubusercontent.com/google/fonts/16680f8688ffcd467d2eb2146a9ce0343404581d/ofl/nanumpenscript/NanumPenScript-Regular.ttf';
const expected='565747d0573126bb057d0675151c894bf019d7a5';
const valid=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')===expected;
async function prepareFont(){
  try{if(valid(await fs.readFile(target)))return;}catch{}
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Notebook font download: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!valid(bytes))throw new Error('Notebook font checksum mismatch');
  await fs.mkdir(fileURLToPath(new URL('../public/notebook/',import.meta.url)),{recursive:true});
  await fs.writeFile(target,bytes);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareNotebookAssets();

export async function prepareNotebookAssets(){
  await prepareFont();
  const texture=fileURLToPath(new URL('../public/notebook/paper-grain.png',import.meta.url));
  try{const bytes=await fs.readFile(texture);if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return;}catch{}
  const response=await fetch('https://upload.wikimedia.org/wikipedia/commons/4/4a/Paper001_4K_Color.png',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Notebook paper texture download: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Notebook texture is not a PNG');
  await fs.writeFile(texture,bytes);
}

if(process.argv.includes('--preview-photo')) {
  const photo=fileURLToPath(new URL('../public/notebook/opening-photo.jpg',import.meta.url));
  const response=await fetch('https://images.pexels.com/photos/4974920/pexels-photo-4974920.jpeg?auto=compress&cs=tinysrgb&w=1600',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Opening photo download: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes[0]!==255 || bytes[1]!==216)throw new Error('Opening photo is not a JPEG');
  await fs.writeFile(photo,bytes);
}
