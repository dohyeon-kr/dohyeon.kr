import React, {useId} from 'react';
import {normalizePose, type RigPose} from './rig';
import {statePose, type PresenterState} from './api';
import {FACE_PRESETS, Mouth} from './Parts';

// Independently editable ink layers in the reference portrait's coordinate space.
// Fixed local-space ink texture follows each rig layer; no temporal noise or CSS animation.
export const Presenter: React.FC<PresenterState & {pose?: Partial<RigPose>; showJoints?: boolean}> = ({pose: input, showJoints = false, ...state}) => {
  const id = `presenter-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = normalizePose({...statePose(state), ...input});
  const face = FACE_PRESETS[p.expression];
  const from = FACE_PRESETS[p.expressionFrom];
  const mix = (a:number,b:number)=>a+(b-a)*p.expressionMix;
  const opening = (1-p.blink)*mix(from.eye,face.eye);
  const eyeTop=5-27*opening+6*p.blink, eyeBottom=5+8*opening+6*p.blink;
  const eyePath = `M-35 5 Q0 ${eyeTop} 35 3 Q0 ${eyeBottom} -35 5Z`;
  const headTransform = `translate(0 ${p.headNod*9}) translate(620 646) rotate(${p.headTilt}) scale(1 ${1-Math.max(0,p.headNod)*.018}) translate(-620 -646)`;
  const neckPoint=(x:number,y:number)=>{
    const a=p.headTilt*Math.PI/180, dx=x-620, dy=(y-646)*(1-Math.max(0,p.headNod)*.018);
    return `${620+dx*Math.cos(a)-dy*Math.sin(a)} ${646+p.headNod*9+dx*Math.sin(a)+dy*Math.cos(a)}`;
  };
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254" width="100%" height="100%" role="img" aria-label="도현 발표자 캐릭터 — 흑백 선화 바스트">
    <defs>
      <clipPath id={id}><circle cx="627" cy="614" r="573" /></clipPath>
      <clipPath id={`${id}-eye-left`}><path d={eyePath} /></clipPath>
      <clipPath id={`${id}-eye-right`}><path d={eyePath} /></clipPath>
      {[{name:'body',x:70,y:510,width:1090,height:740},{name:'head',x:330,y:90,width:510,height:620}].map(({name,...bounds})=><filter key={name} id={`${id}-ink-${name}`} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" {...bounds} colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".24" numOctaves="2" seed="23" result="ink-noise" />
        <feDisplacementMap in="SourceGraphic" in2="ink-noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>)}
    </defs>
    <rect width="1254" height="1254" fill="white" />
    <circle cx="627" cy="614" r="573" fill="white" />
    <g clipPath={`url(#${id})`} stroke="#111" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <g data-part="body-ink" filter={`url(#${id}-ink-body)`}>
      <g data-part="body">
        <path d="M466 714 Q511 678 551 680 L732 680 Q785 691 818 722 L862 1240 L413 1240Z" fill="#101010" />
        <path data-part="neck" d={`M${neckPoint(522,557)} Q${neckPoint(531,617)} 527 678 Q518 697 516 723 C512 773 616 807 674 797 Q755 793 773 746 Q${neckPoint(749,620)} ${neckPoint(745,562)}Z`} fill="white" />
        <path d="M515 754 Q621 837 775 767" fill="none" stroke="#252525" strokeWidth="3" />
      </g>
      <g data-part="overshirt"><path d="M524 654 C490 656 473 699 448 720 C398 740 301 770 231 811 Q181 840 159 909 L94 1127 L194 1233 L486 1233 Q520 1118 511 978 Q503 900 484 825 L393 852 Q387 855 391 844 L453 717 Q481 670 524 654Z" fill="white" />
        <path d="M745 648 Q787 650 807 695 L834 724 Q978 768 1035 819 C1081 852 1097 912 1124 1009 L1104 1233 L779 1233 Q782 1106 775 999 Q772 916 794 829 L874 860 Q884 864 879 852 L836 744 Q804 665 745 648Z" fill="white" />
        <g data-part="collar">
          {/* Each collar is a single closed face. Short underfolds sit behind it,
              never overpaint its boundary or cut a notch from the inner edge. */}
          <path data-part="collar-underfold" d="M395 853 L475 831 L484 825 L481 838Z M794 829 Q794 847 812 851 L862 866 L874 860Z" fill="#e2e2e2" stroke="none" />
          <path data-part="collar-left" d="M524 654 Q495 688 504 737 Q505 788 484 825 L396 854 Q388 857 392 846 L453 717 Q481 670 524 654Z" fill="white" strokeWidth="4" />
          <path data-part="collar-right" d="M745 648 Q777 681 773 746 Q771 791 794 829 L873 860 Q883 864 879 853 L836 744 Q804 665 745 648Z" fill="white" strokeWidth="4" />
          <path data-part="collar-seams" d="M476 834 Q480 853 491 866 Q510 887 513 914 M797 840 Q800 858 791 876 Q779 896 778 922" fill="none" strokeWidth="2.2" />
        </g>
        <g fill="none" strokeWidth="2.2">
          <path d="M230 865 Q287 1002 303 1160 M323 915 Q309 1053 318 1194 M986 909 Q966 1042 946 1154 M1061 917 Q1019 1010 1004 1117 M827 914 Q835 1091 825 1197 M464 929 Q454 1075 451 1180" />
        </g>
      </g>
      </g>
      <g data-part="head" transform={headTransform}>
        <g data-part="head-ink" filter={`url(#${id}-ink-head)`}>
        <path data-part="chin-shadow" d="M529 613 Q621 669 692 620 Q659 675 627 680 Q588 675 529 613Z" fill="#ddd" stroke="none" />
        <g data-part="ears" fill="white">
          <path d="M454 475 C415 450 416 504 434 545 Q457 585 482 558 L477 496Z M754 432 C784 398 807 431 795 473 Q791 512 763 518 L752 496Z" />
          <path d="M448 526 Q426 483 439 485 L455 505 L452 488 M774 443 Q789 425 785 450 L769 479 Q788 469 782 451" fill="none" strokeWidth="3" />
        </g>
        <path data-part="face" d="M475 348 Q478 276 522 254 Q592 232 675 257 Q750 285 757 365 L765 447 Q765 512 744 566 C722 612 669 650 628 656 Q597 659 565 640 C512 612 477 568 463 509 L450 438Z" fill="white" />
        <path data-part="hair" d="M448 478 C417 453 406 421 395 387 Q362 361 380 312 C366 274 396 218 426 198 Q476 132 545 159 C564 115 652 138 686 153 C743 167 794 214 808 263 Q817 281 809 311 C826 335 807 387 784 409 L770 448 L758 415 Q750 372 724 357 C666 346 620 319 598 288 Q576 253 569 241 Q545 260 511 260 C501 302 493 355 510 391 Q485 382 480 347 Q461 423 440 435Z" fill="#0c0c0c" />
        <g data-part="hair-strands" fill="none" stroke="#252525" strokeWidth="2">
          <path d="M551 185 C481 140 407 235 409 309 Q420 368 397 381 M540 189 C477 175 439 252 446 308 Q450 355 420 398 M536 198 C492 212 471 278 474 325 Q477 363 461 395 M529 219 Q494 272 493 326 Q492 365 505 386 M564 183 C582 205 575 251 611 287 C651 330 705 343 753 345 M581 168 C617 175 612 232 644 258 Q704 316 789 317 M592 156 C650 160 663 231 716 252 Q762 272 803 301 M567 194 C598 235 588 260 639 300 Q699 336 753 333 M623 160 C680 165 718 196 755 233 M437 220 C414 247 397 297 402 326 M763 357 Q785 385 773 408" />
        </g>
        <g fill="none" strokeWidth="2.6">
          <path d="M545 159 C506 118 469 143 432 176 M551 158 C554 113 573 107 603 119 M562 150 Q602 108 638 139" />
        </g>
        <g data-part="eyebrows" fill="none" stroke="#111" strokeWidth="8" strokeLinecap="round">
          <path d="M492 389 Q522 373 550 376" transform={`translate(0 ${mix(from.browLeft,face.browLeft)+p.browLeft*13}) rotate(${mix(from.slant,face.slant)} 525 380)`} />
          <path d="M617 359 Q649 348 681 354" transform={`translate(0 ${mix(from.browRight,face.browRight)+p.browRight*13}) rotate(${-mix(from.slant,face.slant)} 650 355)`} />
        </g>
        <g data-part="eyes">
          {[{name:'left',x:532,y:426},{name:'right',x:669,y:403}].map(({name,x,y})=><g key={name} transform={`translate(${x} ${y}) rotate(-9)`}>
            <path d={eyePath} fill="white" strokeWidth="1.3" />
            <g clipPath={`url(#${id}-eye-${name})`}>
              <ellipse cx={p.gazeX*5} cy={p.gazeY*3} rx="12" ry="14" fill="#111" stroke="none" />
            </g>
            <path data-part="upper-eyelid" d={`M-35 5 Q0 ${eyeTop} 35 3`} fill="none" strokeWidth={2.8+1.2*(1-p.blink)} />
          </g>)}
        </g>
        <g data-part="glasses" fill="none" strokeWidth="3">
          <path d="M464 416 Q507 393 563 404 Q577 408 576 425 L572 456 Q569 475 541 480 L496 485 Q477 484 472 465Z M616 390 Q650 369 699 375 Q725 375 728 390 L725 425 Q722 442 702 448 L655 458 Q636 460 628 444Z M576 414 Q593 404 621 409 M574 408 Q594 397 617 403 M464 424 L445 431 M728 387 L748 393" />
          <path d="M575 428 Q565 427 569 443 M623 417 Q633 418 629 431" strokeWidth="1.7" />
        </g>
        <g data-part="nose" strokeWidth="2.3">
          <path d="M575 482 Q568 495 582 498 M639 462 Q650 474 641 482" fill="none" />
          <path d="M585 494 Q591 483 600 491 Q598 496 585 494Z M619 485 Q625 475 634 480 Q636 485 619 485Z" fill="#111" stroke="none" />
        </g>
        <g data-part="mouth" transform="translate(620 540) rotate(-9) scale(1.65) translate(-401 -331)">
          <Mouth shape={p.mouthShape} intensity={p.mouthOpen} expression={p.expression} />
        </g>
        </g>
      </g>
      {showJoints && <circle cx="620" cy="646" r="8" stroke="#e04747" fill="none" strokeWidth="3" />}
    </g>
    <circle cx="627" cy="614" r="573" fill="none" stroke="#111" strokeWidth="5" />
  </svg>;
};
