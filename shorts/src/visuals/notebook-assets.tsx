import React, {useState, useEffect} from 'react';
import {staticFile, delayRender, continueRender, cancelRender} from 'remotion';
export const NOTEBOOK_FONT='Nanum Pen Script';
export const sprites={
  paper:{file:'papers.webp',sheet:[1536,1024],crop:[24,576,496,339]},
  blue:{file:'papers.webp',sheet:[1536,1024],crop:[526,155,491,354]},
  tape:{file:'papers.webp',sheet:[1536,1024],crop:[537,565,438,190]},
  check:{file:'marks.webp',sheet:[1254,1254],crop:[476,20,310,320]},
  star:{file:'marks.webp',sheet:[1254,1254],crop:[468,623,344,289]},
  underline:{file:'marks.webp',sheet:[1254,1254],crop:[15,412,464,158]},
} as const;
export type StickerAsset=keyof typeof sprites;
export const assetUrl=(name:string)=>staticFile(`notebook/${name}`);
export function Sprite({name,x,y,width,height}:{name:StickerAsset;x:number;y:number;width:number;height:number}) {
  const s=sprites[name];
  return <svg x={x} y={y} width={width} height={height} viewBox={s.crop.join(' ')} preserveAspectRatio="none" style={{mixBlendMode:'screen'}}><image href={assetUrl(s.file)} width={s.sheet[0]} height={s.sheet[1]}/></svg>;
}
export function useNotebookAssets(enabled:boolean) {
  const [handle]=useState(()=>enabled?delayRender('Load notebook ink, stickers and handwriting'):null);
  useEffect(()=>{if(handle===null)return;
    Promise.all([...['papers.webp','marks.webp'].map(file=>{const im=new Image();im.src=assetUrl(file);return im.decode();}),document.fonts.load(`400 36px "${NOTEBOOK_FONT}"`).then(f=>{if(!f.length)throw new Error('Notebook handwriting font failed to load');})])
      .then(()=>continueRender(handle)).catch(cancelRender);
  },[handle]);
}
