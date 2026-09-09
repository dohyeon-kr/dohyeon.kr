import React, {useEffect, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {NotebookPaper} from './visuals/NotebookPaper';
import {NOTEBOOK_FONT, Sprite, useNotebookAssets} from './visuals/notebook-assets';
import {fitCopy, textUnits} from './text-layout';
import {useLayoutCheck} from './use-layout-check';
import type {RenderScene} from './types';
import type {SceneLayer} from './motion/SceneTransition';

export const NotebookTitleScene: React.FC<{scene:RenderScene;layer:SceneLayer}> = ({scene,layer}) => {
  const frame=useCurrentFrame(), root=useRef<HTMLDivElement>(null);
  const [handle]=useState(()=>delayRender('Load opening photograph'));
  useNotebookAssets(true);
  useLayoutCheck(root,frame);
  useEffect(()=>{
    if(!scene.imagePath){cancelRender(new Error('notebook-title requires a resolved photograph'));return;}
    const photo=new Image();photo.src=staticFile(scene.imagePath);
    photo.decode().then(()=>continueRender(handle)).catch(cancelRender);
  },[handle,scene.imagePath]);
  const title=fitCopy(scene.headline,800,350,84,1.25), lines=title.text.split('\n');
  if(title.fontSize!==84 || lines.length>3)throw new Error('[layout:notebook-title] use a short title at 84px, at most three lines');
  const show=(start:number,length=10)=>Math.max(0,Math.min(1,(frame-start)/length));
  const photoProgress=show(5), underlineProgress=show(18,12);
  const lastWidth=Math.min(760,textUnits(lines.at(-1)!)*84);
  return <AbsoluteFill ref={root} style={{background:layer==='visual'?'#101114':undefined,color:'#fff',fontFamily:'Pretendard, sans-serif'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}');font-weight:700 900;}`}</style>
    {layer==='visual' && <>
      <NotebookPaper />
      <div data-layout="visual" data-overlay-reserve="opening-photo" style={{position:'absolute',left:90,top:685,width:840,height:560,opacity:photoProgress,transform:`translateY(${(1-photoProgress)*16}px) rotate(-2deg)`}}>
        <svg width="840" height="560" viewBox="0 0 840 560" style={{overflow:'visible',filter:'drop-shadow(0 10px 12px #0006)'}}>
          <rect x="-10" y="-10" width="860" height="580" fill="#e8e6df"/>
          <image href={staticFile(scene.imagePath!)} x="0" y="0" width="840" height="560" preserveAspectRatio="xMidYMid slice" style={{filter:'grayscale(1) contrast(1.05) brightness(.95)'}}/>
          <g transform="rotate(-16 100 0)"><Sprite name="tape" x={0} y={-35} width={200} height={80}/></g>
          <g transform="rotate(16 740 560)"><Sprite name="tape" x={640} y={520} width={200} height={80}/></g>
        </svg>
      </div>
    </>}
    {layer==='text' && <>
      <div data-layout-text="opening-title" style={{position:'absolute',left:90,top:260,width:800,fontSize:84,lineHeight:1.25,fontWeight:800,letterSpacing:'-.035em',opacity:show(0,8)}}>{lines.map((line,i)=><div key={i} style={{color:i===lines.length-1?'#68a4fb':'#fff'}}>{line}</div>)}</div>
      <svg aria-hidden="true" width={lastWidth} height="18" style={{position:'absolute',left:90,top:260+lines.length*105+22,clipPath:`inset(0 ${(1-underlineProgress)*100}% 0 0)`}}><Sprite name="underline" x={0} y={0} width={lastWidth} height={18}/></svg>
      {scene.subline && <div data-layout-text="opening-note" style={{position:'absolute',left:90,top:1410,width:570,fontFamily:NOTEBOOK_FONT,fontWeight:800,fontSize:46,lineHeight:1.3,opacity:show(20)}}>{scene.subline}</div>}
    </>}
  </AbsoluteFill>;
};
