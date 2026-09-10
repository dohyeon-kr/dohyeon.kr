import {textUnits} from '../text-layout.ts';
import {nodeLabel, LABEL_LINE_HEIGHT} from './node-layout.ts';
import type {DiagramSpec} from './diagram-spec.ts';

type State = DiagramSpec['nodes'][number] & {rotation: number; scale: number; opacity: number; noiseAmount: number};
type Point = [number, number];
type Polygon = Point[];
export type LayoutIssue = {rule: string; ids: string[]; detail: string; progress: number};
const INSET = 40;
const EPS = 1e-6;
const STROKE_HALF = 1.5;
const transform = (n: State, [x, y]: Point): Point => {
  const a = n.rotation * Math.PI / 180;
  return [n.x + n.scale * (x * Math.cos(a) - y * Math.sin(a)), n.y + n.scale * (x * Math.sin(a) + y * Math.cos(a))];
};
const box = (n: State, width: number, height: number, y = 0): Polygon =>
  ([[-width / 2, y - height / 2], [width / 2, y - height / 2], [width / 2, y + height / 2], [-width / 2, y + height / 2]] as Point[]).map(p => transform(n, p));
// Separating-axis test handles rotated rectangles and line stroke envelopes.
export function polygonsOverlap(a: Polygon, b: Polygon) {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const axis = [p[1] - q[1], q[0] - p[0]];
    const project = (points: Polygon) => points.map(v => v[0] * axis[0] + v[1] * axis[1]);
    const pa = project(a), pb = project(b);
    if (Math.max(...pa) <= Math.min(...pb) + EPS || Math.max(...pb) <= Math.min(...pa) + EPS) return false;
  }
  return true;
}
const strokeBox = (n: State) => n.height > n.width ? box(n, 3, n.height) : box(n, n.width, 3);
const labelMetrics = (n: State, protection = 0) => {
  const label = nodeLabel(n), lines = label.text.split('\n');
  return {
    width: Math.max(...lines.map(textUnits)) * label.fontSize + protection * label.fontSize * 2,
    height: lines.length * label.fontSize * LABEL_LINE_HEIGHT + protection * label.fontSize * 2,
    y: label.y,
  };
};
const labelBox = (n: State, protection = 0) => {
  const label = labelMetrics(n, protection);
  return box(n, label.width, label.height, label.y);
};
const checkInset = (polygon: Polygon) => polygon.every(([x, y]) => x >= INSET - EPS && x <= 800 - INSET + EPS && y >= INSET - EPS && y <= 560 - INSET + EPS);
const formatIssue = (issue: LayoutIssue) => `[layout:${issue.rule}] t=${issue.progress.toFixed(6)} nodes=${issue.ids.join(',')}: ${issue.detail}`;

/** Deterministic conservative geometry, not a claim of measured font ink bounds.
 * Shape/shape overlaps are legal for territories and physical metaphors.
 * Text protection and line/text intersections are never silently exempted.
 */
export function collectDiagramLayoutIssues(states: State[], progress: number): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const fail = (rule: string, ids: string[], detail: string) => issues.push({rule, ids, detail, progress});
  const visible = states.filter(n => n.opacity > 0);
  for (const n of visible) {
    if (![n.x, n.y, n.width, n.height, n.rotation, n.scale, n.opacity].every(Number.isFinite)) {
      fail('finite', [n.id], 'non-finite geometry');
      continue;
    }
    const region = n.shape === 'line' ? strokeBox(n) : box(n, n.width + (n.shape === 'text' ? 0 : 3), n.height + (n.shape === 'text' ? 0 : 3));
    if (!checkInset(region)) fail('safe-area', [n.id], 'visible geometry must stay inside the 40-unit inset');
    if (n.shape === 'line' && Math.max(n.width, n.height) * n.scale < 6) fail('line-dot', [n.id], 'visible line is shorter than two stroke widths; reveal with opacity at full length');
    if (n.label) {
      if (nodeLabel(n).fontSize * n.scale < 24 - EPS) fail('text-size', [n.id], 'transformed label is smaller than 24 units');
      if (!checkInset(labelBox(n))) fail('text-safe-area', [n.id], 'label leaves the safe area');
      if (n.shape === 'line' && polygonsOverlap(strokeBox(n), labelBox(n, .25))) fail('line-label', [n.id], 'line crosses its own label protection region');
    }
  }
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const a = visible[i], b = visible[j];
    if (a.label && b.label && polygonsOverlap(labelBox(a, .25), labelBox(b, .25))) fail('text-overlap', [a.id, b.id], 'label protection regions overlap');
    for (const [line, object] of [[a, b], [b, a]] as const) {
      if (line.shape === 'line' && ['rect', 'circle', 'blob'].includes(object.shape) && ['white', 'gray'].includes(object.fill)
        && polygonsOverlap(strokeBox(line), box(object, object.width, object.height))) fail('line-object', [line.id, object.id], 'line crosses a filled object; change anchors or layout');
    }
    for (const [label, other] of [[a, b], [b, a]] as const) {
      if (!label.label || other.shape === 'text') continue;
      if (other.shape === 'line') {
        if (polygonsOverlap(labelBox(label, .25), strokeBox(other))) fail('line-text', [other.id, label.id], 'line enters label protection region');
      } else if (other.fill === 'white' || other.fill === 'gray') {
        if (polygonsOverlap(labelBox(label), box(other, other.width, other.height))) fail('text-object', [label.id, other.id], 'another filled object covers label space');
      }
    }
  }
  return issues;
}

export function assertDiagramLayout(states: State[], progress: number) {
  const issues = collectDiagramLayoutIssues(states, progress);
  if (issues.length) throw new Error(issues.map(formatIssue).join('\n'));
}

export function layoutSampleTimes(spec: DiagramSpec) {
  const times = new Set(Array.from({length: 101}, (_, i) => i / 100));
  for (const event of spec.events) for (const t of [event.start - 1e-6, event.start, event.start + 1e-6, (event.start + event.end) / 2, event.end - 1e-6, event.end, event.end + 1e-6]) times.add(Math.max(0, Math.min(1, t)));
  return [...times].sort((a, b) => a - b);
}

export function resolveConnectors(states: State[]): State[] {
  return states.map(n => {
    if (!n.connector) return n;
    const c = n.connector;
    const source = states.find(v => v.id === c.source)!;
    const target = states.find(v => v.id === c.target)!;
    const anchor = (v: State, side: string): Point => {
      const gap = c.gap / v.scale;
      let left = -v.width / 2;
      let right = v.width / 2;
      let top = -v.height / 2;
      let bottom = v.height / 2;
      if (v.label) {
        const label = labelMetrics(v, .25);
        left = Math.min(left, -label.width / 2);
        right = Math.max(right, label.width / 2);
        top = Math.min(top, label.y - label.height / 2);
        bottom = Math.max(bottom, label.y + label.height / 2);
      }
      // Connector stroke itself must also remain outside the protected region.
      if (side === 'left') return transform(v, [left - gap - STROKE_HALF / v.scale, 0]);
      if (side === 'right') return transform(v, [right + gap + STROKE_HALF / v.scale, 0]);
      if (side === 'top') return transform(v, [0, top - gap - STROKE_HALF / v.scale]);
      return transform(v, [0, bottom + gap + STROKE_HALF / v.scale]);
    };
    const a = anchor(source, c.sourceSide), b = anchor(target, c.targetSide);
    return {...n, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2,
      width: Math.hypot(b[0] - a[0], b[1] - a[1]), height: 1, scale: 1,
      rotation: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI,
      opacity: Math.min(n.opacity, source.opacity, target.opacity)};
  });
}
