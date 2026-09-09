import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Sprite} from './notebook-assets';

// One continuous notebook page; diagrams and photographs sit directly on it.
// Fine physical grain is composited by NotebookTexture above the presenter too.
export const NotebookPaper: React.FC = () => <AbsoluteFill aria-hidden="true" style={{pointerEvents:'none',background:'#111923'}}>
  <svg viewBox="0 0 1080 1920" width="100%" height="100%" preserveAspectRatio="none">
    <g opacity=".22"><Sprite name="blue" x={-160} y={-240} width={1400} height={2400}/></g>
    {Array.from({length:28},(_,i)=><path key={i} d={`M0 ${60+i*70} H1080`} stroke="#91acd2" strokeOpacity=".065"/>)}
  </svg>
</AbsoluteFill>;
