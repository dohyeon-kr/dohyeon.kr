import React from 'react';
import {Img, staticFile} from 'remotion';

/** Photo print + reusable RGBA tape. Padding is transparent asset space. */
export const PrintedPhoto: React.FC<{src: string}> = ({src}) => <div style={{position: 'absolute', inset: '26px 18px 18px', boxSizing: 'border-box', background: '#fffefa', padding: '18px 18px 40px', boxShadow: '0 3px 9px rgba(40,30,15,.12)'}}>
  <Img src={staticFile(src)} style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: '#fffefa'}} />
  {/* Opaque pixels are ~22..68% of the PNG height. Tape crosses the top edge. */}
  <Img src={staticFile('templates/notebook-grid/tape.png')} style={{position: 'absolute', width: 220, height: 'auto', top: -38, left: 'calc(50% - 110px)', opacity: .62, transform: 'rotate(-4deg)', pointerEvents: 'none'}} />
</div>;
