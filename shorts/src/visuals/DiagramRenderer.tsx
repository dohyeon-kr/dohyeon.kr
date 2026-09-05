import React, {useMemo, useId} from 'react';
import {staticFile, useCurrentFrame} from 'remotion';
import {validateDiagram, type DiagramSpec} from './diagram-spec';
import {evaluatedDiagramState, selectDiagramEngine} from './physics';
import {MotionCanvasDiagram} from './MotionCanvasDiagram';
import {linePoints, nodeLabel, LABEL_LINE_HEIGHT} from './node-layout';
import {LightEffects, FlowGlow} from '../motion/LightEffects';
import {effectState, type LightEffect} from '../motion/schema';
import {useVideoConfig} from 'remotion';
type Engine = 'remotion' | 'motion-canvas';
type Props = {effects?: LightEffect[] | null; layer?: 'geometry' | 'labels' | 'all'; spec: DiagramSpec; durationInFrames: number; framesPath?: string | null; strict?: boolean; failEngine?: Engine};
class EngineBoundary extends React.Component<{engine: Engine; strict: boolean; children: (engine: Engine) => React.ReactNode}, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) {return {error};}
  componentDidCatch(error: Error) {
    console.warn(`[diagram] ${this.props.engine} failed; using alternate backend: ${error.message}`);
  }
  render() {
    if (this.state.error?.message.startsWith('[layout:')) throw this.state.error;
    if (this.state.error && this.props.strict) throw this.state.error;
    const engine = this.state.error ? (this.props.engine === 'remotion' ? 'motion-canvas' : 'remotion') : this.props.engine;
    // An error in the fallback escapes this boundary; never retry in a loop.
    return this.props.children(engine);
  }
}
export const DiagramRenderer: React.FC<Props> = ({spec: input, strict = false, failEngine, ...rest}) => {
  const spec = useMemo(() => validateDiagram(input), [input]);
  const engine = selectDiagramEngine(spec);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const states = evaluatedDiagramState(spec, frame / Math.max(1, rest.durationInFrames - 1));
  const layer = rest.layer ?? 'all';
  const geometrySpec = useMemo(() => ({...spec, nodes: spec.nodes.map(node => ({...node, label: ''}))}), [spec]);
  return <div style={{position: 'relative', width: '100%', height: '100%'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;}`}</style>
    {layer !== 'labels' && <>
      <EngineBoundary key={JSON.stringify(spec)} engine={engine} strict={strict}>
        {(selected) => <EngineSurface {...rest} spec={geometrySpec} engine={selected} failEngine={failEngine} />}
      </EngineBoundary>
      {(rest.effects ?? []).filter(e => e.type !== 'flow-glow' && effectState(e, frame, fps).opacity > 0).map((effect, i) => {
        const node = states.find(n => n.id === effect.target);
        if (!node) return null;
        return <LightEffects key={i} effects={[effect]} bounds={{x: node.x - node.width / 2, y: node.y - node.height / 2, width: node.width, height: node.height}}><svg viewBox="0 0 800 560" width="100%" height="100%" style={{overflow: 'visible'}}><g transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`} opacity={node.opacity}><NodeShape node={effect.type === 'rim-light' ? {...node, fill: 'none', strokeStyle: 'solid'} : node} /></g></svg></LightEffects>;
      })}
      <svg viewBox="0 0 800 560" width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {(rest.effects ?? []).filter(e => e.type === 'flow-glow').map((effect, i) => {
          const node = states.find(n => n.id === effect.target);
          if (!node) return null;
          const points = node.shape === 'line' ? linePoints(node) : [[0, 0], [0, 0]] as [number, number][];
          return <g key={i} transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`}><FlowGlow effect={effect} points={points} opacity={node.opacity} /></g>;
        })}
      </svg>
    </>}
    {layer !== 'geometry' && <svg viewBox="0 0 800 560" width="100%" height="100%" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      {states.filter(node => node.label).map(node => {
        const label = nodeLabel(node); const lines = label.text.split('\n');
        return <g key={node.id} transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`} opacity={node.opacity}>{node.fill === 'hatch' && <rect x={-node.width * .4} y={label.y - lines.length * label.fontSize * LABEL_LINE_HEIGHT / 2 - 4} width={node.width * .8} height={lines.length * label.fontSize * LABEL_LINE_HEIGHT + 8} fill="#050505" />}<text textAnchor="middle" dominantBaseline="central" fill={node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'} fontFamily="Pretendard, sans-serif" fontSize={label.fontSize} fontWeight={800}>{lines.map((text, i) => <tspan key={i} x={0} y={label.y + (i - (lines.length - 1) / 2) * label.fontSize * LABEL_LINE_HEIGHT}>{text}</tspan>)}</text></g>;
      })}
    </svg>}
  </div>;
};
const NodeShape: React.FC<{node: ReturnType<typeof evaluatedDiagramState>[number]}> = ({node}) => {
  const id = `node-hatch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = node.fill === 'white' ? '#fff' : node.fill === 'none' ? 'none' : node.fill === 'hatch' ? `url(#${id})` : '#303030';
  const props = {fill, stroke: '#fff', strokeWidth: 3, strokeDasharray: node.strokeStyle === 'dashed' ? '12 10' : undefined};
  const hatch = <defs><pattern id={id} width={16} height={16} patternUnits="userSpaceOnUse"><path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke="#858585" strokeWidth={2} /></pattern></defs>;
  if (node.shape === 'circle') return <>{hatch}<ellipse rx={node.width / 2} ry={node.height / 2} {...props} /></>;
  if (node.shape === 'rect') return <>{hatch}<rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} {...props} /></>;
  const points = linePoints(node);
  return node.shape === 'line' ? <line x1={points[0][0]} y1={points[0][1]} x2={points[1][0]} y2={points[1][1]} {...props} /> : null;
};

