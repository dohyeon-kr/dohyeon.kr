import type {DiagramSpec} from './diagram-spec.ts';
type Node = DiagramSpec['nodes'][number];
export type SketchPoint = [number, number];
export const NOTEBOOK_INK = '#8eafff';
// IDs seed the texture once. No frame/time/random input: seeking never makes ink boil.
const noise = (id: string, i: number) => {
  let hash=2166136261;
  for (const char of `${id}:${i}`) hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return (hash>>>0)/4294967295;
};
export function sketchPoints(node: Node): SketchPoint[] {
  const {width:w,height:h,id}=node;
  if (node.shape==='line') return Array.from({length:17},(_,i)=> {
    const along=i/16-.5, offset=i===0||i===16 ? 0 : (noise(id,i)-.5)*2;
    return h>w ? [offset,along*h] : [along*w,offset];
  });
  if (node.shape==='circle') return Array.from({length:64},(_,i)=> {
    const a=i/64*Math.PI*2, inset=noise(id,i)*1.2;
    return [Math.cos(a)*Math.max(0,w/2-inset),Math.sin(a)*Math.max(0,h/2-inset)];
  });
  if (node.shape!=='rect') return [];
  return Array.from({length:48},(_,i)=> {
    const side=Math.floor(i/12), t=(i%12)/12;
    const inset=i%12===0 ? 0 : noise(id,i)*(node.role==='sticker'?1.4:1.1);
    return side===0 ? [-w/2+t*w,-h/2+inset] : side===1 ? [w/2-inset,-h/2+t*h] : side===2 ? [w/2-t*w,h/2-inset] : [-w/2+inset,h/2-t*h];
  });
}
export const sketchPath = (node: Node) => sketchPoints(node).map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ') + (node.shape==='line'?'':' Z');
export const notebookFill = (node: Node) => node.fill==='none'?'none':node.fill==='white'?'#c0d2fb':'#263e63';
