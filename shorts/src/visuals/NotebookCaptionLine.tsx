import React from 'react';
import {Sprite} from './notebook-assets';

export function NotebookCaptionLine({text,keyword,progress}:{text:string;keyword:string|null;progress:number}) {
  const index=keyword?text.indexOf(keyword):-1;
  if(index<0 || !keyword)return <span>{text}</span>;
  return <span>{text.slice(0,index)}<span style={{position:'relative',display:'inline-block',isolation:'isolate'}}>
    <svg aria-hidden="true" width="100%" height="44" style={{position:'absolute',left:0,top:22,zIndex:-1,opacity:.5,clipPath:`inset(0 ${(1-progress)*100}% 0 0)`}} viewBox="0 0 500 44" preserveAspectRatio="none"><Sprite name="highlighter" x={0} y={0} width={500} height={44}/></svg>
    {keyword}
  </span>{text.slice(index+keyword.length)}</span>;
}