const EngineSurface: React.FC<Props & {engine: Engine}> = ({spec, durationInFrames, framesPath, engine, failEngine, layer}) => {
  const frame = useCurrentFrame();
  const hatchId = useId().replace(/:/g, '');
  if (engine === failEngine && engine === 'remotion') throw new Error(`Injected ${engine} failure for CI`);
  if (engine === 'motion-canvas') {
    // Legacy cached PNGs include labels. Re-evaluate geometry so labels remain crisp
    // and effects cannot be baked twice when composited by the shared SVG layer.
    return <MotionCanvasDiagram spec={spec} progress={frame / Math.max(1, durationInFrames - 1)} failAsync={failEngine === 'motion-canvas'} />;
  }
  return <svg viewBox="0 0 800 560" width="100%" height="100%" role="img" aria-label={spec.description}>
    <defs><pattern id={hatchId} width={16} height={16} patternUnits="userSpaceOnUse"><path d="M-4 4L4 -4M0 16L16 0M12 20L20 12" stroke="#858585" strokeWidth={2} /></pattern></defs>
    {evaluatedDiagramState(spec, frame / Math.max(1, durationInFrames - 1)).map((node) => {
      const fill = node.fill === 'white' ? '#fff' : node.fill === 'gray' ? '#303030' : node.fill === 'hatch' ? `url(#${hatchId})` : 'none';
      const points = linePoints(node);
      const label = nodeLabel(node);
      const lines = label.text.split('\n');
      return <g key={node.id} transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`} opacity={node.opacity}>
        {node.shape === 'rect' && <rect x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height} fill={fill} stroke="#fff" strokeWidth={3} strokeDasharray={node.strokeStyle === 'dashed' ? '12 10' : undefined} />}
        {node.shape === 'circle' && <ellipse rx={node.width / 2} ry={node.height / 2} fill={fill} stroke="#fff" strokeWidth={3} strokeDasharray={node.strokeStyle === 'dashed' ? '12 10' : undefined} />}
        {node.shape === 'line' && <line x1={points[0][0]} x2={points[1][0]} y1={points[0][1]} y2={points[1][1]} stroke="#fff" strokeWidth={3} strokeDasharray={node.strokeStyle === 'dashed' ? '12 10' : undefined} />}
        {node.label && <text textAnchor="middle" dominantBaseline="central" fill={node.shape !== 'text' && node.fill === 'white' ? '#050505' : '#fff'} fontFamily="Pretendard, sans-serif" fontSize={label.fontSize} fontWeight={800}>{lines.map((text, i) => <tspan key={i} x={0} y={label.y + (i - (lines.length - 1) / 2) * label.fontSize * LABEL_LINE_HEIGHT}>{text}</tspan>)}</text>}
      </g>;
    })}
  </svg>;
};

