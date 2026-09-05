import React, {useMemo} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {validateDiagram, type DiagramSpec} from './diagram-spec';
import {evaluatedDiagramState, selectDiagramEngine} from './physics';
import {MotionCanvasDiagram} from './MotionCanvasDiagram';
import {linePoints, nodeLabel} from './node-layout';
type Engine = 'remotion' | 'motion-canvas';
type Props = {spec: DiagramSpec; durationInFrames: number; framesPath?: string | null; strict?: boolean; failEngine?: Engine};
class EngineBoundary extends React.Component<{engine: Engine; strict: boolean; children: (engine: Engine) => React.ReactNode}, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) {return {error};}
  componentDidCatch(error: Error) {
    console.warn(`[diagram] ${this.props.engine} failed; using alternate backend: ${error.message}`);
  }
  render() {
    if (this.state.error && this.props.strict) throw this.state.error;
    const engine = this.state.error ? (this.props.engine === 'remotion' ? 'motion-canvas' : 'remotion') : this.props.engine;
    // An error in the fallback escapes this boundary; never retry in a loop.
    return this.props.children(engine);
  }
}
export const DiagramRenderer: React.FC<Props> = ({spec: input, strict = false, failEngine, ...rest}) => {
  const spec = useMemo(() => validateDiagram(input), [input]);
  const engine = selectDiagramEngine(spec);
  return <><style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;}`}</style><EngineBoundary key={JSON.stringify(spec)} engine={engine} strict={strict}>
    {(selected) => <EngineSurface {...rest} spec={spec} engine={selected} failEngine={failEngine} />}
  </EngineBoundary></>;
};
const EngineSurface: React.FC<Props & {engine: Engine}> = ({spec, durationInFrames, framesPath, engine, failEngine}) => {
  const frame = useCurrentFrame();
  if (engine === failEngine && engine === 'remotion') throw new Error(`Injected ${engine} failure for CI`);
  if (engine === 'motion-canvas') {
    if (!framesPath) return <MotionCanvasDiagram spec={spec} progress={frame / Math.max(1, durationInFrames - 1)} failAsync={failEngine === 'motion-canvas'} />;
    return <Img src={staticFile(`${framesPath}/${String(frame).padStart(6, '0')}.png`)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />;
  }
  return <svg viewBox="0 0 800 560" width="100%" height="100%" role="img" aria-label={spec.description}>
    {evaluatedDiagramState(spec, frame / Math.max(1, durationInFrames - 1)).map((node) => {
      const fill = node.fill === 'white' ? '#fff' : node.fill === 'gray' ? '#858585' : 'none';
      const points = linePoints(node);
      const label = nodeLabel(node);
      const lines = label.text.split('\n');
      return <g key={node.id} transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`} opacity={node.opacity}>
        {node.shape === 'rect' && <rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} fill={fill} stroke="#fff" strokeWidth={3} />}
        {node.shape === 'circle' && <ellipse rx={node.width / 2} ry={node.height / 2} fill={fill} stroke="#fff" strokeWidth={3} />}
        {node.shape === 'line' && <line x1={points[0][0]} x2={points[1][0]} y1={points[0][1]} y2={points[1][1]} stroke="#fff" strokeWidth={3} />}
        {node.label && <text textAnchor="middle" dominantBaseline="central" fill={node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'} fontFamily="Pretendard, sans-serif" fontSize={label.fontSize} fontWeight={800}>{lines.map((text, i) => <tspan key={i} x={0} y={label.y + (i - (lines.length - 1) / 2) * label.fontSize * 1.12}>{text}</tspan>)}</text>}
      </g>;
    })}
  </svg>;
};
