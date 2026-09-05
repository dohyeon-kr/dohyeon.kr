import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';
import type {RenderScene} from '../types';

// The prepared silent clip already has the selected trim, rate and scene duration.
// OffthreadVideo follows the local Sequence/Freeze frame, including transition handles.
export const VideoBackground: React.FC<{scene: RenderScene}> = ({scene}) => {
  if (!scene.backgroundVideo) return null;
  if (!scene.videoPath) throw new Error(`Video background was not prepared: ${scene.backgroundVideo.assetId}`);
  const {cropX, cropY, overlayOpacity} = scene.backgroundVideo;
  return <AbsoluteFill style={{overflow: 'hidden'}}>
    <OffthreadVideo src={staticFile(scene.videoPath)} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${cropX * 100}% ${cropY * 100}%`, filter: 'grayscale(1)'}} />
    <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${Math.min(.95, overlayOpacity + .15)}) 65%, rgba(0,0,0,.95))`}} />
  </AbsoluteFill>;
};
