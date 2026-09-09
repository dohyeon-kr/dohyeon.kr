import React, {useId} from 'react';
import {Img, staticFile} from 'remotion';
import {arrowStrokeProgress} from './notebook-ui-motion';
import {ScribbleFilter} from './ScribbleFilter';
import {notebookUiAssets, type NotebookUiAssetId} from './notebook-ui-assets';

export type NotebookUiAssetProps = {
  asset: NotebookUiAssetId;
  width?: number;
  drawProgress?: number;
  /** Use the outer layer for positioning, rotation and entry/exit animation. */
  style?: React.CSSProperties;
  /** Animated 10 Hz outline is the default; disable only for an explicit still treatment. */
  scribble?: boolean;
  /** Text/labels remain sharp because they are siblings of the filtered artwork. */
  children?: React.ReactNode;
};

export const NotebookUiAsset: React.FC<NotebookUiAssetProps> = ({asset, width, style, scribble = true, drawProgress = 1, children}) => {
  const id = `notebook-ui-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const item = notebookUiAssets[asset];
  if (!item) throw new Error(`Unknown notebook UI asset: ${asset}`);
  const renderedWidth = width ?? item.viewBox[2];
  const height = renderedWidth * item.viewBox[3] / item.viewBox[2];
  return <div data-notebook-ui-asset={asset} style={{position: 'relative', width: renderedWidth, height, ...style}}>
    {scribble && <ScribbleFilter id={id} />}
    {asset === 'arrow' ? <svg viewBox="0 0 180 76" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'visible',filter:scribble ? `url(#${id})` : undefined}}>
      {['M 12,40 C 63,34 117,44 165,36','M 165,36 L 143,18','M 165,36 L 145,58'].map((d,i)=><path key={i} d={d} fill="none" stroke="#ba652e" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1-arrowStrokeProgress(drawProgress)[i]} opacity={arrowStrokeProgress(drawProgress)[i]>0?1:0} />)}
    </svg> : <Img src={staticFile(`stickers/notebook-ui-svg/${item.file}`)} alt="" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', filter: scribble ? `url(#${id})` : undefined}} />}
    <div style={{position: 'absolute', inset: 0}}>{children}</div>
  </div>;
};
