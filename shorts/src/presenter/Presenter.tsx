import React, {useId} from 'react';
import {normalizePose, solveArm, REST_POSE, type RigPose} from './rig';
import {statePose, type PresenterState} from './api';
import {FACE_PRESETS, Mouth} from './Parts';

function shirtContour(side:'left'|'right', pose:RigPose) {
  const {shoulder:s,elbow:e}=solveArm(side,{x:pose[`${side}HandX`],y:pose[`${side}HandY`]});
  const sign=side==='left'?1:-1, ux=(e.x-s.x)/120,uy=(e.y-s.y)/120;
  const nx=-uy*30*sign,ny=ux*30*sign;
  const sx=s.x+nx,sy=s.y+ny,ex=e.x+nx,ey=e.y+ny;
  const neck=side==='left'?352:448,inner=side==='left'?343:457;
  // Neck → shoulder → upper sleeve share one tangent, not overlapping rigid caps.
  return `M${neck} 407 C${neck-sign*55} 422 ${sx-ux*40} ${sy-uy*40} ${sx} ${sy} L${ex} ${ey} L${ex} 730 L${inner} 730 L${inner} 503 Q${inner} 452 ${neck} 407Z`;
}

export const Presenter: React.FC<PresenterState & {pose?: Partial<RigPose>; showJoints?: boolean}> = ({pose: input, showJoints = false, ...state}) => {
  const clipId = `presenter-bust-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = normalizePose({...statePose(state),...input});
  const face=FACE_PRESETS[p.expression];
  const eyeHeight = Math.max(.5, 12 * face.eye * (1 - p.blink));
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="60 -20 680 680" width="100%" height="100%" role="img" aria-label="도현 발표자 캐릭터 — 원형 바스트">
    <defs>
      <clipPath id={clipId}><circle cx="400" cy="320" r="320" /></clipPath>
      <radialGradient id={`${clipId}-face`} cx="30%" cy="30%" r="85%">
        <stop offset="0" stopColor="#fff" /><stop offset=".65" stopColor="#fafafa" /><stop offset="1" stopColor="#dedede" />
      </radialGradient>
      <linearGradient id={`${clipId}-hair`} x2=".85" y2="1">
        <stop stopColor="#303030" /><stop offset=".6" stopColor="#151515" /><stop offset="1" stopColor="#080808" />
      </linearGradient>
      <linearGradient id={`${clipId}-shirt`} x2="1" y2=".4">
        <stop stopColor="#fff" /><stop offset=".7" stopColor="#fafafa" /><stop offset="1" stopColor="#e6e6e6" />
      </linearGradient>
    </defs>
    <circle cx="400" cy="320" r="320" fill="white" />
    <g clipPath={`url(#${clipId})`} stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <g data-part="body">
        <path d="M310 425 Q399 390 490 425 L527 824 Q398 856 274 824Z" fill="#111" />
        <path d="M355 355 L352 417 Q400 455 448 417 L445 355Z" fill="#f0f0f0" />
      </g>
      <path data-part="chin-shadow" d="M354 380 Q400 413 446 380 L447 400 Q402 431 353 402Z" fill="#d8d8d8" stroke="none" />
      <g data-part="overshirt">
        <path d={shirtContour('left',REST_POSE)} fill={`url(#${clipId}-shirt)`} />
        <path d={shirtContour('right',REST_POSE)} fill={`url(#${clipId}-shirt)`} />
        <g data-part="collar">
          <path d="M351 415 Q340 432 330 459 L353 482 L366 453Z M449 415 Q460 432 470 459 L447 482 L434 453Z" fill="#d8d8d8" stroke="none" />
          <path d="M352 406 Q337 425 325 451 Q323 455 327 458 L349 473 Q352 475 354 470 L363 444 Q357 427 352 406Z" fill="white" strokeWidth="4" />
          <path d="M448 406 Q463 425 475 451 Q477 455 473 458 L451 473 Q448 475 446 470 L437 444 Q443 427 448 406Z" fill="#f7f7f7" strokeWidth="4" />
          <path d="M349 417 Q349 431 357 445 M451 417 Q451 431 443 445" fill="none" stroke="#b8b8b8" strokeWidth="2.5" />
        </g>
      </g>

      <g data-part="head" transform={`rotate(${p.headTilt} 400 395)`}>
        <g data-part="ears" fill="white">
          <path d="M285 246 Q254 229 257 270 Q260 304 286 303Z M515 246 Q546 229 543 270 Q540 304 514 303Z" />
          <path d="M277 261 Q265 255 272 283 M523 261 Q535 255 528 283" fill="none" strokeWidth="3" />
        </g>
        <path data-part="face" d="M281 177 Q284 89 400 95 Q516 89 519 177 L513 284 Q507 347 427 384 Q400 401 373 384 Q293 347 287 284Z" fill={`url(#${clipId}-face)`} />
        <path data-part="hair" d="M279 249 Q245 211 254 146 Q254 52 328 43 Q363 36 395 59 Q434 33 474 52 Q548 77 542 159 Q543 218 520 249 L510 210 Q511 166 470 155 Q426 142 402 94 Q383 145 348 167 Q322 185 289 190 L291 245Z" fill={`url(#${clipId}-hair)`} />
        <g data-part="eyebrows" fill="none" stroke="#111" strokeWidth="9" strokeLinecap="round">
          <path d="M311 207 Q334 201 357 207" transform={`translate(0 ${face.browLeft}) rotate(${face.slant} 334 206)`} />
          <path d="M443 207 Q466 201 489 207" transform={`translate(0 ${face.browRight}) rotate(${-face.slant} 466 206)`} />
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
