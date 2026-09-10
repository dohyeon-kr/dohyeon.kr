import catalog from '../../public/stickers/workspace-svg/catalog.json' with {type:'json'};

export const workspaceAssetIds = Object.freeze(Object.keys(catalog.assets));
export const workspacePalette = Object.freeze({...catalog.palette});
export function getWorkspaceAsset(id) {
  if (!Object.hasOwn(catalog.assets,id)) throw new Error(`Unknown workspace asset: ${id}`);
  return structuredClone(catalog.assets[id]);
}
export function workspaceAssetPath(id) {return `stickers/workspace-svg/${getWorkspaceAsset(id).file}`;}
export function placeWorkspaceAsset({asset, x, y, width, scale=1, rotation=0, opacity=1, label=null, layer=0, scribble=false}) {
  if (scribble !== false) throw new Error('Workspace SVG assets forbid scribble');
  if (![x,y,width,scale,rotation,opacity,layer].every(Number.isFinite) || width<=0 || scale<=0 || scale>4 || opacity<0 || opacity>1) throw new Error('Invalid workspace placement');
  const meta=getWorkspaceAsset(asset); const height=width*meta.viewBox[3]/meta.viewBox[2];
  if (label!=null && !meta.labelArea) throw new Error(`Asset has no labelArea: ${asset}`);
  return {asset,x,y,width,height,scale,rotation,opacity,label,layer,scribble:false};
}
export function placeWorkspaceAtAnchor({asset,anchor='center',at,width,scale=1,rotation=0,...rest}) {
  if (!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite)) throw new Error('Invalid workspace anchor target');
  const meta=getWorkspaceAsset(asset); if(!meta.anchors?.[anchor]) throw new Error(`Unknown anchor: ${asset}.${anchor}`);
  const [ax,ay]=meta.anchors[anchor]; const s=width/meta.viewBox[2]*scale; const r=rotation*Math.PI/180;
  const dx=s*(ax*Math.cos(r)-ay*Math.sin(r)), dy=s*(ax*Math.sin(r)+ay*Math.cos(r));
  return placeWorkspaceAsset({asset,x:at[0]-dx,y:at[1]-dy,width,scale,rotation,...rest});
}
export function validateWorkspaceScene(spec) {
  if (!spec || spec.version!==1 || spec.scribble!==false || !Array.isArray(spec.nodes) || spec.nodes.length<1 || spec.nodes.length>24) throw new Error('Invalid workspace scene');
  const ids=new Set(); for(const node of spec.nodes){if(!node.id||ids.has(node.id))throw new Error(`Duplicate workspace node: ${node.id}`);ids.add(node.id);placeWorkspaceAsset(node);}
  return spec;
}
