import {fitCopy} from '../text-layout.ts';
import type {DiagramSpec} from './diagram-spec';
type Node = DiagramSpec['nodes'][number];
export function linePoints(node: Node): [[number, number], [number, number]] {
  return node.height > node.width ? [[0, -node.height / 2], [0, node.height / 2]] : [[-node.width / 2, 0], [node.width / 2, 0]];
}
export const LABEL_MIN_SIZE = 24;
export const LABEL_LINE_HEIGHT = 1.5;
export function nodeLabel(node: Node) {
  if (!node.label) return {text: '', fontSize: 36, y: 0};
  const line = node.shape === 'line';
  for (let size = 36; size >= LABEL_MIN_SIZE; size--) {
    // Reserve padding before wrapping, including the inscribed circle region.
    const width = line ? Math.max(140, node.width) : node.width * (node.shape === 'circle' ? Math.SQRT1_2 : 1) - size;
    const height = line ? 100 : node.height * (node.shape === 'circle' ? Math.SQRT1_2 : 1) - size * .7;
    let fitted;
    try { fitted = fitCopy(node.label, width, height, size, LABEL_LINE_HEIGHT); } catch { continue; }
    if (fitted.fontSize === size) return {...fitted, y: line ? -(fitted.text.split('\n').length * size * LABEL_LINE_HEIGHT / 2 + size * .25 + 1.5) : 0};
  }
  throw new Error(`[layout:label-padding] ${node.id}: enlarge the node or shorten the label; minimum ${LABEL_MIN_SIZE}px with 0.5em horizontal / 0.35em vertical padding`);
}
