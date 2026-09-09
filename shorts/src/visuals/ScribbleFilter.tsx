import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

// Shared by notebook geometry and large headings. No wall-clock randomness.
export const ScribbleFilter: React.FC<{id: string}> = ({id}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden="true"><defs>
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves={2} seed={1 + Math.floor(frame * 10 / fps)} result="roughness" />
      <feDisplacementMap in="SourceGraphic" in2="roughness" scale={4} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs></svg>;
};
