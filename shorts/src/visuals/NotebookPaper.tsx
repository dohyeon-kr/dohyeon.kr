import React, {useId} from 'react';
// Backing paper is a background layer, never a sticker/obstacle in the diagram.
export const NotebookPaper: React.FC = () => {
  const id=`paper-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const edge='M12 19 L78 12 135 20 211 11 295 19 374 10 449 18 521 12 612 19 705 11 787 20 L780 108 789 177 781 245 790 321 782 399 789 477 780 545 L696 538 622 549 546 540 470 550 390 540 312 548 232 540 148 550 78 539 12 545 L19 467 10 390 18 315 9 237 18 167 10 96Z';
  return <svg viewBox="0 0 800 560" width="100%" height="100%" aria-hidden="true" style={{position:'absolute',inset:0}}>
    <defs><clipPath id={id}><path d={edge}/></clipPath><pattern id={`${id}-grain`} width="13" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".65" fill="#adc8ff" opacity=".1"/><circle cx="10" cy="13" r=".5" fill="#000" opacity=".18"/></pattern></defs>
    <path d={edge} fill="#18283e" stroke="#466389" strokeWidth="1.5"/>
    <g clipPath={`url(#${id})`}>
      {Array.from({length:15},(_,i)=><path key={i} d={`M0 ${35+i*36} H800`} stroke="#8ba8d6" strokeOpacity=".12"/>)}
      <rect width="800" height="560" fill={`url(#${id}-grain)`}/>
    </g>
  </svg>;
};
