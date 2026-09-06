import React from 'react';
import {normalizePose, type RigPose} from './rig';

/** Hand-authored SVG puppet. Local joint coordinates keep limbs connected during rotation. */
const Arm: React.FC<{side: 'left' | 'right'; shoulder: number; elbow: number}> = ({side, shoulder, elbow}) => (
  <g data-part={`${side}-upper-arm`} transform={`translate(${side === 'left' ? 235 : 565} 468) rotate(${shoulder})`}>
    <path d="M-34-12 Q-49 4-45 48 L-37 153 Q0 177 37 153 L42 40 Q44 1 27-12Z" fill="white" />
    <g data-part={`${side}-forearm`} transform={`translate(0 150) rotate(${elbow})`}>
      <path d="M-28-16 Q0-28 28-16 L23 141 Q0 159-23 141Z" fill="white" />
      <g data-part={`${side}-hand`} transform="translate(0 134)">
        <path d="M-23 0 L-25 32 Q-38 52-29 65 Q-23 69-14 46 L-12 74 Q-10 85-4 78 L0 55 L3 81 Q9 91 13 79 L15 54 L20 75 Q27 80 28 67 L25 30 L22 0Z" fill="white" />
        <path d="M-8 28 Q1 22 11 28" fill="none" strokeWidth="3" />
      </g>
    </g>
    <path d="M-39 112 Q-2 122 38 112 L37 177 Q0 189-39 177Z" fill="white" />
    <path d="M-26 66 L-14 116" fill="none" strokeWidth="3" />
  </g>
);

export const Presenter: React.FC<{pose?: Partial<RigPose>; background?: string; showJoints?: boolean}> = ({pose: input, background = 'none', showJoints = false}) => {
  const p = normalizePose(input);
  const eyeHeight = Math.max(.5, 12 * (1 - p.blink));
  const eyebrow = p.expression === 'curious' ? -9 : p.expression === 'smile' ? -3 : 0;
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 0 920 1000" width="100%" height="100%" role="img" aria-label="도현 발표자 캐릭터">
    {background !== 'none' && <rect x="-60" width="920" height="1000" fill={background} />}
    <g stroke="#111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <g data-part="body">
        <path d="M278 799 L522 799 L536 1003 L417 1003 L400 864 L384 1003 L267 1003Z" fill="#111" />
        <path d="M310 425 Q399 390 490 425 L527 824 Q398 856 274 824Z" fill="#111" />
        <path d="M355 355 L352 417 Q400 455 448 417 L445 355Z" fill="white" />
      </g>
      <Arm side="left" shoulder={p.leftShoulder} elbow={p.leftElbow} />
      <Arm side="right" shoulder={p.rightShoulder} elbow={p.rightElbow} />
      <g data-part="overshirt">
        <path d="M351 407 L300 423 Q257 433 226 454 L259 552 L266 819 Q307 847 344 845 L343 520 L360 459Z" fill="white" />
        <path d="M449 407 L500 423 Q543 433 574 454 L541 552 L534 819 Q493 847 456 845 L457 520 L440 459Z" fill="white" />
        <path d="M352 405 L315 457 L340 448 L365 490Z M448 405 L485 457 L460 448 L435 490Z" fill="white" />
        <path d="M287 554 L299 605 M513 554 L501 605 M323 743 L322 810 M477 743 L478 810" fill="none" strokeWidth="3" />
      </g>
      <g data-part="head" transform={`rotate(${p.headTilt} 400 395)`}>
        <g data-part="ears" fill="white">
          <path d="M285 246 Q254 229 257 270 Q260 304 286 303Z M515 246 Q546 229 543 270 Q540 304 514 303Z" />
          <path d="M277 261 Q265 255 272 283 M523 261 Q535 255 528 283" fill="none" strokeWidth="3" />
        </g>
        <path data-part="face" d="M281 177 Q284 89 400 95 Q516 89 519 177 L513 284 Q507 347 427 384 Q400 401 373 384 Q293 347 287 284Z" fill="white" />
        <path data-part="hair" d="M274 255 Q246 217 255 167 Q228 107 282 63 Q327 20 391 57 Q425 24 466 51 Q529 64 540 124 Q560 180 525 251 L509 218 Q511 164 475 158 Q425 147 406 88 Q383 115 376 156 Q370 185 342 197 Q355 159 346 140 Q322 174 292 190 L291 250Z" fill="#111" />
        <path d="M281 68 Q305 24 349 30 M390 57 Q397 15 432 19 M415 87 Q443 132 487 135 M355 76 Q299 96 284 145" fill="none" strokeWidth="3" />
        <g data-part="eyebrows" fill="#111" stroke="none">
          <path d="M309 206 Q334 197 359 204 L359 211 Q334 206 311 213Z" transform={`translate(0 ${eyebrow})`} />
          <path d="M441 204 Q466 197 491 206 L489 213 Q466 206 441 211Z" transform={`translate(0 ${p.expression === 'curious' ? 2 : eyebrow})`} />
        </g>
        <g data-part="eyes" fill="#111" stroke="none">
          <ellipse cx={337 + p.gazeX * 5} cy={248 + p.gazeY * 4} rx="6.5" ry={eyeHeight} />
          <ellipse cx={463 + p.gazeX * 5} cy={248 + p.gazeY * 4} rx="6.5" ry={eyeHeight} />
        </g>
        <g data-part="glasses" fill="none" strokeWidth="3.5">
          <path d="M295 225 Q330 213 376 224 L374 269 Q369 286 335 286 Q302 286 299 270Z M505 225 Q470 213 424 224 L426 269 Q431 286 465 286 Q498 286 501 270Z M376 237 Q400 227 424 237 M295 232 L280 224 M505 232 L520 224" />
        </g>
        <path data-part="nose" d="M397 278 Q388 294 401 295" fill="none" strokeWidth="3.5" />
        <g data-part="mouth">
          {p.mouthOpen < .035 ? <path d={p.expression === 'smile' ? 'M371 327 Q399 346 431 321' : 'M373 328 Q402 333 428 321'} fill="none" strokeWidth="4" /> : <>
            <path d={`M375 324 Q401 ${323 - p.mouthOpen * 6} 428 322 Q423 ${331 + p.mouthOpen * 41} 401 ${332 + p.mouthOpen * 42} Q378 ${331 + p.mouthOpen * 39} 375 324Z`} fill="#111" strokeWidth="3" />
            <path d="M383 325 L420 324" stroke="white" strokeWidth="4" />
          </>}
        </g>
      </g>
      {showJoints && <g stroke="#e04747" fill="none" strokeWidth="3"><circle cx="400" cy="395" r="8" /><circle cx="235" cy="468" r="8" /><circle cx="565" cy="468" r="8" /></g>}
    </g>
  </svg>;
};
