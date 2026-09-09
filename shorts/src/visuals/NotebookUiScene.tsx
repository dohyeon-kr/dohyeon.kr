import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {NotebookUiAsset} from './NotebookUiAsset';
import {notebookUiAssets} from './notebook-ui-assets';
import {compileNotebookUiMotion, type NotebookUiMotionSpec} from './notebook-ui-motion';

/** Place this inside the reserved visual area; parent controls its scale, not the caption. */
export const NotebookUiScene: React.FC<{spec: NotebookUiMotionSpec; durationInFrames: number}> = ({spec,durationInFrames}) => {
  const frame=useCurrentFrame();
  const evaluate=useMemo(()=>compileNotebookUiMotion(spec),[spec]);
  if(!Number.isInteger(durationInFrames)||durationInFrames<2)throw new Error('UI scene requires at least 2 frames');
  return <div style={{position:'relative',width:spec.width,height:spec.height}}>
    {evaluate(frame/(durationInFrames-1)).map(n=>{
      const area=notebookUiAssets[n.asset].labelArea;
      const scale=n.width/notebookUiAssets[n.asset].viewBox[2];
      return <NotebookUiAsset key={n.id} asset={n.asset} width={n.width} drawProgress={n.drawProgress} scribble={spec.scribble??true} style={{position:'absolute',left:n.x,top:n.y,opacity:n.opacity,zIndex:n.layer,transform:`rotate(${n.rotation}deg) scale(${n.scale})`,transformOrigin:'top left'}}>
        {n.label&&area&&<div data-layout-text={`ui-label-${n.id}`} style={{position:'absolute',left:area[0]*scale,top:area[1]*scale,width:area[2]*scale,height:area[3]*scale,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontFamily:'Pretendard, sans-serif',fontSize:n.labelSize??28,fontWeight:700,lineHeight:1.5,color:n.asset==='button-pressed'?'#fffdf7':'#222522',whiteSpace:'pre-wrap'}}>{n.label}</div>}
      </NotebookUiAsset>;
    })}
  </div>;
};
