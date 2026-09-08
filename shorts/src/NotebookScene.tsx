import React, {useContext, useRef} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {PresenterOverlayContext} from './presenter/PersistentPresenter';
import {subtitleAt} from './subtitles';
import {NOTEBOOK_FONT, Sprite} from './visuals/notebook-assets';
import {NotebookCaptionLine} from './visuals/NotebookCaptionLine';
import {fitCopy, textUnits} from './text-layout';
import {useLayoutCheck} from './use-layout-check';
import type {RenderScene} from './types';
import type {SceneLayer} from './motion/SceneTransition';

export const NotebookScene: React.FC<{scene:RenderScene; layer:SceneLayer; durationInFrames:number}> = ({scene,layer,durationInFrames}) => {
  const frame=useCurrentFrame(), {fps}=useVideoConfig(), root=useRef<HTMLDivElement>(null);
  const presenter=useContext(PresenterOverlayContext);
  useLayoutCheck(root,frame);
  const cue=subtitleAt(scene,frame/fps), width=presenter?590:800;
  const keyword=cue && 'keyword' in cue && typeof cue.keyword==='string'?cue.keyword:null;
  const highlightProgress=cue?Math.max(0,Math.min(1,(frame-cue.startSeconds*fps-2)/8)):0;
  const copy=cue ? fitCopy(cue.text,width,138,46,1.5) : null;
  if (copy && (copy.fontSize!==46 || copy.text.split('\n').length>2)) throw new Error('[layout:notebook-caption] shorten the semantic beat; keep 46px and at most two lines');
  const title=scene.headline ? fitCopy(scene.headline,600,65,52,1.2) : null;
  const titleWidth=title?Math.min(700,Math.max(340,textUnits(title.text)*title.fontSize+80)):0;
  return <AbsoluteFill ref={root} style={{background:layer==='visual'?'#101114':undefined,fontFamily:'Pretendard, sans-serif',color:'#fff'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;}`}</style>
    <div data-layout="visual" data-overlay-reserve="notebook" style={{position:'absolute',left:90,top:480,width:800,height:560}}>
      <DiagramRenderer spec={scene.diagramSpec!} durationInFrames={durationInFrames} layer={layer==='visual'?'geometry':'labels'} effects={scene.effects}/>
    </div>
    {layer==='text' && <>
      {title && <div style={{position:'absolute',left:90,top:230,width:titleWidth,height:140,opacity:Math.min(1,frame/6),transform:`translateY(${Math.max(0,1-frame/8)*-6}px)`}}>
        <svg width={titleWidth} height="120" style={{position:'absolute',inset:0}} aria-hidden="true"><g transform={`rotate(-1 ${titleWidth/2} 60)`}><Sprite name="tape" x={0} y={0} width={titleWidth} height={120}/></g></svg>
        <div data-layout-text="headline" style={{position:'relative',padding:'38px 26px',fontFamily:NOTEBOOK_FONT,fontSize:title.fontSize,lineHeight:1.2,fontWeight:400,whiteSpace:'pre-wrap',color:'#eef5ff'}}>{title.text}</div>
      </div>}
      {copy && <div data-layout="caption" style={{position:'absolute',left:90,top:1340,width,height:168}}><div data-layout-text="caption" style={{fontSize:46,lineHeight:'82px',fontWeight:800,whiteSpace:'pre-wrap'}}>{copy.text.split('\n').map((line,i)=><div key={i} style={{position:'relative',height:82}}><NotebookCaptionLine text={line} keyword={keyword} progress={highlightProgress}/><svg aria-hidden="true" width={width} height={6} viewBox={`0 0 ${width} 6`} style={{position:'absolute',left:0,top:77,opacity:.5}}><Sprite name="underline" x={0} y={0} width={width} height={6}/></svg></div>)}</div></div>}
    </>}
  </AbsoluteFill>;
};
