#!/usr/bin/env node
// Validates measured, authored text boxes. This is not platform UI detection.
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(readFileSync(join(here,name),'utf8'));
const safe=read('safe-area.json'), layout=read('pilot-layout.json');
const inside=(b,s)=>b[0]>=s.left&&b[1]>=s.top&&b[2]<=s.right&&b[3]<=s.bottom&&b[0]<b[2]&&b[1]<b[3];
const issues=[];
layout.reelTextBoxes.forEach(({scene,box})=>{if(!inside(box,safe.reels.criticalContent))issues.push('scene '+scene+': '+box)});
layout.coverTextBoxes.forEach(({role,box})=>{if(!inside(box,safe.cover.criticalContent))issues.push('cover '+role+': '+box)});
if(issues.length){console.error('FAIL: text outside critical safe area\n'+issues.join('\n'));process.exitCode=1;}
else console.log('PASS: '+layout.reelTextBoxes.length+' scene text boxes and '+layout.coverTextBoxes.length+' cover text boxes');
const add=(s,color,label)=>'<rect x="'+s.left+'" y="'+s.top+'" width="'+(s.right-s.left)+'" height="'+(s.bottom-s.top)+'" stroke="'+color+'" stroke-width="3" fill="none"/><text x="'+(s.left+10)+'" y="'+(s.top+34)+'" fill="'+color+'" font-size="25">'+label+'</text>';
if(process.argv.includes('--write-guides'))for(const mode of ['reels','cover']){
const layers=mode==='reels'? add(safe.reels.ditherStage,'#47adff','DITHER STAGE')+add(safe.reels.criticalContent,'#36f092','TEXT SAFE'):add(safe.cover.profileGridCenter4to5,'#47adff','PROFILE GRID 4:5')+add(safe.cover.criticalContent,'#36f092','COVER TEXT SAFE');
writeFileSync(join(here,'guide-'+mode+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">'+layers+'</svg>\n');
}
if(process.argv.includes('--self-test')){const b=safe.reels.criticalContent;if(inside([b.left-1,b.top,b.left+10,b.top+10],b)||!inside([b.left,b.top,b.right,b.bottom],b))throw new Error('boundary self-test failed');console.log('PASS boundary self-test');}
