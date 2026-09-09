import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareNotebookAssets();

export async function prepareNotebookAssets(){
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
