import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {diagramState, validateDiagram, type DiagramSpec} from './diagram-spec';
import {MotionCanvasDiagram} from './MotionCanvasDiagram';
export const DiagramRenderer: React.FC<{spec: DiagramSpec; durationInFrames: number; framesPath?: string | null}> = ({spec: input, durationInFrames, framesPath}) => {
  const frame = useCurrentFrame();
  const spec = validateDiagram(input);
  if (spec.renderer === 'motion-canvas') {
    if (!framesPath) return <MotionCanvasDiagram spec={spec} progress={frame / Math.max(1, durationInFrames - 1)} />;
    return <Img src={staticFile(`${framesPath}/${String(frame).padStart(6, '0')}.png`)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />;
  }
  return <svg viewBox="0 0 800 560" width="100%" height="100%" role="img" aria-label={spec.description}>
    {diagramState(spec, frame / Math.max(1, durationInFrames - 1)).map((node) => {
      const fill = node.fill === 'white' ? '#fff' : node.fill === 'gray' ? '#858585' : 'none';
      return <g key={node.id} transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`} opacity={node.opacity}>
        {node.shape === 'rect' && <rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} fill={fill} stroke="#fff" strokeWidth={3} />}
        {node.shape === 'circle' && <ellipse rx={node.width / 2} ry={node.height / 2} fill={fill} stroke="#fff" strokeWidth={3} />}
        {node.shape === 'line' && <line x1={-node.width / 2} x2={node.width / 2} y1={0} y2={0} stroke="#fff" strokeWidth={3} />}
        {node.label && <text textAnchor="middle" dominantBaseline="central" fill={node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'} fontFamily="Pretendard, sans-serif" fontSize={28} fontWeight={800}>{node.label}</text>}
      </g>;
    })}
  </svg>;
};
