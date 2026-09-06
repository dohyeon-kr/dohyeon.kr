import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Presenter} from './Presenter';
import {compilePresenter, MOUTH_SHAPES, type PresenterSpec} from './api';

export const demoTracks:PresenterSpec = {
  version:1,
  actions:[{start:.5,end:3.2,name:'explain'},{start:3.4,end:6,name:'present'},{start:6.2,end:8.8,name:'point'},{start:9,end:11.8,name:'emphasize'}],
  expressions:[{start:.5,end:3.2,name:'smile'},{start:3.4,end:6,name:'curious'},{start:6.2,end:8.8,name:'serious'},{start:9,end:11.8,name:'surprised'}],
  // Authored cases only, not inferred TTS alignment.
  mouths:[1.2,4.1,6.9,9.7].flatMap(start=>MOUTH_SHAPES.map((shape,i)=>({start:start+i*.24,end:start+(i+1)*.24,shape,intensity:.7}))),
};
const evaluate=compilePresenter(demoTracks,12);
export const PresenterPreview: React.FC = () => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const t = frame / fps;
  const pose=evaluate(t);
  const active=demoTracks.actions?.find(c=>t>=c.start&&t<c.end)?.name ?? 'idle';
  return <AbsoluteFill style={{background: '#fff'}}>
    <div style={{position: 'absolute', inset: '20px 20px 50px'}}><Presenter pose={pose} /></div>
    <div style={{position: 'absolute', bottom: 14, width: '100%', textAlign: 'center', color: '#666', fontFamily: 'sans-serif', fontSize: 14}}>{active.toUpperCase()} · AUTHORED MOUTH CASES · NO TTS</div>
  </AbsoluteFill>;
};
