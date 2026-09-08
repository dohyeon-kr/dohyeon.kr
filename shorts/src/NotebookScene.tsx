import React, {useContext, useRef} from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {PresenterOverlayContext} from './presenter/PersistentPresenter';
import {subtitleAt} from './subtitles';
import {fitCopy} from './text-layout';
import {useLayoutCheck} from './use-layout-check';
import type {RenderScene} from './types';
import type {SceneLayer} from './motion/SceneTransition';

export const NotebookScene: React.FC<{scene:RenderScene; layer:SceneLayer; durationInFrames:number}> = ({scene,layer,durationInFrames}) => {
  const frame=useCurrentFrame(), {fps}=useVideoConfig(), root=useRef<HTMLDivElement>(null);
  const presenter=useContext(PresenterOverlayContext);
  useLayoutCheck(root,frame);
  const cue=subtitleAt(scene,frame/fps), width=presenter?590:800;
  const copy=cue ? fitCopy(cue.text,width,138,46,1.5) : null;
  if (copy && (copy.fontSize!==46 || copy.text.split('\n').length>2)) throw new Error('[layout:notebook-caption] shorten the semantic beat; keep 46px and at most two lines');
  const title=scene.headline ? fitCopy(scene.headline,800,180,64,1.3) : null;
  return <AbsoluteFill ref={root} style={{background:layer==='visual'?'#101114':undefined,fontFamily:'Pretendard, sans-serif',color:'#fff'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;}`}</style>
    <div data-layout="visual" data-overlay-reserve="notebook" style={{position:'absolute',left:90,top:480,width:800,height:560}}>
      <DiagramRenderer spec={scene.diagramSpec!} durationInFrames={durationInFrames} layer={layer==='visual'?'geometry':'labels'} effects={scene.effects}/>
    </div>
    {layer==='text' && <>
      {title && <div data-layout-text="headline" style={{position:'absolute',left:90,top:230,width:800,fontSize:title.fontSize,lineHeight:1.3,fontWeight:800,whiteSpace:'pre-wrap'}}>{title.text}</div>}
      {copy && <div data-layout="caption" style={{position:'absolute',left:90,top:1340,width,height:138}}><div data-layout-text="caption" style={{fontSize:46,lineHeight:1.5,fontWeight:800,whiteSpace:'pre-wrap'}}>{copy.text}</div></div>}
    </>}
  </AbsoluteFill>;
};
