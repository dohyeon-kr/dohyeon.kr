import React from 'react';
import type {Expression, HandShape, MouthShape} from './vocabulary';
// All silhouettes use the same wrist attachment: x=-13..13, y=7.
export const HAND_PATHS: Record<HandShape,{outline:string;detail:string}> = {
  relaxed:{outline:'M-13 7 Q-22-7-20-25 Q-20-35-13-31 L-8-22 L-8-34 Q-8-42 0-40 L13-35 Q20-32 19-21 L17-4 Q16 4 13 7Z',detail:'M0-31 L0-22 M9-29 L9-21'},
  open:{outline:'M-13 7 Q-25-5-27-20 Q-30-31-23-32 Q-18-32-13-19 L-13-43 Q-13-53-5-53 L10-51 Q18-50 18-40 L19-14 Q19 0 13 7Z',detail:'M-3-47 L-3-33 M7-46 L7-32'},
  palmUp:{outline:'M-13 7 Q-19-1-29-8 L-45-19 Q-52-25-47-29 Q-43-32-34-26 L-17-19 Q-6-17 1-26 Q5-33 11-30 Q17-26 11-17 L18-14 Q25-10 20-2 L13 7Z',detail:'M-29-19 Q-14-12-5-15'},
  point:{outline:'M-13 7 Q-22-5-20-21 L-17-48 Q-17-58-10-58 Q-3-58-3-48 L-3-24 Q9-30 17-23 Q23-20 21-10 L17 1 L13 7Z',detail:'M-2-21 L-1-11 M7-21 L7-12'},
  fist:{outline:'M-13 7 Q-22-1-21-15 L-21-24 Q-20-31-12-31 L9-30 Q20-29 20-19 L19-7 Q19 2 13 7Z',detail:'M-16-13 Q-6-18 2-11 M-6-26 L-6-21 M4-25 L4-20'},
};
export const Hand:React.FC<{shape:HandShape}> = ({shape}) => <g data-hand-shape={shape}>
  <path d={HAND_PATHS[shape].outline} fill="white" />
  <path d={HAND_PATHS[shape].detail} fill="none" strokeWidth="3" />
</g>;
export const FACE_PRESETS:Record<Expression,{browLeft:number;browRight:number;slant:number;eye:number;rest:string}> = {
  neutral:{browLeft:0,browRight:0,slant:0,eye:1,rest:'M373 328 Q402 333 428 321'},
  smile:{browLeft:-3,browRight:-3,slant:0,eye:.85,rest:'M371 327 Q399 346 431 321'},
  curious:{browLeft:-10,browRight:2,slant:-2,eye:1,rest:'M380 330 Q405 332 425 324'},
  serious:{browLeft:3,browRight:3,slant:10,eye:.8,rest:'M377 330 L424 330'},
  surprised:{browLeft:-15,browRight:-15,slant:0,eye:1.25,rest:'M392 326 Q401 318 410 326 Q415 343 401 345 Q388 343 392 326Z'},
};
export const Mouth:React.FC<{shape:MouthShape;intensity:number;expression:Expression}> = ({shape,intensity,expression}) => {
  const v=Math.min(1,Math.max(0,intensity));
  if(shape==='rest' || (v<.015 && shape!=='M')) return <path data-mouth-shape="rest" d={FACE_PRESETS[expression].rest} fill={expression==='surprised'?'#111':'none'} strokeWidth="4" />;
  if(shape==='M') return <g data-mouth-shape="M"><path d="M378 329 Q400 334 423 329" fill="none" strokeWidth="5" /><path d="M390 337 Q400 340 411 336" fill="none" strokeWidth="2.5" /></g>;
  const rx=shape==='O' ? 10+v*5 : shape==='I' ? 25+v*5 : 19+v*7;
  const ry=shape==='O' ? 9+v*13 : shape==='I' ? 3+v*4 : 5+v*22;
  return <g data-mouth-shape={shape}><ellipse cx="401" cy="331" rx={rx} ry={ry} fill="#111" strokeWidth="3" />
    {shape==='I' && <path d="M380 329 L422 329" stroke="white" strokeWidth="4" />}
  </g>;
};
