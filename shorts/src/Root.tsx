import React from 'react';
import {templatePreviewProps, previewDuration} from './template-preview';
import {Composition} from 'remotion';
import {ShortVideo} from './ShortVideo';
import {DarkShortVideo} from './DarkShortVideo';
import {motionPreviewProps, motionGalleryProps, flowDiagram, light} from './motion-preview';
import type {RenderManifest, RenderScene} from './types';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {physicsExample} from './visuals/physics-example';
import type {DiagramSpec} from './visuals/diagram-spec';

const diagramExample: DiagramSpec = {
  version: 1, renderer: 'remotion', description: '입력이 관문 앞에 모이는 개념도',
  nodes: [
    {id: 'gate', shape: 'rect', label: '처리', x: 540, y: 280, width: 110, height: 220, fill: 'hatch', strokeStyle: 'dashed'},
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

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MotionEffectsPreview" component={ShortVideo} durationInFrames={previewDuration(motionPreviewProps)} fps={30} width={1080} height={1920} defaultProps={motionPreviewProps} />
    <Composition id="MotionEffectsGallery" component={ShortVideo} durationInFrames={previewDuration(motionGalleryProps)} fps={30} width={1080} height={1920} defaultProps={motionGalleryProps} />
    <Composition id="DarkMotionEffectsPreview" component={DarkShortVideo} durationInFrames={previewDuration(motionPreviewProps)} fps={30} width={1080} height={1920} defaultProps={motionPreviewProps} />
    <Composition id="FlowGlowPreview" component={DiagramRenderer} durationInFrames={120} fps={30} width={800} height={560} defaultProps={{spec: flowDiagram, durationInFrames: 120, effects: [light('flow-glow', 'connection', {intensity: 1, radius: 36})]}} />
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
      durationInFrames={previewDuration(templatePreviewProps)}
      calculateMetadata={({props}) => ({durationInFrames: previewDuration(props)})}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={templatePreviewProps}
    />
  </>
);
