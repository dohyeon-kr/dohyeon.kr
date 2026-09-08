import React, {useEffect, useId, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {NOTEBOOK_FONT, Sprite, useNotebookAssets} from './visuals/notebook-assets';
import {fitCopy, textUnits} from './text-layout';
import {useLayoutCheck} from './use-layout-check';
import type {RenderScene} from './types';
import type {SceneLayer} from './motion/SceneTransition';

export const NotebookTitleScene: React.FC<{scene:RenderScene;layer:SceneLayer}> = ({scene,layer}) => {
  const frame=useCurrentFrame(), root=useRef<HTMLDivElement>(null), mask=useId().replace(/:/g,'');
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
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}');font-weight:700 900;}@font-face{font-family:'${NOTEBOOK_FONT}';src:url('${staticFile('notebook/NanumPenScript-Regular.ttf')}');font-weight:400;}`}</style>
    {layer==='visual' && <div data-layout="visual" data-overlay-reserve="opening-photo" style={{position:'absolute',left:250,top:775,width:640,height:470,opacity:photoProgress,transform:`translateY(${(1-photoProgress)*16}px)`}}>
      <svg width="640" height="470" viewBox="0 0 640 470" style={{overflow:'visible',filter:'drop-shadow(0 12px 14px #0008)'}}>
        <defs><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="470" style={{maskType:'alpha'}}><Sprite name="blue" x={0} y={0} width={640} height={470}/></mask></defs>
        <g style={{filter:'grayscale(1) brightness(2)'}}><Sprite name="blue" x={-5} y={-4} width={650} height={478}/></g>
        <g mask={`url(#${mask})`}>
          <image href={staticFile(scene.imagePath!)} x="0" y="0" width="640" height="470" preserveAspectRatio="xMidYMid slice" style={{filter:'grayscale(1) contrast(1.05) brightness(.8)'}}/>
          <rect width="640" height="470" fill="#2964b4" opacity=".18"/>
        </g>
        <g transform="rotate(-12 95 10)"><Sprite name="tape" x={10} y={-28} width={165} height={65}/></g>
        <g transform="rotate(-13 565 457)"><Sprite name="tape" x={490} y={432} width={150} height={58}/></g>
      </svg>
    </div>}
    {layer==='text' && <>
      <div data-layout-text="opening-title" style={{position:'absolute',left:90,top:315,width:800,fontSize:84,lineHeight:1.25,fontWeight:800,letterSpacing:'-.035em',opacity:show(0,8)}}>{lines.map((line,i)=><div key={i} style={{color:i===lines.length-1?'#68a4fb':'#fff'}}>{line}</div>)}</div>
      <svg aria-hidden="true" width={lastWidth} height="18" style={{position:'absolute',left:90,top:315+lines.length*105+22,clipPath:`inset(0 ${(1-underlineProgress)*100}% 0 0)`}}><Sprite name="underline" x={0} y={0} width={lastWidth} height={18}/></svg>
      {scene.subline && <div data-layout-text="opening-note" style={{position:'absolute',left:90,top:1330,width:570,fontFamily:NOTEBOOK_FONT,fontSize:52,lineHeight:1.3,opacity:show(20)}}>{scene.subline}</div>}
    </>}
  </AbsoluteFill>;
};
