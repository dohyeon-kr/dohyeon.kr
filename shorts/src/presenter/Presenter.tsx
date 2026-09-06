import React, {useId} from 'react';
import {normalizePose, solveArm, type RigPose} from './rig';
import {statePose, type PresenterState} from './api';
import {FACE_PRESETS, Hand, Mouth} from './Parts';

function shirtContour(side:'left'|'right', pose:RigPose) {
  const {shoulder:s,elbow:e}=solveArm(side,{x:pose[`${side}HandX`],y:pose[`${side}HandY`]});
  const sign=side==='left'?1:-1, ux=(e.x-s.x)/120,uy=(e.y-s.y)/120;
  const nx=-uy*30*sign,ny=ux*30*sign;
  const sx=s.x+nx,sy=s.y+ny,ex=e.x+nx,ey=e.y+ny;
  const neck=side==='left'?352:448,inner=side==='left'?343:457;
  // Neck → shoulder → upper sleeve share one tangent, not overlapping rigid caps.
  return `M${neck} 407 C${neck-sign*55} 422 ${sx-ux*40} ${sy-uy*40} ${sx} ${sy} L${ex} ${ey} L${ex} 730 L${inner} 730 L${inner} 503 Q${inner} 452 ${neck} 407Z`;
}

/** A continuous rounded sleeve keeps a single clean outline across the elbow. */
const Arm: React.FC<{side: 'left' | 'right'; pose: RigPose; front?: boolean; showJoints?: boolean}> = ({side, pose, front = false, showJoints}) => {
  const {shoulder: s, elbow: e, wrist: w} = solveArm(side, {x: pose[`${side}HandX`], y: pose[`${side}HandY`]});
  const cuff = {x: e.x + (w.x - e.x) * .69, y: e.y + (w.y - e.y) * .69};
  const sleeve = `M${s.x} ${s.y} L${e.x} ${e.y} L${cuff.x} ${cuff.y}`;
  const ux = (w.x-e.x)/112, uy = (w.y-e.y)/112;
  const nx = -uy*30, ny = ux*30;
  const forearm = `M${e.x+ux*20+nx} ${e.y+uy*20+ny} L${cuff.x+nx} ${cuff.y+ny} Q${cuff.x+ux*30} ${cuff.y+uy*30} ${cuff.x-nx} ${cuff.y-ny} L${e.x+ux*20-nx} ${e.y+uy*20-ny}`;
  return <g data-part={`${side}-${front ? 'forearm' : 'sleeve'}`}>
    {!front && <><path d={sleeve} fill="none" stroke="#111" strokeWidth="66" /><path d={sleeve} fill="none" stroke="white" strokeWidth="54" /></>}
    {front && <>
      <path d={`M${cuff.x} ${cuff.y} L${w.x} ${w.y}`} stroke="#111" strokeWidth="40" />
      <path d={`M${cuff.x} ${cuff.y} L${w.x} ${w.y}`} stroke="white" strokeWidth="28" />
      <path d={`${forearm}Z`} fill="white" stroke="none" />
      <path d={forearm} fill="none" stroke="#111" strokeWidth="6" />
      <g data-part={`${side}-hand`} transform={`translate(${w.x} ${w.y}) rotate(${pose[`${side}Wrist`]}) scale(${side === 'left' ? -1 : 1} 1)`}>
        <Hand shape={pose[`${side}HandShape`]} />
      </g>
      {showJoints && <g fill="none" stroke="#d44" strokeWidth="2">{[s,e,w].map((v,i) => <circle key={i} cx={v.x} cy={v.y} r="7" />)}</g>}
    </>}
  </g>;
};

