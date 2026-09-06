type BlobLike = {
  width: number;
  height: number;
  noiseAmount: number;
  blob?: {seed: number; amount: number; points: number; frequency: number} | null;
};
export type BlobPoint = [number, number];
const phase = (seed: number, salt: number) => {
  const x = Math.sin((seed + 1) * (12.9898 + salt * 7.233)) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
};
export function organicBlobPoints(node: BlobLike): BlobPoint[] {
  const cfg = node.blob;
  if (!cfg) return [];
  const amount = Math.max(0, Math.min(.45, node.noiseAmount));
  const p1 = phase(cfg.seed, 1), p2 = phase(cfg.seed, 2), p3 = phase(cfg.seed, 3);
  return Array.from({length: cfg.points}, (_, i) => {
    const a = i / cfg.points * Math.PI * 2;
    const wave = .56 * Math.sin(cfg.frequency * a + p1)
      + .29 * Math.sin((cfg.frequency + 1.7) * a + p2)
      + .15 * Math.sin((cfg.frequency * 2.1 + .5) * a + p3);
    const radius = Math.max(.55, 1 + amount * wave);
    return [Math.cos(a) * node.width / 2 * radius, Math.sin(a) * node.height / 2 * radius];
  });
}
export function organicBlobPath(node: BlobLike) {
  const points = organicBlobPoints(node);
  if (!points.length) return '';
  const n = points.length;
  const p = (i: number) => points[(i + n) % n];
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    const c1: BlobPoint = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: BlobPoint = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
}
