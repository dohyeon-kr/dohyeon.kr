import React, {useMemo} from 'react';
import dagre from '@dagrejs/dagre';
import {Background, MarkerType, ReactFlow, type Edge, type Node} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Bookmark,
  Compass,
  Funnel,
  Hourglass,
  ListOrdered,
  Maximize2,
  Network,
  RefreshCw,
  Scale,
  Search,
  Target,
  TrendingUp,
  TriangleAlert,
  Waypoints,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import {interpolate, useCurrentFrame} from 'remotion';
import type {SceneCamera, SceneVisual} from '../types';

const WHITE = '#ffffff';
const BLACK = '#050505';
const GRAY = '#858585';
const GRID = '#292929';

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const graphPreset = (motif: string) => {
  switch (motif) {
    case 'depth-vs-breadth':
      return {
        direction: 'LR' as const,
        nodes: [
          ['a', '한 개념'], ['b', '원리'], ['c', '구현'], ['d', '운영체제'],
          ['e', '구조'], ['f', '연결'], ['g', '맥락'],
        ] as Array<[string, string]>,
        edges: [
          ['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'e'], ['e', 'f'], ['f', 'g'],
        ] as Array<[string, string]>,
      };
    case 'funnel':
      return {
        direction: 'TB' as const,
        nodes: [
          ['a', '입력 A'], ['b', '입력 B'], ['c', '입력 C'], ['d', '병목'], ['e', '출력'],
        ] as Array<[string, string]>,
        edges: [['a', 'd'], ['b', 'd'], ['c', 'd'], ['d', 'e']] as Array<[string, string]>,
      };
    case 'flow':
    case 'feedback-loop':
      return {
        direction: 'LR' as const,
        nodes: [['a', '관찰'], ['b', '판단'], ['c', '실행'], ['d', '피드백']] as Array<[string, string]>,
        edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']] as Array<[string, string]>,
      };
    case 'network':
    case 'map-network':
    default:
      return {
        direction: 'LR' as const,
        nodes: [
          ['a', '개념'], ['b', '구조'], ['c', '맥락'], ['d', '원리'], ['e', '응용'], ['f', '판단'],
        ] as Array<[string, string]>,
        edges: [
          ['a', 'b'], ['a', 'd'], ['b', 'c'], ['b', 'e'], ['d', 'e'], ['c', 'f'], ['e', 'f'],
        ] as Array<[string, string]>,
      };
  }
};

const layoutGraph = (
  rawNodes: Array<[string, string]>,
  rawEdges: Array<[string, string]>,
  direction: 'LR' | 'TB',
) => {
  const nodeWidth = 174;
  const nodeHeight = 82;
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({rankdir: direction, ranksep: direction === 'LR' ? 72 : 56, nodesep: 42, marginx: 10, marginy: 10});
  rawNodes.forEach(([id]) => graph.setNode(id, {width: nodeWidth, height: nodeHeight}));
  rawEdges.forEach(([source, target]) => graph.setEdge(source, target));
  dagre.layout(graph);

  const nodes: Node[] = rawNodes.map(([id, label], index) => {
    const pos = graph.node(id);
    return {
      id,
      data: {label},
      position: {x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2},
      style: {
        width: nodeWidth,
        height: nodeHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${WHITE}`,
        borderRadius: 0,
        background: index === 1 ? WHITE : BLACK,
        color: index === 1 ? BLACK : WHITE,
        fontFamily: 'Pretendard, Arial, sans-serif',
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: '-0.04em',
      },
      draggable: false,
      selectable: false,
    };
  });

  const edges: Edge[] = rawEdges.map(([source, target], index) => ({
    id: `${source}-${target}-${index}`,
    source,
    target,
    markerEnd: {type: MarkerType.ArrowClosed, color: WHITE, width: 16, height: 16},
    style: {stroke: WHITE, strokeWidth: 2.5},
    type: 'smoothstep',
  }));

  return {nodes, edges};
};

const FlowPreset: React.FC<{motif: string; progress: number}> = ({motif, progress}) => {
  const preset = graphPreset(motif);
  const {nodes, edges} = useMemo(() => layoutGraph(preset.nodes, preset.edges, preset.direction), [motif]);
  const stagedNodes = nodes.map((node, index) => {
    const start = index / Math.max(1, nodes.length + 1);
    const opacity = interpolate(progress, [start, Math.min(1, start + 0.2)], [0, 1], clamp);
    return {...node, style: {...node.style, opacity, transform: `scale(${0.94 + opacity * 0.06})`}};
  });
  const stagedEdges = edges.map((edge, index) => {
    const start = (index + 1) / Math.max(1, edges.length + 2);
    const opacity = interpolate(progress, [start, Math.min(1, start + 0.22)], [0, 1], clamp);
    return {...edge, style: {...edge.style, opacity, strokeDasharray: '8 10', strokeDashoffset: (1 - progress) * 36}};
  });

  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK}}>
      <ReactFlow
        nodes={stagedNodes}
        edges={stagedEdges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        preventScrolling={false}
        fitView
        fitViewOptions={{padding: 0.2, minZoom: 0.45, maxZoom: 1.15}}
        proOptions={{hideAttribution: true}}
      >
        <Background color={GRID} gap={28} size={1} />
      </ReactFlow>
    </div>
  );
};

const ChartPreset: React.FC<{visual: SceneVisual; progress: number}> = ({visual, progress}) => {
  const full = [
    {x: 0, y: 5}, {x: 1, y: 22}, {x: 2, y: 45}, {x: 3, y: 67},
    {x: 4, y: 80}, {x: 5, y: 88}, {x: 6, y: 93}, {x: 7, y: 96},
  ];
  const visibleCount = Math.max(2, Math.ceil(progress * full.length));
  const data = full.slice(0, visibleCount);
  const last = data[data.length - 1];
  const dotOpacity = interpolate(progress, [0.76, 0.92], [0, 1], clamp);

  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK, padding: '34px 26px 20px'}}>
      <div style={{height: '88%'}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{top: 24, right: 30, left: -8, bottom: 18}}>
            <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 8" />
            <XAxis dataKey="x" axisLine={{stroke: WHITE, strokeWidth: 2}} tickLine={false} tick={{fill: GRAY, fontSize: 18, fontWeight: 700}} />
            <YAxis axisLine={{stroke: WHITE, strokeWidth: 2}} tickLine={false} tick={{fill: GRAY, fontSize: 18, fontWeight: 700}} domain={[0, 100]} />
            <Line type="monotone" dataKey="y" stroke={WHITE} strokeWidth={7} dot={false} isAnimationActive={false} />
            <ReferenceDot x={last.x} y={last.y} r={8} fill={WHITE} stroke={BLACK} strokeWidth={3} opacity={dotOpacity} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: GRAY, letterSpacing: '-0.02em'}}>
        <span>{visual.xLabel ?? '투입 시간'}</span>
        <span>{visual.yLabel ?? '효용'}</span>
      </div>
    </div>
  );
};

const LeveragePreset: React.FC<{progress: number}> = ({progress}) => {
  const action = interpolate(progress, [0.22, 0.78], [0, 1], clamp);
  const angle = interpolate(action, [0, 1], [0, -8], clamp);
  const effortY = interpolate(action, [0, 1], [0, 48], clamp);
  const loadY = interpolate(action, [0, 1], [0, -58], clamp);
  const labelOpacity = interpolate(progress, [0.55, 0.82], [0, 1], clamp);

  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: '50%', top: 268, width: 0, height: 0, borderLeft: '44px solid transparent', borderRight: '44px solid transparent', borderBottom: `78px solid ${WHITE}`, transform: 'translateX(-50%)'}} />
      <div style={{position: 'absolute', left: '50%', top: 286, width: 0, height: 0, borderLeft: '31px solid transparent', borderRight: '31px solid transparent', borderBottom: `55px solid ${BLACK}`, transform: 'translateX(-50%)'}} />
      <div style={{position: 'absolute', left: '50%', top: 246, width: 650, height: 14, background: WHITE, transformOrigin: '50% 50%', transform: `translateX(-50%) rotate(${angle}deg)`}} />

      <div style={{position: 'absolute', left: 95, top: 150 + effortY, opacity: progress}}>
        <div style={{fontSize: 18, fontWeight: 900, color: GRAY, marginBottom: 10}}>작은 힘</div>
        <div style={{width: 74, height: 74, border: `4px solid ${WHITE}`, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 900}}>1</div>
        <div style={{width: 4, height: 62, margin: '10px auto 0', background: WHITE}} />
        <div style={{width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: `18px solid ${WHITE}`, margin: '0 auto'}} />
      </div>

      <div style={{position: 'absolute', right: 76, top: 152 + loadY, opacity: progress}}>
        <div style={{fontSize: 18, fontWeight: 900, color: GRAY, marginBottom: 10, textAlign: 'right'}}>큰 결과</div>
        <div style={{width: 142, height: 142, background: WHITE, color: BLACK, display: 'grid', placeItems: 'center', fontSize: 46, fontWeight: 900}}>10</div>
      </div>

      <div style={{position: 'absolute', left: 28, right: 28, bottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: labelOpacity, fontSize: 21, fontWeight: 900, letterSpacing: '-0.03em'}}>
        <span style={{color: GRAY}}>같은 노력보다</span>
        <span>구조가 결과를 키운다</span>
      </div>
    </div>
  );
};

const iconForMotif = (motif: string) => {
  switch (motif) {
    case 'target': return Target;
    case 'balance-scale': return Scale;
    case 'magnifier': return Search;
    case 'compass':
    case 'arrow-path': return Compass;
    case 'bookmark-stack': return Bookmark;
    case 'funnel': return Funnel;
    case 'ranked-list': return ListOrdered;
    case 'ladder': return TrendingUp;
    case 'warning': return TriangleAlert;
    case 'hourglass': return Hourglass;
    case 'feedback-loop': return RefreshCw;
    case 'network':
    case 'map-network': return Network;
    case 'fork-road': return Waypoints;
    default: return Maximize2;
  }
};

const MetaphorPreset: React.FC<{motif: string; progress: number}> = ({motif, progress}) => {
  const Icon = iconForMotif(motif);
  const scale = interpolate(progress, [0, 1], [0.72, 1], clamp);
  const line = interpolate(progress, [0.15, 0.75], [0, 1], clamp);
  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon size={300} strokeWidth={1.45} color={WHITE} style={{opacity: progress, transform: `scale(${scale})`}} />
      </div>
      <div style={{position: 'absolute', left: 28, right: 28, bottom: 30, height: 2, background: GRID}}>
        <div style={{width: `${line * 100}%`, height: '100%', background: WHITE}} />
      </div>
    </div>
  );
};

const flowMotifs = new Set(['network', 'map-network', 'depth-vs-breadth', 'flow', 'feedback-loop', 'funnel']);
const chartMotifs = new Set(['roi-curve', 'growth-curve', 'diminishing-returns']);

const cameraStyle = (camera: SceneCamera | null | undefined, frame: number, durationInFrames: number): React.CSSProperties => {
  if (!camera || camera.motion === 'static') return {};
  const start = Math.max(0, Math.round(durationInFrames * camera.startProgress));
  const end = Math.max(start + 1, Math.round(durationInFrames * camera.endProgress));
  const progress = interpolate(frame, [start, end], [0, 1], clamp);
  const strength = camera.intensity === 'medium' ? 1 : 0.55;
  const targetOrigin = camera.target === 'endpoint' ? '82% 24%' : camera.target === 'inflection' ? '52% 46%' : camera.target === 'detail' ? '60% 42%' : '50% 50%';

  if (camera.motion === 'push-in' || camera.motion === 'zoom') {
    const maxScale = camera.motion === 'zoom' ? 1 + 0.24 * strength : 1 + 0.12 * strength;
    return {transform: `scale(${interpolate(progress, [0, 1], [1, maxScale], clamp)})`, transformOrigin: targetOrigin};
  }
  if (camera.motion === 'pull-out') {
    return {transform: `scale(${interpolate(progress, [0, 1], [1 + 0.12 * strength, 1], clamp)})`, transformOrigin: targetOrigin};
  }
  if (camera.motion === 'pan-left') return {transform: `translateX(${interpolate(progress, [0, 1], [0, -42 * strength], clamp)}px)`};
  if (camera.motion === 'pan-right') return {transform: `translateX(${interpolate(progress, [0, 1], [0, 42 * strength], clamp)}px)`};
  return {};
};

export const PresetVisual: React.FC<{visual: SceneVisual; camera?: SceneCamera | null; durationInFrames?: number}> = ({visual, camera, durationInFrames = 120}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [4, 34], [0, 1], clamp);
  const motif = visual.motif ?? 'generic';
  let content: React.ReactNode;
  if (motif === 'leverage') content = <LeveragePreset progress={progress} />;
  else if (chartMotifs.has(motif)) content = <ChartPreset visual={visual} progress={progress} />;
  else if (flowMotifs.has(motif)) content = <FlowPreset motif={motif} progress={progress} />;
  else content = <MetaphorPreset motif={motif} progress={progress} />;

  return (
    <div style={{width: '100%', height: '100%', overflow: 'hidden'}}>
      <div style={{width: '100%', height: '100%', ...cameraStyle(camera, frame, durationInFrames)}}>{content}</div>
    </div>
  );
};
