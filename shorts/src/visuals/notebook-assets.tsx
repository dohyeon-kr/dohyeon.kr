import React, {useState, useEffect, useId} from 'react';
import {staticFile, delayRender, continueRender, cancelRender} from 'remotion';
export const NOTEBOOK_FONT='Nanum Pen Script';
import {NOTEBOOK_ASSETS, type StickerAsset} from './notebook-catalog';
export {type StickerAsset} from './notebook-catalog';
export const sprites=NOTEBOOK_ASSETS;
export const assetUrl=(name:string)=>staticFile(`notebook/${name}`);
export function Sprite({name,x,y,width,height}:{name:StickerAsset;x:number;y:number;width:number;height:number}) {
  const s=sprites[name], id=`cutout-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  return <svg x={x} y={y} width={width} height={height} viewBox={s.crop.join(' ')} preserveAspectRatio="none" ><defs><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 6 0 -0.7"/></filter></defs><image href={assetUrl(s.file)} width={s.sheet[0]} height={s.sheet[1]} filter={`url(#${id})`}/></svg>;
}
export function useNotebookAssets(enabled:boolean) {
  const [handle]=useState(()=>enabled?delayRender('Load notebook ink, stickers and handwriting'):null);
  useEffect(()=>{if(handle===null)return;
    Promise.all([...['papers.webp','marks.webp'].map(file=>{const im=new Image();im.src=assetUrl(file);return im.decode();}),document.fonts.load(`400 36px "${NOTEBOOK_FONT}"`).then(f=>{if(!f.length)throw new Error('Notebook handwriting font failed to load');})])
      .then(()=>continueRender(handle)).catch(cancelRender);
  },[handle]);
}
