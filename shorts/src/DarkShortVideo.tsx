import React from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {
  Bookmark,
  Compass,
  Filter,
  GitFork,
  Hourglass,
  ListOrdered,
  MoveUpRight,
  Network,
  Repeat2,
  Route,
  Scale,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import type {
  RenderManifest,
  RenderScene,
  SceneLayout,
  SceneTransition,
  SceneVisual,
} from './types';

const FPS = 30;
const MIN_SCENE_SECONDS = 2.2;
const SCENE_TAIL_SECONDS = 0.28;
const BG = '#050505';
const PANEL = '#101012';
const FG = '#f5f5f2';
const MUTED = '#969691';
const LINE = '#2b2b30';
const SOFT = '#d9d9d4';

// Meaningful content stays clear of Shorts/Reels chrome.
const SAFE_LEFT = 82;
const SAFE_RIGHT = 188;
const SAFE_BOTTOM = 370;
const SAFE_CONTENT_RIGHT = 1080 - SAFE_RIGHT;
const SAFE_CONTENT_WIDTH = SAFE_CONTENT_RIGHT - SAFE_LEFT;

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

const sceneFrames = (scene: RenderScene) =>
  Math.max(
    Math.round(MIN_SCENE_SECONDS * FPS),
    Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS),
  );

const compactLength = (text: string) => text.replace(/\s/g, '').length;

const fontSizeFor = (text: string, base = 88) => {
  const length = compactLength(text);
  if (length > 44) return base - 30;
  if (length > 34) return base - 20;
  if (length > 25) return base - 10;
  return base;
};

const fallbackLayout = (scene: RenderScene): SceneLayout => {
  if (scene.layout) return scene.layout;
  if (scene.kind === 'compare') return 'compare-columns';
  if (scene.kind === 'outro') return 'outro-minimal';
  if (scene.kind === 'photo' || scene.kind === 'hero') return 'photo-top-right';
  return 'statement-offset';
};

const fallbackVisual = (scene: RenderScene): SceneVisual => {
  if (scene.visual) return scene.visual;
  if ((scene.kind === 'photo' || scene.kind === 'hero') && scene.imagePath) {
    return {type: 'photo', motif: null, query: scene.imageQuery, value: null, xLabel: null, yLabel: null};
  }
  if (scene.kind === 'compare') {
    return {type: 'diagram', motif: 'compare', query: null, value: null, xLabel: null, yLabel: null};
  }
  return {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null};
};

const fallbackTransition = (scene: RenderScene, index: number): SceneTransition => {
  if (scene.transition) return scene.transition;
  const sequence: SceneTransition[] = ['fade', 'slide-up', 'slide-left', 'zoom', 'wipe'];
  return sequence[index % sequence.length];
};

const transitionStyle = (
  transition: SceneTransition,
  frame: number,
  durationInFrames: number,
): React.CSSProperties => {
  const enter = interpolate(frame, [0, 12], [0, 1], clamp);
  const exit = interpolate(frame, [Math.max(12, durationInFrames - 8), durationInFrames], [1, 0], clamp);
  const opacity = transition === 'none' ? exit : enter * exit;

  if (transition === 'slide-up') {
    const y = interpolate(frame, [0, 14], [44, 0], clamp);
    return {opacity, transform: `translateY(${y}px)`};
  }
  if (transition === 'slide-left') {
    const x = interpolate(frame, [0, 14], [58, 0], clamp);
    return {opacity, transform: `translateX(${x}px)`};
  }
  if (transition === 'zoom') {
    const scale = interpolate(frame, [0, 16], [0.96, 1], clamp);
    return {opacity, transform: `scale(${scale})`};
  }
  if (transition === 'wipe') {
    const right = interpolate(frame, [0, 16], [100, 0], clamp);
    return {opacity: exit, clipPath: `inset(0 ${right}% 0 0)`};
  }
  return {opacity};
};

