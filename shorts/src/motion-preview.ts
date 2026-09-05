import type {RenderManifest, RenderScene} from './types';
import type {DiagramSpec} from './visuals/diagram-spec';
import {TRANSITIONS, LIGHT_EFFECTS, type LightEffect} from './motion/schema.ts';

export const flowDiagram: DiagramSpec = {
  version: 1, renderer: 'remotion', description: '입력에서 처리로 신호가 전달되고 결과가 남는다',
  nodes: [
    {id: 'input', shape: 'rect', label: '입력\n요청', x: 150, y: 280, width: 180, height: 132, fill: 'none'},
    {id: 'connection', shape: 'line', label: '', x: 400, y: 280, width: 300, height: 2, fill: 'none'},
    {id: 'result', shape: 'rect', label: '처리\n결과', x: 650, y: 280, width: 180, height: 132, fill: 'hatch'},
    {id: 'caption', shape: 'text', label: '신호 전달', x: 400, y: 180, width: 220, height: 65, fill: 'none'},
  ], events: [],
};
export const light = (type: LightEffect['type'], target: string, overrides: Partial<LightEffect> = {}): LightEffect => ({type, target, startMs: 400, durationMs: 1800, intensity: .7, color: '#ffffff', seed: 17, ...overrides});
export const motionScene = (overrides: Partial<RenderScene> = {}): RenderScene => ({
  kind: 'statement', layout: 'diagram-centered', transition: 'none',
  visual: {type: 'diagram', motif: null, query: null, value: null, xLabel: null, yLabel: null},
  diagramSpec: flowDiagram, headline: '빛이 흐르면\n전달이 보입니다', subline: '라인 · 펄스 · 부드러운 광채', narration: '',
  imageQuery: null, image: null, imagePath: null, audioPath: null, audioDurationSeconds: 3.2,
  comparisonLeft: null, comparisonRight: null,
  captions: [{startSeconds: 0, endSeconds: 3.5, text: '밝은 중심과 주변의 빛을 함께 움직입니다'}],
  effects: [light('flow-glow', 'connection', {startMs: 700, durationMs: 1800, intensity: 1, radius: 36, coreRadius: 5}), light('glow', 'result', {startMs: 2250, durationMs: 900, intensity: .7})],
  ...overrides,
});
const base: Omit<RenderManifest, 'scenes'> = {
  schemaVersion: 3, id: 'motion-effects-preview', status: 'candidate',
  source: {url: 'https://dohyeon.kr', title: '빛과 움직임'},
  candidate: {angle: 'example', hook: '빛의 흐름', title: '트랜지션과 라이트 효과', rationale: '렌더 검증용 창작 예시', viralScore: 0, suggestedCaption: '', hashtags: []},
  style: {theme: 'monochrome-editorial'},
};
export const motionPreviewProps: RenderManifest = {...base, scenes: [
  motionScene(),
  motionScene({transition: 'blur-dissolve', headline: '흐려졌다가\n선명하게 연결', effects: [light('light-sweep', 'result', {intensity: .9})]}),
  motionScene({transition: 'directional-blur', headline: '움직이는 방향을\n빛으로 이어갑니다', effects: [light('flow-glow', 'connection', {intensity: 1, radius: 38})], diagramSpec: {...flowDiagram, nodes: flowDiagram.nodes.map(n => n.id === 'connection' ? {...n, width: 240} : n), events: [{target: 'connection', property: 'rotation', from: -12, to: 12, start: .15, end: .85}]}}),
  motionScene({transition: 'zoom-blur', headline: '주변은 부드럽게\n중심은 선명하게', effects: [light('glow', 'visual', {intensity: .6})]}),
  motionScene({transition: 'light-wipe', headline: '빛이 지나가며\n결과를 보여줍니다', effects: [light('flow-glow', 'connection', {intensity: 1}), light('glint', 'background', {origin: [.72, .4], startMs: 2300, durationMs: 500})]}),
]};
export const motionGalleryProps: RenderManifest = {...base, scenes: [
  ...TRANSITIONS.map(type => motionScene({transition: type, headline: type, transitionOptions: {durationMs: 700, matchTarget: type === 'match-cut' ? 'result' : null}, effects: [], audioDurationSeconds: 2.2})),
  ...LIGHT_EFFECTS.map(type => motionScene({transition: 'none', headline: type, audioDurationSeconds: 2.2, diagramSpec: {...flowDiagram, nodes: flowDiagram.nodes.map(n => n.id === 'result' && type === 'light-sweep' ? {...n, fill: 'gray'} : n)}, effects: [light(type, type === 'flow-glow' ? 'connection' : type === 'spotlight' ? 'visual' : ['glow', 'bloom', 'rim-light', 'light-sweep'].includes(type) ? 'result' : 'background', {startMs: 200, durationMs: 1800, intensity: 1})]})),
]};
