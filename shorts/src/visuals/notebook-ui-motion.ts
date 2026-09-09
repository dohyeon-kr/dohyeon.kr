import {notebookUiAssets, type NotebookUiAssetId} from './notebook-ui-assets.ts';

export type UiProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'drawProgress';
export type UiNode = {
  id: string; asset: NotebookUiAssetId; x: number; y: number; width: number;
  scale?: number | null; rotation?: number | null; opacity?: number | null; layer?: number | null;
  label?: string | null; labelSize?: number | null; drawProgress?: number | null;
};
export type UiEvent = {target: string; property: UiProperty; from: number; to: number; start: number; end: number; easing?: 'linear' | 'smooth' | null};
export type UiStateChange = {target: string; at: number; asset: NotebookUiAssetId};
export type NotebookUiMotionSpec = {
  version: 1; width: number; height: number; scribble?: boolean | null;
  nodes: UiNode[]; events: UiEvent[]; states?: UiStateChange[] | null;
};
export type UiPose = UiNode & {scale: number; rotation: number; opacity: number; drawProgress: number; layer: number};
const properties: UiProperty[] = ['x','y','scale','rotation','opacity','drawProgress'];
const finite = (v: number) => typeof v === 'number' && Number.isFinite(v);
const initial = (n: UiNode, property: UiProperty) => n[property] ?? (property === 'scale' || property === 'opacity' || property === 'drawProgress' ? 1 : 0);
const known = (id: string) => Object.hasOwn(notebookUiAssets, id);
const range = (p: UiProperty, v: number) => finite(v) && ((p === 'opacity' || p === 'drawProgress') ? v >= 0 && v <= 1 : p === 'scale' ? v > 0 && v <= 4 : true);

export function validateNotebookUiMotion(spec: NotebookUiMotionSpec) {
  if (spec.version !== 1 || !finite(spec.width) || !finite(spec.height) || spec.width <= 0 || spec.height <= 0) throw new Error('Invalid UI canvas');
  if (spec.scribble != null && typeof spec.scribble !== 'boolean') throw new Error('Invalid scribble flag');
  if (!Array.isArray(spec.nodes) || !spec.nodes.length || !Array.isArray(spec.events) || (spec.states != null && !Array.isArray(spec.states))) throw new Error('Invalid UI tracks');
  const nodes = new Map<string,UiNode>();
  for (const n of spec.nodes) {
    if (!n.id || nodes.has(n.id) || !known(n.asset) || !finite(n.width) || n.width <= 0 || !finite(n.x) || !finite(n.y)) throw new Error(`Invalid UI node: ${n.id}`);
    if (n.layer != null && !finite(n.layer)) throw new Error(`Invalid UI layer: ${n.id}`);
    if (n.label != null && typeof n.label !== 'string') throw new Error(`Invalid label: ${n.id}`);
    if (n.labelSize != null && (!finite(n.labelSize) || n.labelSize < 24)) throw new Error(`Label too small: ${n.id}`);
    for (const p of properties) if (!range(p,initial(n,p))) throw new Error(`Invalid ${p}: ${n.id}`);
    if (n.label && !notebookUiAssets[n.asset].labelArea) throw new Error(`No label area: ${n.id}`);
    nodes.set(n.id,n);
  }
  const tracks = new Map<string,UiEvent[]>();
  for (const e of spec.events) {
    if (!nodes.has(e.target) || !properties.includes(e.property) || !finite(e.start) || !finite(e.end) || e.start < 0 || e.end > 1 || e.start >= e.end || !range(e.property,e.from) || !range(e.property,e.to) || (e.easing != null && !['linear','smooth'].includes(e.easing))) throw new Error(`Invalid UI event: ${e.target}`);
    if(e.property === 'drawProgress' && nodes.get(e.target)!.asset !== 'arrow') throw new Error('drawProgress requires arrow');
    const k=`${e.target}/${e.property}`;tracks.set(k,[...(tracks.get(k)??[]),e]);
  }
  for (const events of tracks.values()) {
    events.sort((a,b)=>a.start-b.start);
    let value=initial(nodes.get(events[0].target)!,events[0].property), end=-1;
    for (const e of events) {
      if (e.start < end || Math.abs(e.from-value)>1e-6) throw new Error(`Overlapping or discontinuous UI track: ${e.target}/${e.property}`);
      value=e.to;end=e.end;
    }
  }
  const times=new Set<string>();
  for (const s of spec.states??[]) {
    const n=nodes.get(s.target); const key=`${s.target}/${s.at}`;
    if (!n || !known(s.asset) || !finite(s.at) || s.at<0 || s.at>1 || times.has(key)) throw new Error(`Invalid UI state: ${s.target}`);
    const a=notebookUiAssets[n.asset],b=notebookUiAssets[s.asset];
    if(a.viewBox[2]!==b.viewBox[2] || a.viewBox[3]!==b.viewBox[3] || (n.label&&!b.labelArea)) throw new Error(`State geometry differs: ${s.target}`);
    times.add(key);
  }
  return spec;
}

/** Compile once; evaluate deterministically using scene progress, independent of wall time. */
export function compileNotebookUiMotion(input: NotebookUiMotionSpec) {
  const spec=structuredClone(validateNotebookUiMotion(input));
  const events=[...spec.events].sort((a,b)=>a.start-b.start);
  const states=[...(spec.states??[])].sort((a,b)=>a.at-b.at);
  return (progress: number): UiPose[] => {
    if(!finite(progress)) throw new Error('Invalid UI progress');
    const p=Math.max(0,Math.min(1,progress));
    const result=spec.nodes.map(n=>({...n,scale:n.scale??1,rotation:n.rotation??0,opacity:n.opacity??1,layer:n.layer??0,drawProgress:n.drawProgress??1}));
    for(const n of result) {
      for(const e of events) if(e.target===n.id && p>=e.start) {
        let t=Math.min(1,(p-e.start)/(e.end-e.start));if(e.easing!=='linear')t=t*t*(3-2*t);
        n[e.property]=e.from+(e.to-e.from)*t;
      }
      for(const s of states) if(s.target===n.id && p>=s.at)n.asset=s.asset;
    }
    return result.sort((a,b)=>a.layer-b.layer);
  };
}

/** Tail occupies 70%, then each head stroke receives 15%. Never reveal the head early. */
export function arrowStrokeProgress(progress: number) {
  const clamp = (n: number) => Math.max(0, Math.min(1,n));
  return [clamp(progress/.7), clamp((progress-.7)/.15), clamp((progress-.85)/.15)];
}
export function validateSceneUiMotion(scene: {uiMotion?: NotebookUiMotionSpec | null; image?: unknown; imagePath?: unknown; diagramSpec?: unknown; presenter?: unknown; backgroundVideo?: unknown; kind?: string | null; visual?: {type?: string}; layout?: string}) {
  if (!scene.uiMotion) return;
  validateNotebookUiMotion(scene.uiMotion);
  if(scene.image || scene.imagePath || scene.diagramSpec || scene.presenter || scene.backgroundVideo || scene.kind === 'compare' || scene.layout?.startsWith('compare-') || (scene.visual?.type && scene.visual.type !== 'none')) throw new Error('uiMotion requires an exclusive visual area');
}
