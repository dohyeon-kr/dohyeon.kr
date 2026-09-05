import React from 'react';
import {Composition} from 'remotion';
import {ShortVideo} from './ShortVideo';
import type {RenderManifest, RenderScene} from './types';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {physicsExample} from './visuals/physics-example';
import type {DiagramSpec} from './visuals/diagram-spec';

const diagramExample: DiagramSpec = {
  version: 1, renderer: 'remotion', description: '입력이 관문 앞에 모이는 개념도',
  nodes: [
    {id: 'gate', shape: 'rect', label: '처리', x: 540, y: 280, width: 110, height: 220, fill: 'none'},
    ...[0, 1, 2, 3, 4, 5].map((i) => ({id: `request-${i}`, shape: 'circle' as const, label: '', x: 80 + i * 20, y: 140 + i * 55, width: 24, height: 24, fill: 'white' as const})),
  ],
  events: [0, 1, 2, 3, 4, 5].flatMap((i) => [
    {target: `request-${i}`, property: 'x' as const, from: 80 + i * 20, to: 450 - i * 38, start: .05 + i * .04, end: .55 + i * .04},
    {target: `request-${i}`, property: 'y' as const, from: 140 + i * 55, to: 280, start: .05 + i * .04, end: .55 + i * .04},
  ]),
};

const scene = (value: Partial<RenderScene> & Pick<RenderScene, 'kind' | 'headline'>): RenderScene => ({
  layout: 'statement-offset',
  transition: 'fade',
  visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
  subline: null,
  narration: '',
  imageQuery: null,
  comparisonLeft: null,
  comparisonRight: null,
  image: null,
  imagePath: null,
  audioPath: null,
  audioDurationSeconds: 3.4,
  captions: [],
  ...value,
});

const baseManifest = {
  schemaVersion: 2 as const,
  status: 'candidate' as const,
  source: {url: 'https://blog.dohyeon.kr', title: 'blog.dohyeon.kr'},
  candidate: {
    angle: 'reframe',
    hook: '생각을 짧게 보여주는 방법',
    title: 'DLOG Shorts',
    rationale: 'Template preview',
    viralScore: 0,
    suggestedCaption: '',
    hashtags: [],
  },
  style: {
    theme: 'monochrome-editorial-dark' as const,
    visualDensity: 'high' as const,
    subtitles: 'burned-in' as const,
    safeArea: 'shorts-reels' as const,
  },
};

const defaultProps: RenderManifest = {
  ...baseManifest,
  id: 'preview',
  scenes: [
    scene({
      kind: 'statement',
      layout: 'diagram-centered',
      transition: 'wipe',
      visual: {
        type: 'diagram',
        motif: 'roi-curve',
        query: null,
        value: null,
        xLabel: '투입 시간',
        yLabel: '학습 효용',
      },
      headline: '좋은 설명은\n생각을 보이게 만든다.',
      subline: '프리셋 도식으로 핵심 관계를 보여준다',
    }),
  ],
};

const templatePreviewProps: RenderManifest = {
  ...baseManifest,
  id: 'template-preview',
  source: {url: 'https://blog.dohyeon.kr', title: 'DLOG / TEMPLATE PREVIEW'},
  scenes: [
    scene({
      kind: 'hero',
      layout: 'photo-full-bleed',
      transition: 'zoom',
      visual: {type: 'photo', motif: null, query: 'editorial cover', value: null, xLabel: null, yLabel: null},
      headline: '사진은 오직\n풀블리드 커버로.',
      subline: '텍스트는 크게, 이미지는 화면 전체를 덮는다',
    }),
    scene({
      kind: 'statement',
      layout: 'diagram-centered',
      transition: 'wipe',
      visual: {type: 'diagram', motif: 'roi-curve', query: null, value: null, xLabel: '투입 시간', yLabel: '효용'},
      headline: 'ROI는\n곡선으로 보여준다.',
      subline: '그래프는 Recharts 프리셋을 사용한다',
    }),
    scene({
      kind: 'statement',
      layout: 'diagram-centered',
      transition: 'slide-left',
      visual: {type: 'diagram', motif: 'map-network', query: null, value: null, xLabel: null, yLabel: null},
      headline: '구조는\n관계로 보여준다.',
      subline: 'React Flow + Dagre가 레이아웃을 맡는다',
    }),
    scene({
      kind: 'statement',
      layout: 'symbol-right',
      transition: 'slide-up',
      visual: {type: 'symbol', motif: 'target', query: null, value: null, xLabel: null, yLabel: null},
      headline: '목표라면\n타겟 하나면 된다.',
      subline: '단일 은유는 Lucide 프리셋으로 단순하게',
    }),
    scene({
      kind: 'compare',
      layout: 'compare-versus',
      transition: 'fade',
      visual: {type: 'diagram', motif: 'compare', query: null, value: null, xLabel: null, yLabel: null},
      headline: '깊이와 넓이는\n다르게 보여야 한다.',
      comparisonLeft: '한 점을 깊게 파기',
      comparisonRight: '전체 구조를 넓게 연결하기',
    }),
    scene({
      kind: 'statement',
      layout: 'statement-giant',
      transition: 'slide-up',
      headline: '타이포가\n주인공인 장면.',
      subline: 'DLOG의 굵고 각진 편집 디자인을 유지한다',
    }),
    scene({
      kind: 'outro',
      layout: 'outro-minimal',
      transition: 'fade',
      headline: 'PROBLEMS\nBEFORE\nTECHNOLOGY.',
      subline: 'blog.dohyeon.kr',
    }),
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DiagramPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: diagramExample, durationInFrames: 120}} />
    <Composition id="MotionCanvasPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: {...diagramExample, renderer: 'motion-canvas' as const}, durationInFrames: 120, strict: true}} />
    <Composition id="PhysicsPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: physicsExample, durationInFrames: 120, strict: true}} />
    <Composition id="CanvasFallbackPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: diagramExample, durationInFrames: 120, failEngine: 'remotion' as const}} />
    <Composition id="PhysicsFallbackPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: physicsExample, durationInFrames: 120, failEngine: 'motion-canvas' as const}} />
    <Composition
      id="ShortVideo"
      component={ShortVideo}
      durationInFrames={60 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
    <Composition
      id="TemplatePreview"
      component={ShortVideo}
      durationInFrames={30 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={templatePreviewProps}
    />
  </>
);