const MonochromePhoto: React.FC<{
  scene: RenderScene;
  frame: number;
  index: number;
  style: React.CSSProperties;
}> = ({scene, frame, index, style}) => {
  if (!scene.imagePath) return null;
  const scale = interpolate(frame, [0, 150], [1.08, 1.025], clamp);
  const x = interpolate(frame, [0, 150], [index % 2 === 0 ? -10 : 10, 0], clamp);
  return (
    <div style={{overflow: 'hidden', background: PANEL, ...style}}>
      <Img
        src={staticFile(scene.imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.18) brightness(.62)',
          transform: `translateX(${x}px) scale(${scale})`,
        }}
      />
    </div>
  );
};

const iconForMotif = (motif: string | null) => {
  switch (motif) {
    case 'target': return Target;
    case 'balance-scale': return Scale;
    case 'compass': return Compass;
    case 'arrow-path': return Route;
    case 'magnifier': return Search;
    case 'leverage': return MoveUpRight;
    case 'bookmark-stack': return Bookmark;
    case 'funnel': return Filter;
    case 'map-network':
    case 'network': return Network;
    case 'fork-road': return GitFork;
    case 'ranked-list': return ListOrdered;
    case 'ladder': return TrendingUp;
    case 'warning': return TriangleAlert;
    case 'hourglass': return Hourglass;
    case 'feedback-loop': return Repeat2;
    default: return Sparkles;
  }
};

const RoiChart: React.FC<{visual: SceneVisual; frame: number}> = ({visual, frame}) => {
  const progress = interpolate(frame, [4, 34], [0, 1], clamp);
  const width = 620;
  const height = 430;
  const data = [
    {x: 0, y: 4}, {x: 1, y: 10}, {x: 2, y: 21}, {x: 3, y: 38},
    {x: 4, y: 58}, {x: 5, y: 73}, {x: 6, y: 84}, {x: 7, y: 92},
  ];

  return (
    <div style={{position: 'relative', width, height: height + 64}}>
      <div style={{position: 'absolute', inset: 0, opacity: .35}}>
        <AreaChart width={width} height={height} data={data} margin={{top: 20, right: 18, bottom: 30, left: 8}}>
          <CartesianGrid stroke={LINE} vertical={false} strokeDasharray="4 8" />
          <XAxis dataKey="x" hide />
          <YAxis hide domain={[0, 100]} />
          <Area type="monotone" dataKey="y" stroke={MUTED} fill="rgba(255,255,255,.04)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </div>
      <div style={{position: 'absolute', inset: 0, width: width * progress, overflow: 'hidden'}}>
        <AreaChart width={width} height={height} data={data} margin={{top: 20, right: 18, bottom: 30, left: 8}}>
          <CartesianGrid stroke={LINE} vertical={false} strokeDasharray="4 8" />
          <XAxis dataKey="x" hide />
          <YAxis hide domain={[0, 100]} />
          <Area type="monotone" dataKey="y" stroke={FG} fill="rgba(255,255,255,.12)" strokeWidth={8} isAnimationActive={false} />
        </AreaChart>
      </div>
      <div style={{position: 'absolute', left: 22, bottom: 0, color: MUTED, fontSize: 24}}>{visual.xLabel ?? '투입'}</div>
      <div style={{position: 'absolute', right: 20, top: 8, color: MUTED, fontSize: 24}}>{visual.yLabel ?? '효용'}</div>
    </div>
  );
};

