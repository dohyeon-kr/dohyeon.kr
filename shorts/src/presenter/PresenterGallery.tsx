import React from 'react';
import {Presenter} from './Presenter';
import {Hand} from './Parts';
import {ACTIONS,HAND_SHAPES,EXPRESSIONS,MOUTH_SHAPES} from './api';
export const PresenterGallery:React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1450" width="100%" height="100%" style={{background:'white'}}>
  <rect width="1500" height="1450" fill="white" />
  {['ACTIONS / DEFAULT HAND','HAND PRESETS / SAME WRIST','EXPRESSIONS / REST MOUTH','MOUTH SHAPES / SPEECH OVERRIDE'].map((title,row)=><text key={title} x="30" y={35+row*360} fontFamily="sans-serif" fontSize="22" fill="#444">{title}</text>)}
  {ACTIONS.map((action,i)=><g key={action}><svg x={i*300+15} y="50" width="270" height="270"><Presenter action={action} /></svg><text x={i*300+150} y="342" textAnchor="middle" fontFamily="sans-serif" fontSize="22">{action}</text></g>)}
  {HAND_SHAPES.map((shape,i)=><g key={shape}><g transform={`translate(${i*300+150} 605) scale(2.8)`} stroke="#111" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"><Hand shape={shape} /></g><text x={i*300+150} y="702" textAnchor="middle" fontFamily="sans-serif" fontSize="22">{shape}</text></g>)}
  {EXPRESSIONS.map((expression,i)=><g key={expression}><svg x={i*300+15} y="770" width="270" height="270"><Presenter expression={expression} /></svg><text x={i*300+150} y="1062" textAnchor="middle" fontFamily="sans-serif" fontSize="22">{expression}</text></g>)}
  {MOUTH_SHAPES.map((shape,i)=><g key={shape}><svg x={i*300+15} y="1130" width="270" height="270"><Presenter mouth={{shape,intensity:.7}} /></svg><text x={i*300+150} y="1422" textAnchor="middle" fontFamily="sans-serif" fontSize="22">{shape}</text></g>)}
</svg>;
