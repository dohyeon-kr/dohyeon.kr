import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile} from 'remotion';
import type {RenderScene} from '../types';

// Above the presenter and captions; fixed sampling prevents grain from boiling.
export const NotebookTexture: React.FC<{scenes:RenderScene[];framesForScene:(scene:RenderScene)=>number}> = ({scenes,framesForScene}) => {
  let cursor=0;
  return <>{scenes.map((scene,index)=>{
    const from=cursor, durationInFrames=framesForScene(scene);cursor+=durationInFrames;
    if(!scene.diagramSpec?.notebook || scene.commonPage==='blog-cta-v1')return null;
    return <Sequence key={index} from={from} durationInFrames={durationInFrames} style={{pointerEvents:'none',zIndex:1000,mixBlendMode:'soft-light',opacity:.2}}>
      <AbsoluteFill><Img src={staticFile('notebook/paper-grain.png')} style={{width:'100%',height:'100%',objectFit:'cover',filter:'grayscale(1) brightness(.55) contrast(1.8)'}}/></AbsoluteFill>
    </Sequence>;
  })}</>;
};
