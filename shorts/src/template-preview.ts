import type {RenderManifest, RenderScene, SubtitleBeat} from './types';
import type {DiagramSpec} from './visuals/diagram-spec';
import {physicsExample} from './visuals/physics-example.ts';

const beat = (text: string, keyword: string | null = null): SubtitleBeat => ({
  text, keyword, emphasis: keyword ? 'high' : 'mid', delivery: keyword ? 'hold' : 'normal',
  pauseAfterMs: keyword ? 240 : 120, visualPriority: 'high', visualCue: null,
});
const scene = (headline: string, beats: SubtitleBeat[], extra: Partial<RenderScene> = {}): RenderScene => ({
  kind: 'statement', layout: 'statement-giant', transition: 'fade',
  visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
  headline, subline: null, beats, narration: beats.map(b => b.text).join(' '),
  imageQuery: null, image: null, imagePath: null, audioPath: null,
  comparisonLeft: null, comparisonRight: null, captions: [],
  audioDurationSeconds: beats.reduce((sum, b) => sum + b.text.replace(/\s/g, '').length / 6 + b.pauseAfterMs / 1000, 0),
  choreography: ['show-visual', 'show-headline', 'advance-visual', 'emphasize-result'],
  ...extra,
});

const bottleneck: DiagramSpec = {
  version: 1, renderer: 'auto', physics: null, description: '입력은 관문 앞에 쌓이고, 관문이 열리면 대기열이 빠져나간다',
  nodes: [
    {id: 'gate', shape: 'rect', label: '병목', x: 520, y: 280, width: 80, height: 250, fill: 'gray'},
    ...Array.from({length: 5}, (_, i) => ({id: `item-${i}`, shape: 'circle' as const, label: '', x: 100, y: 160 + i * 60, width: 26, height: 26, fill: 'white' as const})),
    {id: 'input-label', shape: 'text', label: '쌓이는 입력', x: 240, y: 80, width: 250, height: 40, fill: 'none'},
    {id: 'output-label', shape: 'text', label: '열리는 흐름', x: 630, y: 80, width: 250, height: 40, fill: 'none'},
  ],
  events: [
    {target: 'gate', property: 'opacity', from: 1, to: .15, start: .50, end: .60},
    ...Array.from({length: 5}, (_, i) => [
      {target: `item-${i}`, property: 'x' as const, from: 100, to: 440 - i * 42, start: .03, end: .35},
      {target: `item-${i}`, property: 'y' as const, from: 160 + i * 60, to: 280, start: .03, end: .35},
      {target: `item-${i}`, property: 'x' as const, from: 440 - i * 42, to: 730, start: .60 + i * .025, end: .82 + i * .025},
    ]).flat(),
  ],
};

export const templatePreviewProps: RenderManifest = {
  schemaVersion: 3, id: 'template-preview', status: 'candidate',
  source: {url: 'https://blog.dohyeon.kr', title: 'DLOG'},
  candidate: {angle: 'reframe', hook: '더 많이 하면 더 나아질까?', title: '노력보다 먼저, 구조', rationale: '연출 검증용 창작 예제. 실제 블로그 사례나 측정 데이터가 아님.', viralScore: 0, suggestedCaption: '', hashtags: []},
  style: {theme: 'monochrome-editorial-dark', visualDensity: 'high', subtitles: 'burned-in', safeArea: 'shorts-reels', artDirection: 'monochrome-editorial-motion', decorativeLabels: 'forbidden'},
  scenes: [
    scene('더 많이 하면\n더 나아질까?', [beat('시간을 더 쏟으면'), beat('결과도 더 좋아질까요?', '결과')]),
    scene('투입과 결과는\n비례하지 않는다.', [beat('투입은 계속 늘어도'), beat('효용은 둔해질 수 있습니다.', '효용')], {
      layout: 'diagram-centered', transition: 'wipe', subline: '개념적 곡선 · 측정 데이터 아님',
      visual: {type: 'diagram', motif: 'roi-curve', query: null, value: null, xLabel: '투입', yLabel: '효용'},
      camera: {motion: 'zoom', target: 'endpoint', intensity: 'subtle', startProgress: .45, endProgress: .85},
    }),
    scene('힘이 같아도\n작용점은 다르다.', [beat('시소의 한쪽에 힘이 실리면'), beat('전체의 균형이 바뀝니다.', '균형')], {
      layout: 'diagram-centered', transition: 'slide-left', subline: '구조를 설명하는 물리적 비유',
      diagramSpec: {...physicsExample, nodes: physicsExample.nodes.filter(n => n.id !== 'title')},
    }),
    scene('더 밀어 넣기보다\n막힌 곳을 연다.', [beat('막힌 곳에 일을 더 넣기보다'), beat('먼저 병목을 열어야 합니다.', '병목')], {
      layout: 'diagram-centered', transition: 'wipe', diagramSpec: bottleneck,
    }),
    scene('노력보다 먼저,\n구조를 보자.', [beat('얼마나 더 할지가 아니라'), beat('어디를 바꿀지 묻는 겁니다.', '어디를')]),
    scene('PROBLEMS\nBEFORE\nTECHNOLOGY.', [], {kind: 'outro', layout: 'outro-minimal', subline: 'blog.dohyeon.kr', audioDurationSeconds: 2.5}),
  ],
};

export const previewSceneFrames = (s: RenderScene) => Math.max(66, Math.ceil(((s.audioDurationSeconds ?? 3.6) + .28) * 30));
export const previewDuration = (props: RenderManifest) => props.scenes.reduce((sum, s) => sum + previewSceneFrames(s), 0);
