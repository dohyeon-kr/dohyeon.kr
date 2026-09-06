import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Presenter} from './Presenter';
import {poseAt, type Envelope, type GestureCue} from './rig';

export const demoCues: GestureCue[] = [{startSeconds: 1, endSeconds: 4.5, gesture: 'explain'}, {startSeconds: 5, endSeconds: 7.5, gesture: 'present'}];
// Synthetic envelope deliberately labelled as a demo. No real TTS/audio is implied.
export const demoEnvelope: Envelope = {sampleRate: 30, samples: Array.from({length: 240}, (_, i) => {
  const t = i / 30;
  return t > 1.4 && t < 4 || t > 5.5 && t < 7 ? Math.max(0, Math.sin(t * 17)) * .65 : 0;
})};
export const PresenterPreview: React.FC<{dark?: boolean}> = ({dark = false}) => {
  const frame = useCurrentFrame(), {fps} = useVideoConfig();
  const t = frame / fps;
  const pose = poseAt(t, {cues: demoCues, envelope: demoEnvelope, expression: t >= 5 ? 'curious' : 'smile'});
  pose.headTilt += Math.sin(t * 1.4) * 2;
  pose.gazeX = Math.sin(t * .8) * .35;
  return <AbsoluteFill style={{background: dark ? '#080808' : '#fff'}}>
    <div style={{position: 'absolute', inset: '60px 70px 0'}}><Presenter pose={pose} outline={dark} /></div>
    <div style={{position: 'absolute', bottom: 20, width: '100%', textAlign: 'center', color: dark ? '#bbb' : '#555', fontFamily: 'sans-serif', fontSize: 18}}>SVG RIG · SYNTHETIC MOUTH DEMO · NO TTS</div>
  </AbsoluteFill>;
};
