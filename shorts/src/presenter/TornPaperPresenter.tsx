import React, {useId} from 'react';
import {Presenter} from './Presenter';
import type {RigPose} from './rig';

// Original vector frame: back aperture -> live rig -> foreground folded paper.
// The upper clipping corridor lets the head emerge; the lower edge hides the torso.
export const TornPaperPresenter: React.FC<{pose?: Partial<RigPose>}> = ({pose}) => {
  const id=`torn-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const hole='M60 115 L85 95 111 99 137 85 164 91 190 84 207 104 232 116 231 141 252 160 238 182 245 207 225 221 218 241 192 238 171 253 145 243 120 253 103 236 78 239 70 219 48 204 56 180 44 158 59 141Z';
  return <svg viewBox="0 0 300 300" width="100%" height="100%" role="img" aria-label="찢어진 파란 종이 밖으로 나온 발표자">
    <defs>
      <clipPath id={id}><path d={hole}/><path d="M74 0 H226 V176 H74Z"/></clipPath>
      <radialGradient id={`${id}-shadow`}><stop offset="0" stopColor="#10131b"/><stop offset="1" stopColor="#03060c"/></radialGradient>
      <linearGradient id={`${id}-fold`} x2="0" y2="1"><stop stopColor="#bfd0f3"/><stop offset="1" stopColor="#5b79a5"/></linearGradient>
    </defs>
    <path d={hole} fill={`url(#${id}-shadow)`} stroke="#5579ad" strokeWidth="14" strokeLinejoin="miter"/>
    <path d="M60 115 L53 91 81 88 85 95 M111 99 L115 70 137 85 M190 84 L216 82 207 104 M232 116 L253 125 231 141 M44 158 L28 165 56 180" fill="#8fa9d3" stroke="#b3c7e7" strokeWidth="1.2"/>
    <g clipPath={`url(#${id})`}><svg x="18" y="-4" width="264" height="290" viewBox="0 0 1254 1254"><Presenter pose={pose} cutout/></svg></g>
    <path d="M48 204 L70 219 78 239 103 236 120 253 145 243 171 253 192 238 218 241 225 221 245 207 L263 232 237 246 228 266 196 261 172 278 145 266 118 275 98 259 71 260 60 238 35 225Z" fill={`url(#${id}-fold)`} stroke="#b9ceee" strokeWidth="1.3"/>
    <path d="M70 219 L60 238 M103 236 L98 259 M145 243 L145 266 M192 238 L196 261 M225 221 L237 246" stroke="#46618a" strokeWidth="1.5"/>
    <path d="M48 204 L70 219 78 239 103 236 120 253 145 243 171 253 192 238 218 241 225 221 245 207" fill="none" stroke="#e0eaff" strokeWidth="2"/>
  </svg>;
};
