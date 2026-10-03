import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const project=path.resolve(process.argv[2]||fileURLToPath(new URL('../../.tmp/hyperframes/signup-phone-number-input-candidate-02/',import.meta.url)));
const timing=JSON.parse(await fs.readFile(path.join(project,'timing.json'),'utf8'));
const B=(i,p=0)=>timing.beats[i].startSeconds+p*(timing.beats[i].endSeconds-timing.beats[i].startSeconds);
const out=pathToFileURL(project+'/output/playwright/');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
const page=await browser.newPage({viewport:{width:1080,height:1920}});
console.log('browser ready');await page.goto(pathToFileURL(path.join(project,'index.html')).href,{waitUntil:'domcontentloaded',timeout:15000});console.log('page ready');await page.evaluate(async()=>{await document.fonts.ready;return true;});console.log('fonts ready');
const screens=[...timing.beats.map((_,i)=>B(i,.5)),B(3,.68)+.21,timing.bodyEnd+2];
for(const t of screens){await page.evaluate(t=>{window.__timelines['aurora-explain'].seek(t,false);return true;},t);await page.screenshot({path:fileURLToPath(new URL(`frame-${t}.png`,out))});}
const report=await page.evaluate(({bodyEnd,errorAt})=>{const failures=[];let samples=0;let minOpacity=1;const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}};const visible=el=>{let o=1;for(let e=el;e;e=e.parentElement)o*=+getComputedStyle(e).opacity;return o>.95;};
for(let frame=30;frame<Math.floor(bodyEnd*30);frame++){const t=frame/30;window.__timelines['aurora-explain'].seek(t,false);samples++;const phone=document.querySelector('#phone-control');let opacity=1;for(let e=phone;e;e=e.parentElement)opacity*=+getComputedStyle(e).opacity;minOpacity=Math.min(minOpacity,opacity);if(opacity<.98)failures.push({t,kind:'phone-disappeared',opacity});
const value=[...document.querySelectorAll('.values span')].filter(visible);if(value.length!==1)failures.push({t,kind:'value-count',count:value.length});
for(const el of [...value,...document.querySelectorAll('.caption,.chapter,#error,#success')].filter(visible)){const r=box(el);if(r.left<0||r.right>1080||r.top<0||r.bottom>1800)failures.push({t,kind:'text-outside',id:el.id,r});}
const cap=[...document.querySelectorAll('.caption')].find(visible);if(cap&&cap.getBoundingClientRect().height>150)failures.push({t,kind:'caption-over-two-lines'});
}window.__timelines['aurora-explain'].seek(errorAt+.75,false);const restX=gsap.getProperty('#phone-shell','x');if(Math.abs(restX)>.1)failures.push({kind:'shake-not-settled',restX});window.__timelines['aurora-explain'].seek(errorAt+.21,false);const shakeX=gsap.getProperty('#phone-shell','x');if(Math.abs(shakeX)<2)failures.push({kind:'shake-not-visible',shakeX});return {samples,minPhoneOpacity:minOpacity,shakeX,restX,failures};},{bodyEnd:timing.bodyEnd,errorAt:B(3,.68)});
await fs.writeFile(new URL('continuity-check.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify({samples:report.samples,minPhoneOpacity:report.minPhoneOpacity,failures:report.failures.slice(0,10),failureCount:report.failures.length}));if(report.failures.length)process.exitCode=1;
}finally{await browser.close()}
