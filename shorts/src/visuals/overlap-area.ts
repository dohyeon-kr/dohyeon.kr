export type Point = [number, number];
export type Polygon = Point[];
const EPS = 1e-9;
const cross = (a: Point, b: Point, p: Point) => (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
export function polygonArea(p: Polygon): number {
  return Math.abs(p.reduce((sum, a, i) => {const b=p[(i+1)%p.length]; return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
}
function halfPlane(p: Polygon, a: Point, b: Point, inside: boolean): Polygon {
  const result: Polygon=[];
  for (let i=0;i<p.length;i++) {
    const s=p[i], e=p[(i+1)%p.length], ds=cross(a,b,s), de=cross(a,b,e);
    const keepS=inside ? ds>=0 : ds<=0, keepE=inside ? de>=0 : de<=0;
    if (keepS) result.push(s);
    if (keepS!==keepE) {const t=ds/(ds-de); result.push([s[0]+t*(e[0]-s[0]),s[1]+t*(e[1]-s[1])]);}
  }
  return result;
}
// Subtract a convex CCW cover into disjoint convex fragments. Repeated
// subtraction measures the union, so several stickers cannot double-count area.
function subtract(subject: Polygon, cover: Polygon): Polygon[] {
  let remaining=subject;
  const outside: Polygon[]=[];
  for (let i=0;i<cover.length && remaining.length>=3;i++) {
    const a=cover[i], b=cover[(i+1)%cover.length];
    const part=halfPlane(remaining,a,b,false);
    if (polygonArea(part)>EPS) outside.push(part);
    remaining=halfPlane(remaining,a,b,true);
  }
  return outside;
}
/** Fraction of the subject footprint intersecting ANY cover, not IoU.
 * Inputs are convex counter-clockwise polygons in the same coordinate space. */
export function coveredFraction(subject: Polygon, covers: Polygon[]): number {
  const area=polygonArea(subject);
  if (area<=EPS) throw new Error('[layout:sticker-area] sticker has no measurable area');
  let fragments=[subject];
  for (const cover of covers) {
    fragments=fragments.flatMap(fragment=>subtract(fragment,cover));
    if (!fragments.length) return 1;
  }
  return Math.max(0,Math.min(1,1-fragments.reduce((sum,p)=>sum+polygonArea(p),0)/area));
}