export const Presenter: React.FC<PresenterState & {pose?: Partial<RigPose>; showJoints?: boolean}> = ({pose: input, showJoints = false, ...state}) => {
  const clipId = `presenter-bust-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = normalizePose({...statePose(state),...input});
  const face=FACE_PRESETS[p.expression];
  const eyeHeight = Math.max(.5, 12 * face.eye * (1 - p.blink));
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="60 -20 680 680" width="100%" height="100%" role="img" aria-label="도현 발표자 캐릭터 — 원형 바스트">
    <defs><clipPath id={clipId}><circle cx="400" cy="320" r="320" /></clipPath></defs>
    <circle cx="400" cy="320" r="320" fill="white" />
    <g clipPath={`url(#${clipId})`} stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <g data-part="body">
        <path d="M310 425 Q399 390 490 425 L527 824 Q398 856 274 824Z" fill="#111" />
        <path d="M355 355 L352 417 Q400 455 448 417 L445 355Z" fill="white" />
      </g>
      <Arm side="left" pose={p} />
      <Arm side="right" pose={p} />
      <g data-part="overshirt">
        <path d={shirtContour('left',p)} fill="white" />
        <path d={shirtContour('right',p)} fill="white" />
        <path d="M352 407 L320 455 L355 477 M448 407 L480 455 L445 477" fill="none" strokeWidth="4" />
      </g>
      <Arm side="left" pose={p} front showJoints={showJoints} />
      <Arm side="right" pose={p} front showJoints={showJoints} />
      <g data-part="head" transform={`rotate(${p.headTilt} 400 395)`}>
        <g data-part="ears" fill="white">
          <path d="M285 246 Q254 229 257 270 Q260 304 286 303Z M515 246 Q546 229 543 270 Q540 304 514 303Z" />
          <path d="M277 261 Q265 255 272 283 M523 261 Q535 255 528 283" fill="none" strokeWidth="3" />
        </g>
        <path data-part="face" d="M281 177 Q284 89 400 95 Q516 89 519 177 L513 284 Q507 347 427 384 Q400 401 373 384 Q293 347 287 284Z" fill="white" />
        <path data-part="hair" d="M279 249 Q245 211 254 146 Q254 52 328 43 Q363 36 395 59 Q434 33 474 52 Q548 77 542 159 Q543 218 520 249 L510 210 Q511 166 470 155 Q426 142 402 94 Q383 145 348 167 Q322 185 289 190 L291 245Z" fill="#111" />
        <g data-part="eyebrows" fill="#111" stroke="none">
          <path d="M309 206 Q334 197 359 204 L359 211 Q334 206 311 213Z" transform={`translate(0 ${face.browLeft}) rotate(${face.slant} 334 206)`} />
          <path d="M441 204 Q466 197 491 206 L489 213 Q466 206 441 211Z" transform={`translate(0 ${face.browRight}) rotate(${-face.slant} 466 206)`} />
        </g>
        <g data-part="eyes" fill="#111" stroke="none">
          <ellipse cx={337 + p.gazeX * 5} cy={248 + p.gazeY * 4} rx="6.5" ry={eyeHeight} />
          <ellipse cx={463 + p.gazeX * 5} cy={248 + p.gazeY * 4} rx="6.5" ry={eyeHeight} />
        </g>
        <g data-part="glasses" fill="none" strokeWidth="4">
          <path d="M295 225 Q330 213 376 224 L374 269 Q369 286 335 286 Q302 286 299 270Z M505 225 Q470 213 424 224 L426 269 Q431 286 465 286 Q498 286 501 270Z M376 237 Q400 227 424 237 M295 232 L280 224 M505 232 L520 224" />
        </g>
        <path data-part="nose" d="M397 278 Q388 294 401 295" fill="none" strokeWidth="3.5" />
        <g data-part="mouth">
          <Mouth shape={p.mouthShape} intensity={p.mouthOpen} expression={p.expression} />
        </g>
      </g>
      {showJoints && <g stroke="#e04747" fill="none" strokeWidth="3"><circle cx="400" cy="395" r="8" /></g>}
    </g>
    <circle cx="400" cy="320" r="320" fill="none" stroke="#111" strokeWidth="4" />
  </svg>;
};
