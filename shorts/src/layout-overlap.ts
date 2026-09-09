export type Bounds = {left: number; right: number; top: number; bottom: number};
export const HEADLINE_OVERLAP_LIMIT = 0.05;

/** Union of clipped rectangles: stacked assets never count twice. */
export function coveredRatio(target: Bounds, obstacles: Bounds[]): number {
  const area = (target.right-target.left)*(target.bottom-target.top);
  if (area <= 0) return 0;
  const clips = obstacles.map(b => ({left:Math.max(target.left,b.left),right:Math.min(target.right,b.right),top:Math.max(target.top,b.top),bottom:Math.min(target.bottom,b.bottom)})).filter(b => b.right>b.left && b.bottom>b.top);
  const xs = [...new Set(clips.flatMap(b => [b.left,b.right]))].sort((a,b)=>a-b);
  let covered=0;
  for(let i=1;i<xs.length;i++){
    const intervals=clips.filter(b=>b.left<xs[i] && b.right>xs[i-1]).sort((a,b)=>a.top-b.top);
    let end=-Infinity,height=0;
    for(const b of intervals){height+=Math.max(0,b.bottom-Math.max(end,b.top));end=Math.max(end,b.bottom);}
    covered+=(xs[i]-xs[i-1])*height;
  }
  return covered/area;
}
