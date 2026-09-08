import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const target=fileURLToPath(new URL('../public/notebook/NanumPenScript-Regular.ttf',import.meta.url));
const url='https://raw.githubusercontent.com/google/fonts/16680f8688ffcd467d2eb2146a9ce0343404581d/ofl/nanumpenscript/NanumPenScript-Regular.ttf';
const expected='565747d0573126bb057d0675151c894bf019d7a5';
const valid=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex')===expected;
export async function prepareNotebookAssets(){
  try{if(valid(await fs.readFile(target)))return;}catch{}
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`Notebook font download: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!valid(bytes))throw new Error('Notebook font checksum mismatch');
  await fs.mkdir(fileURLToPath(new URL('../public/notebook/',import.meta.url)),{recursive:true});
  await fs.writeFile(target,bytes);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepareNotebookAssets();
