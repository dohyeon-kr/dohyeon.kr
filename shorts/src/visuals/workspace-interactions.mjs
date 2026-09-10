// Four workspace interaction assets; no renderer or network dependency.
const registry = {"speech-bubble":{"file":"speech-bubble.svg","viewBox":[0,0,240,200],"category":"interaction","labelArea":[36,40,168,80],"anchors":{"tip":[56,178],"content":[120,80],"left":[18,80],"right":[222,80]},"stateFamily":"speech-bubble","groups":["body"],"strokePaths":null},"pointing-hand":{"file":"pointing-hand.svg","viewBox":[0,0,96,128],"category":"interaction","labelArea":null,"anchors":{"tip":[42,10],"palm":[59,88]},"stateFamily":"pointing-hand","groups":["hand","cuff"],"strokePaths":null},"mouse":{"file":"mouse.svg","viewBox":[0,0,240,200],"category":"hardware","labelArea":null,"anchors":{"left-click":[104,62],"right-click":[138,62],"wheel":[120,58],"center":[120,104]},"stateFamily":"mouse","groups":["body","buttons"],"strokePaths":null},"mouse-pointer":{"file":"mouse-pointer.svg","viewBox":[0,0,96,128],"category":"interaction","labelArea":null,"anchors":{"tip":[12,10]},"stateFamily":"mouse-pointer","groups":["body"],"strokePaths":null}};

export const interactionAssetIds = Object.freeze(Object.keys(registry));
export function getInteractionAsset(id) {
  if (!Object.hasOwn(registry, id)) throw new Error(`Unknown workspace interaction asset: ${id}`);
  return structuredClone(registry[id]);
}
export function interactionAssetPath(id) {
  return `stickers/workspace-svg/${getInteractionAsset(id).file}`;
}
export function placeInteractionAtAnchor({asset, anchor = 'tip', at, width, rotation = 0, scale = 1, scribble = false}) {
  if (scribble !== false) throw new Error('Workspace interactions forbid scribble');
  if (!Array.isArray(at) || at.length !== 2 || ![...at, width, rotation, scale].every(Number.isFinite) || width <= 0 || scale <= 0 || scale > 4)
    throw new Error('Invalid workspace placement');
  const meta = getInteractionAsset(asset);
  if (!Object.hasOwn(meta.anchors, anchor)) throw new Error(`Unknown anchor: ${asset}.${anchor}`);
  const [ax, ay] = meta.anchors[anchor], s = width / meta.viewBox[2] * scale, r = rotation * Math.PI / 180;
  return {asset, x: at[0] - s * (ax * Math.cos(r) - ay * Math.sin(r)),
    y: at[1] - s * (ax * Math.sin(r) + ay * Math.cos(r)),
    width, height: width * meta.viewBox[3] / meta.viewBox[2], scale, rotation, scribble: false};
}