const PresetVisual: React.FC<{visual: SceneVisual; frame: number; index: number}> = ({visual, frame, index}) => {
  if (visual.motif === 'roi-curve') return <RoiChart visual={visual} frame={frame} />;

  const Icon = iconForMotif(visual.motif);
  const progress = interpolate(frame, [2, 20], [0, 1], clamp);
  const scale = .72 + progress * .28;
  const rotate = visual.motif === 'feedback-loop' ? interpolate(frame, [0, 80], [-18, 8], clamp) : 0;
  const offset = interpolate(frame, [0, 18], [index % 2 === 0 ? 24 : -24, 0], clamp);

  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: progress, transform: `translateX(${offset}px) scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          width: 360, height: 360, border: `1px solid ${LINE}`, borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(255,255,255,.06), rgba(255,255,255,.015) 62%, transparent 63%)',
        }}
      >
        <Icon size={210} strokeWidth={1.35} color={FG} />
      </div>
    </div>
  );
};

const CompareVisual: React.FC<{scene: RenderScene; frame: number; versus: boolean}> = ({scene, frame, versus}) => {
  const progress = interpolate(frame, [2, 18], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute', top: versus ? 310 : 265, left: SAFE_LEFT, right: SAFE_RIGHT + 24,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, opacity: progress,
      }}
    >
      {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => (
        <div
          key={`${label}-${index}`}
          style={{
            minHeight: versus ? 450 : 480, padding: '38px 30px', border: `1px solid ${LINE}`,
            borderRadius: 24, background: index === 1 ? '#161619' : PANEL,
            display: 'flex', alignItems: 'flex-end', color: index === 1 ? FG : SOFT,
            fontSize: versus ? 46 : 42, fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-0.045em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all',
            transform: `translateY(${(1 - progress) * (index === 0 ? 30 : 50)}px)`,
          }}
        >
          {label ?? ''}
        </div>
      ))}
      {versus ? (
        <div style={{position: 'absolute', left: '50%', top: 190, transform: 'translate(-50%, -50%)', color: BG, background: FG, borderRadius: 999, padding: '12px 16px', fontSize: 34, fontWeight: 900}}>VS</div>
      ) : null}
    </div>
  );
};

const CaptionOverlay: React.FC<{scene: RenderScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const cue = scene.captions?.find((item) => seconds >= item.startSeconds && seconds < item.endSeconds);
  if (!cue) return null;
  const text = cue.text.replace(/\s+/g, ' ').trim();
  const length = compactLength(text);
  const fontSize = length > 20 ? 29 : length > 16 ? 32 : length > 12 ? 35 : 38;
  return (
    <div style={{position: 'absolute', left: SAFE_LEFT, right: SAFE_RIGHT + 24, bottom: SAFE_BOTTOM + 44, display: 'flex', justifyContent: 'center', zIndex: 30}}>
      <div
        style={{
          maxWidth: SAFE_CONTENT_WIDTH - 24, padding: '12px 20px 13px', borderRadius: 999,
          background: FG, color: BG, fontSize, fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-0.025em', textAlign: 'center', whiteSpace: 'nowrap', wordBreak: 'keep-all',
          overflow: 'hidden', textOverflow: 'clip',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SceneFrame: React.FC<{
  scene: RenderScene;
  index: number;
  total: number;
  sourceTitle: string;
  durationInFrames: number;
}> = ({scene, index, total, sourceTitle, durationInFrames}) => {
  const frame = useCurrentFrame();
  const layout = fallbackLayout(scene);
  const visual = fallbackVisual(scene);
  const transition = fallbackTransition(scene, index);
  const fullBleed = layout === 'photo-full-bleed' && Boolean(scene.imagePath);
  const isCompare = layout === 'compare-columns' || layout === 'compare-versus';
  const reveal = interpolate(frame, [0, 14], [0, 1], clamp);
  const textY = interpolate(frame, [0, 14], [22, 0], clamp);

  const photo = (() => {
    if (!scene.imagePath || visual.type !== 'photo') return null;
    if (layout === 'photo-full-bleed') {
      return (
        <>
          <MonochromePhoto scene={scene} frame={frame} index={index} style={{position: 'absolute', inset: 0}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,5,5,.12), rgba(5,5,5,.38) 45%, rgba(5,5,5,.94) 100%)'}} />
        </>
      );
    }
    if (layout === 'photo-split-left') return <MonochromePhoto scene={scene} frame={frame} index={index} style={{position: 'absolute', left: 0, top: 150, width: 420, height: 1040}} />;
    if (layout === 'photo-strip') return <MonochromePhoto scene={scene} frame={frame} index={index} style={{position: 'absolute', left: SAFE_LEFT, top: 410, width: 760, height: 470, borderRadius: 28}} />;
    return <MonochromePhoto scene={scene} frame={frame} index={index} style={{position: 'absolute', top: 205, left: 325, width: 515, height: 650, borderRadius: 28}} />;
  })();

  const preset = visual.type === 'diagram' || visual.type === 'symbol' || visual.type === 'number' ? (
    <div
      style={{
        position: 'absolute', top: layout === 'diagram-centered' ? 230 : 320,
        left: layout === 'diagram-centered' ? 112 : 430,
        width: layout === 'diagram-centered' ? 680 : 390,
        height: layout === 'diagram-centered' ? 600 : 390,
      }}
    >
      {visual.type === 'number' ? (
        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FG, fontSize: 210, fontWeight: 900, opacity: reveal}}>{visual.value ?? String(index + 1).padStart(2, '0')}</div>
      ) : <PresetVisual visual={visual} frame={frame} index={index} />}
    </div>
  ) : null;

  const textStyle: React.CSSProperties = (() => {
    if (layout === 'photo-full-bleed') return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 150, width: 750};
    if (layout === 'photo-split-left') return {left: 470, bottom: SAFE_BOTTOM + 150, width: 370};
    if (layout === 'statement-giant') return {left: SAFE_LEFT, top: 360, width: 760};
    if (layout === 'diagram-centered') return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 135, width: 760};
    if (layout === 'symbol-right') return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 180, width: 430};
    if (layout === 'outro-minimal') return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 190, width: 760};
    if (isCompare) return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 130, width: 760};
    return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 150, width: 720};
  })();

  const headlineBase = layout === 'statement-giant' ? 108 : layout === 'photo-split-left' ? 66 : layout === 'outro-minimal' ? 94 : 84;

  return (
    <AbsoluteFill style={{background: BG, color: FG, overflow: 'hidden', wordBreak: 'keep-all'}}>
      <AbsoluteFill
        style={{
          background: BG, color: FG, fontFamily: 'Pretendard, Arial, sans-serif', overflow: 'hidden',
          wordBreak: 'keep-all', overflowWrap: 'normal', transformOrigin: 'center center',
          ...transitionStyle(transition, frame, durationInFrames),
        }}
      >
        <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>
        {photo}
        {preset}
        {layout === 'compare-columns' ? <CompareVisual scene={scene} frame={frame} versus={false} /> : null}
        {layout === 'compare-versus' ? <CompareVisual scene={scene} frame={frame} versus /> : null}

        <div style={{position: 'absolute', top: 76, left: SAFE_LEFT, width: 620, display: 'flex', gap: 18, alignItems: 'center', fontSize: 21, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', zIndex: 10}}>
          <strong style={{color: FG}}>dohyeon.kr</strong><span>•</span><span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{sourceTitle}</span>
        </div>
        <div style={{position: 'absolute', top: 78, right: SAFE_RIGHT + 20, fontSize: 20, color: MUTED, letterSpacing: '.08em', zIndex: 10}}>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>

        <div style={{position: 'absolute', ...textStyle, transform: `translateY(${textY}px)`, opacity: reveal, zIndex: 12}}>
          <div style={{fontSize: fontSizeFor(scene.headline, headlineBase), fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.055em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', textShadow: fullBleed ? '0 3px 24px rgba(0,0,0,.5)' : 'none'}}>{scene.headline}</div>
          {scene.subline ? <div style={{marginTop: 28, maxWidth: 700, fontSize: layout === 'photo-split-left' ? 25 : 28, lineHeight: 1.4, letterSpacing: '-0.025em', color: SOFT, whiteSpace: 'pre-wrap', wordBreak: 'keep-all'}}>{scene.subline}</div> : null}
        </div>

        <CaptionOverlay scene={scene} />
        <div style={{position: 'absolute', bottom: SAFE_BOTTOM + 16, left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 30, height: 2, background: LINE, zIndex: 20}}>
          <div style={{width: `${((index + 1) / total) * 100}%`, height: '100%', background: FG}} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const DarkShortVideo: React.FC<RenderManifest> = ({source, scenes}) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{background: BG}}>
      {scenes.map((scene, index) => {
        const durationInFrames = sceneFrames(scene);
        const from = cursor;
        cursor += durationInFrames;
        return (
          <Sequence key={`${index}-${scene.headline}`} from={from} durationInFrames={durationInFrames}>
            <SceneFrame scene={scene} index={index} total={scenes.length} sourceTitle={source.title} durationInFrames={durationInFrames} />
            {scene.audioPath ? <Html5Audio src={staticFile(scene.audioPath)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
