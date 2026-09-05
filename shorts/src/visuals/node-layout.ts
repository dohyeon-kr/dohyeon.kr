import {fitCopy} from '../text-layout.ts';
import type {DiagramSpec} from './diagram-spec';
type Node = DiagramSpec['nodes'][number];
export function linePoints(node: Node): [[number, number], [number, number]] {
  return node.height > node.width ? [[0, -node.height / 2], [0, node.height / 2]] : [[-node.width / 2, 0], [node.width / 2, 0]];
}
export function nodeLabel(node: Node) {
  const line = node.shape === 'line';
  const fitted = fitCopy(node.label, line ? Math.max(140, node.width) : node.width * (node.shape === 'circle' ? .72 : .88), line ? 60 : node.height * .75, 28);
  return {...fitted, y: line ? -26 : 0};
}
