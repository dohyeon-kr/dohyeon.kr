import React, {useMemo} from 'react';
import dagre from '@dagrejs/dagre';
import {
  Background,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Bookmark,
  Compass,
  Funnel,
  Hourglass,
  ListOrdered,
  Maximize2,
  MoveUpRight,
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
import type {SceneVisual} from '../types';

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
          ['a', '한 개념'],
          ['b', '원리'],
          ['c', '구현'],
          ['d', '운영체제'],
          ['e', '구조'],
          ['f', '연결'],
          ['g', '맥락'],
        ],
        edges: [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'd'],
          ['a', 'e'],
          ['e', 'f'],
          ['f', 'g'],
        ],
      };
    case 'funnel':
      return {
        direction: 'TB' as const,
        nodes: [
          ['a', '입력 A'],
          ['b', '입력 B'],
          ['c', '입력 C'],
          ['d', '병목'],
          ['e', '출력'],
        ],
        edges: [
          ['a', 'd'],
          ['b', 'd'],
          ['c', 'd'],
          ['d', 'e'],
        ],
      };
    case 'flow':
    case 'feedback-loop':
      return {
        direction: 'LR' as const,
        nodes: [
          ['a', '관찰'],
          ['b', '판단'],
          ['c', '실행'],
          ['d', '피드백'],
        ],
        edges: [
          ['a', 'b'],
          ['b', 'c'],
          ['c', 'd'],
          ['d', 'a'],
        ],
      };
    case 'network':
    case 'map-network':
    default:
      return {
        direction: 'LR' as const,
        nodes: [
          ['a', '개념'],
          ['b', '구조'],
          ['c', '맥락'],
          ['d', '원리'],
          ['e', '응용'],
          ['f', '판단'],
        ],
        edges: [
          ['a', 'b'],
          ['a', 'd'],
          ['b', 'c'],
          ['b', 'e'],
          ['d', 'e'],
          ['c', 'f'],
          ['e', 'f'],
        ],
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
  graph.setGraph({
    rankdir: direction,
    ranksep: direction === 'LR' ? 72 : 56,
    nodesep: 42,
    marginx: 10,
    marginy: 10,
  });

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
  const {nodes, edges} = useMemo(
    () => layoutGraph(preset.nodes, preset.edges, preset.direction),
    [motif],
  );

  const stagedNodes = nodes.map((node, index) => {
    const start = index / Math.max(1, nodes.length + 1);
    const opacity = interpolate(progress, [start, Math.min(1, start + 0.2)], [0, 1], clamp);
    return {
      ...node,
      style: {
        ...node.style,
        opacity,
        transform: `scale(${0.94 + opacity * 0.06})`,
      },
    };
  });
  const stagedEdges = edges.map((edge, index) => {
    const start = (index + 1) / Math.max(1, edges.length + 2);
    const opacity = interpolate(progress, [start, Math.min(1, start + 0.22)], [0, 1], clamp);
    return {
      ...edge,
      style: {
        ...edge.style,
        opacity,
        strokeDasharray: '8 10',
        strokeDashoffset: (1 - progress) * 36,
      },
    };
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
    {x: 0, y: 5},
    {x: 1, y: 22},
    {x: 2, y: 45},
    {x: 3, y: 67},
    {x: 4, y: 80},
    {x: 5, y: 88},
    {x: 6, y: 93},
    {x: 7, y: 96},
  ];
  const visibleCount = Math.max(2, Math.ceil(progress * full.length));
  const data = full.slice(0, visibleCount);
  const last = data[data.length - 1];

  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK, padding: '34px 26px 20px'}}>
      <div style={{height: '88%'}}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{top: 24, right: 30, left: -8, bottom: 18}}>
            <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 8" />
            <XAxis
              dataKey="x"
              axisLine={{stroke: WHITE, strokeWidth: 2}}
              tickLine={false}
              tick={{fill: GRAY, fontSize: 18, fontWeight: 700}}
            />
            <YAxis
              axisLine={{stroke: WHITE, strokeWidth: 2}}
              tickLine={false}
              tick={{fill: GRAY, fontSize: 18, fontWeight: 700}}
              domain={[0, 100]}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={WHITE}
              strokeWidth={7}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot x={last.x} y={last.y} r={8} fill={WHITE} stroke={BLACK} strokeWidth={3} />
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
    case 'leverage': return MoveUpRight;
    default: return Maximize2;
  }
};

const MetaphorPreset: React.FC<{motif: string; progress: number}> = ({motif, progress}) => {
  const Icon = iconForMotif(motif);
  const scale = interpolate(progress, [0, 1], [0.72, 1], clamp);
  const rotate = motif === 'leverage' ? interpolate(progress, [0, 1], [-12, 0], clamp) : 0;
  const line = interpolate(progress, [0.15, 0.75], [0, 1], clamp);

  return (
    <div style={{width: '100%', height: '100%', border: `2px solid ${WHITE}`, background: BLACK, position: 'relative', overflow: 'hidden'}}>
      <div style={{position: 'absolute', top: 26, left: 28, fontSize: 18, fontWeight: 900, letterSpacing: '0.08em', color: GRAY}}>
        VISUAL / {motif.toUpperCase()}
      </div>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon
          size={300}
          strokeWidth={1.45}
          color={WHITE}
          style={{opacity: progress, transform: `scale(${scale}) rotate(${rotate}deg)`}}
        />
      </div>
      <div style={{position: 'absolute', left: 28, right: 28, bottom: 30, height: 2, background: GRID}}>
        <div style={{width: `${line * 100}%`, height: '100%', background: WHITE}} />
      </div>
    </div>
  );
};

const flowMotifs = new Set(['network', 'map-network', 'depth-vs-breadth', 'flow', 'feedback-loop', 'funnel']);
const chartMotifs = new Set(['roi-curve', 'growth-curve', 'diminishing-returns']);

export const PresetVisual: React.FC<{visual: SceneVisual}> = ({visual}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [4, 28], [0, 1], clamp);
  const motif = visual.motif ?? 'generic';

  if (chartMotifs.has(motif)) return <ChartPreset visual={visual} progress={progress} />;
  if (flowMotifs.has(motif)) return <FlowPreset motif={motif} progress={progress} />;
  return <MetaphorPreset motif={motif} progress={progress} />;
};
