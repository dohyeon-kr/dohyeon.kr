import React, {useMemo, useRef} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Presenter} from './Presenter';
import {compilePresenter, validateScenePresenter} from './api';
import {fitCopy} from '../text-layout';
import {subtitleAt} from '../subtitles';
import {useLayoutCheck} from '../use-layout-check';
import type {RenderScene} from '../types';
import type {SceneLayer} from '../motion/SceneTransition';

/** A reserved white page shared by both video themes. */
export const PresenterScene:React.FC<{scene:RenderScene;layer:SceneLayer;durationInFrames:number}> = ({scene,layer,durationInFrames}) => {
  const frame=useCurrentFrame(), {fps}=useVideoConfig(), root=useRef<HTMLDivElement>(null);
  useLayoutCheck(root,frame);
  const evaluate=useMemo(()=>{
    validateScenePresenter(scene,durationInFrames/fps);
    return compilePresenter(scene.presenter ?? {},durationInFrames/fps);
  },[scene,durationInFrames,fps]);
  const title=fitCopy(scene.headline,880,300,74,1.18);
  const subline=fitCopy(scene.subline ?? '',880,130,32,1.5);
  const caption=subtitleAt(scene,frame/fps);
  const copy=fitCopy(caption?.text ?? '',850,180,42,1.5);
  return <AbsoluteFill ref={root} style={{background:layer==='visual'?'white':undefined,color:'#111',fontFamily:'Pretendard, Arial, sans-serif'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-display:swap;}`}</style>
    <div data-layout="visual" style={{position:'absolute',left:270,top:680,width:540,height:540}}>
      {layer==='visual' && <Presenter pose={evaluate(frame/fps)} />}
    </div>
    {layer==='text' && <>
      <div data-layout-text="headline" style={{position:'absolute',left:100,top:230,width:880,fontSize:title.fontSize,lineHeight:1.18,fontWeight:800,textAlign:'center',whiteSpace:'pre-wrap'}}>{title.text}</div>
      <div data-layout-text="subline" style={{position:'absolute',left:100,top:550,width:880,fontSize:subline.fontSize,lineHeight:1.5,fontWeight:700,textAlign:'center',whiteSpace:'pre-wrap'}}>{subline.text}</div>
      <div data-layout="caption" style={{position:'absolute',left:115,top:1370,width:850,height:180}}><div data-layout-text="caption" style={{fontSize:copy.fontSize,lineHeight:1.5,fontWeight:700,textAlign:'center',whiteSpace:'pre-wrap'}}>{copy.text}</div></div>
    </>}
  </AbsoluteFill>;
};
