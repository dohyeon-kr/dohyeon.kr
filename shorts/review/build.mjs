import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=path.resolve(process.argv[2]||path.join(root,'content/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/candidate-01.json'));
const output=path.resolve(process.argv[3]||path.join(root,'out/notebook-review.html'));
const candidate=JSON.parse(await readFile(manifest,'utf8'));
if(candidate.source.url!=='https://blog.dohyeon.kr/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/' || candidate.scenes.some(s=>s.diagramSpec?.physics))throw new Error('This review prototype supports the collaboration notebook candidate without physics only.');
const assets=['fonts/Pretendard-Bold.woff','fonts/Pretendard-Regular.woff','notebook/papers.webp','notebook/marks.webp','notebook/paper-grain.png','notebook/opening-photo.jpg',...['paper','blue','tape','check','star','underline','highlighter'].map(x=>`notebook/stickers/${x}.webp`)];
const mime={woff:'font/woff',webp:'image/webp',png:'image/png',jpg:'image/jpeg'};
const files=await Promise.all(assets.map(async name=>({name,src:`data:${mime[name.split('.').at(-1)]};base64,${(await readFile((name.startsWith('fonts/')?path.join(root,'../scripts/thumbnail-fonts',path.basename(name)):path.join(root,'public',name)))).toString('base64')}`})));
const result=await build({entryPoints:[path.join(root,'review/editor.tsx')],bundle:true,outfile:'review.js',write:false,minify:true,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'review-only-geometry',setup(b){
  // Draft manipulation must stay visible. Production source and its strict gate are untouched.
  b.onLoad({filter:/\/visuals\/physics\.ts$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('assertDiagramLayout(states, progress, spec.notebook);','/* Review draft: diagnostics are evaluated separately in the inspector. */'),loader:'ts',resolveDir:path.dirname(args.path)}));
  b.onLoad({filter:/\/use-layout-check\.ts$/},()=>({contents:'export function useLayoutCheck() {}',loader:'ts'}));
}}]});
const safe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const css=(await readFile(path.join(root,'review/style.css'),'utf8'))+'\n'+(result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'');
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,`<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오답노트 · 배치 검수</title><style>${css}</style></head><body><div id="root"></div><script>window.remotion_staticFiles=${safe(files)};window.REVIEW_CANDIDATE=${safe(candidate)};</script><script>${result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script')}</script></body></html>`);
console.log(output);
