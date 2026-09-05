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
import {PresetVisual} from './visuals/PresetVisual';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {fitCopy} from './text-layout';
import {subtitleAt} from './subtitles';
import type {
  RenderManifest,
  RenderScene,
  SceneLayout,
  SceneTransition,
  SceneVisual,
  SubtitleBeat,
} from './types';

const FPS = 30;
const MIN_SCENE_SECONDS = 2.2;
const SCENE_TAIL_SECONDS = 0.28;
const BLACK = '#050505';
const WHITE = '#ffffff';
const GRAY = '#8a8a8a';
const DARK_GRAY = '#242424';

const SAFE_TOP = 220;
const SAFE_LEFT = 64;
const SAFE_RIGHT = 188;
const SAFE_BOTTOM = 370;
const CHROME_TOP = SAFE_TOP + 22;
const CONTENT_TOP = SAFE_TOP + 220;
const SAFE_CONTENT_RIGHT = 1080 - SAFE_RIGHT;
const SAFE_CONTENT_WIDTH = SAFE_CONTENT_RIGHT - SAFE_LEFT;

const clampInterpolation = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const sceneFrames = (scene: RenderScene) =>
  Math.max(
    Math.round(MIN_SCENE_SECONDS * FPS),
    Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS),
  );

const compactLength = (text: string) => text.replace(/\s/g, '').length;

const headlineSize = (text: string, base = 132) => {
  const length = compactLength(text);
  if (length > 42) return base - 34;
  if (length > 32) return base - 22;
  if (length > 24) return base - 10;
  return base;
};

const fallbackVisual = (scene: RenderScene): SceneVisual => {
  if (scene.visual) return scene.visual;
  if ((scene.kind === 'photo' || scene.kind === 'hero') && (scene.imagePath || scene.imageQuery)) {
    return {type: 'photo', motif: null, query: scene.imageQuery, value: null, xLabel: null, yLabel: null};
  }
  if (scene.kind === 'compare') {
    return {type: 'diagram', motif: 'compare', query: null, value: null, xLabel: null, yLabel: null};
  }
  return {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null};
};

const fallbackLayout = (scene: RenderScene, visual: SceneVisual): SceneLayout => {
  if (scene.layout) return scene.layout;
  if (visual.type === 'photo') return 'photo-full-bleed';
  if (scene.kind === 'compare') return 'compare-columns';
  if (scene.kind === 'outro') return 'outro-minimal';
  return 'statement-offset';
};

const fallbackTransition = (scene: RenderScene, index: number): SceneTransition => {
  if (scene.transition) return scene.transition;
  const defaults: SceneTransition[] = ['fade', 'slide-up', 'slide-left', 'wipe', 'fade'];
  return defaults[index % defaults.length];
};

const transitionMotion = (
  transition: SceneTransition,
  frame: number,
  durationInFrames: number,
): React.CSSProperties => {
  const enter = interpolate(frame, [0, 12], [0, 1], clampInterpolation);
  const exitStart = Math.max(12, durationInFrames - 9);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], clampInterpolation);
  const opacity = transition === 'none' ? exit : enter * exit;
  if (transition === 'slide-up') {
    const y = interpolate(frame, [0, 16], [44, 0], clampInterpolation);
    return {opacity, transform: `translateY(${y}px)`};
  }
  if (transition === 'slide-left') {
    const x = interpolate(frame, [0, 16], [56, 0], clampInterpolation);
    return {opacity, transform: `translateX(${x}px)`};
  }
  if (transition === 'zoom') {
    const scale = interpolate(frame, [0, 18], [0.97, 1], clampInterpolation);
    return {opacity, transform: `scale(${scale})`};
  }
  if (transition === 'wipe') {
    const rightInset = interpolate(frame, [0, 18], [100, 0], clampInterpolation);
    return {opacity: exit, clipPath: `inset(0 ${rightInset}% 0 0)`};
  }
  return {opacity};
};

const eventStartFrame = (scene: RenderScene, event: string, fallback: number) => {
  const index = scene.choreography?.indexOf(event) ?? -1;
  return index >= 0 ? 4 + index * 7 : fallback;
};

const eventProgress = (scene: RenderScene, event: string, frame: number, fallback: number, duration = 12) => {
  const start = eventStartFrame(scene, event, fallback);
  return interpolate(frame, [start, start + duration], [0, 1], clampInterpolation);
};

const PhotoCover: React.FC<{scene: RenderScene; frame: number; index: number}> = ({scene, frame, index}) => {
  const scale = interpolate(frame, [0, 180], [1.08, 1.02], clampInterpolation);
  const x = interpolate(frame, [0, 180], [index % 2 === 0 ? -12 : 12, 0], clampInterpolation);
  if (!scene.imagePath) {
    return <AbsoluteFill style={{background: 'linear-gradient(135deg, #111 0%, #111 32%, #313131 32%, #313131 58%, #151515 58%, #151515 100%)'}} />;
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: BLACK}}>
      <Img
        src={staticFile(scene.imagePath)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.2) brightness(0.72)',
          transform: `translateX(${x}px) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const BlogChrome: React.FC<{index: number; total: number; sourceTitle: string}> = ({index, total, sourceTitle}) => (
  <div style={{position: 'absolute', top: CHROME_TOP, left: SAFE_LEFT, right: SAFE_RIGHT + 18, zIndex: 20, color: WHITE}}>
    <div style={{fontSize: 46, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1}}>DLOG</div>
    <div style={{marginTop: 20, fontSize: 20, fontWeight: 900, letterSpacing: '-0.025em'}}>PROBLEMS BEFORE TECHNOLOGY</div>
    <div style={{height: 2, marginTop: 24, background: WHITE}} />
    <div style={{marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, fontWeight: 900, letterSpacing: '0.07em'}}>
      <span>SHORT / LATEST</span>
      <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </div>
    <div style={{marginTop: 13, display: 'inline-block', maxWidth: 610, padding: '7px 11px 8px', background: BLACK, color: WHITE, border: `2px solid ${WHITE}`, fontSize: 16, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
      {sourceTitle}
    </div>
  </div>
);


const highlightedText = (text: string, keyword: string | null | undefined) => {
  if (!keyword?.trim()) return text;
  const index = text.indexOf(keyword);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span style={{display: 'inline-block', margin: '0 3px', padding: '1px 6px 3px', background: WHITE, color: BLACK, lineHeight: 1}}>{keyword}</span>
      {text.slice(index + keyword.length)}
    </>
  );
};

const CaptionOverlay: React.FC<{scene: RenderScene; photo: boolean}> = ({scene, photo}) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const cue = subtitleAt(scene, seconds);
  if (!cue) return null;
  const text = cue.text.replace(/\s+/g, ' ').trim();

  return (
    <div data-layout="caption" style={{position: 'absolute', left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 20, top: 1340, height: 180, display: 'flex', alignItems: 'flex-start', zIndex: 40, pointerEvents: 'none'}}>
      <div style={{boxSizing: 'border-box', maxWidth: '100%', padding: '12px 17px 13px', border: '2px solid #484848', background: photo ? 'rgba(5,5,5,.88)' : '#151515', color: WHITE, fontSize: 38, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.025em', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'keep-all', overflowWrap: 'anywhere'}}>
        {highlightedText(text, 'keyword' in cue ? cue.keyword as string | null : null)}
      </div>
    </div>
  );
};

const ComparePanel: React.FC<{scene: RenderScene; reveal: number; versus: boolean}> = ({scene, reveal, versus}) => (
  <div style={{position: 'absolute', top: CONTENT_TOP, left: SAFE_LEFT, right: SAFE_RIGHT + 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
    {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => {
      const local = Math.max(0, Math.min(1, reveal * 1.35 - index * 0.2));
      return (
        <div key={`${label}-${index}`} style={{boxSizing: 'border-box', minWidth: 0, height: 460, padding: '32px 28px', border: `2px solid ${WHITE}`, background: index === 1 ? WHITE : BLACK, color: index === 1 ? BLACK : WHITE, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: local, transform: `translateY(${(1 - local) * 24}px)`}}>
          <div style={{fontSize: 18, fontWeight: 900, letterSpacing: '0.08em'}}>{versus ? (index === 0 ? 'BEFORE' : 'AFTER') : `0${index + 1}`}</div>
          <div style={{fontSize: fitCopy(label ?? '', 320, 310, 50).fontSize, fontWeight: 900, lineHeight: 1.12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{fitCopy(label ?? '', 320, 310, 50).text}</div>
        </div>
      );
    })}
  </div>
);

const SceneFrame: React.FC<{scene: RenderScene; index: number; total: number; sourceTitle: string; durationInFrames: number}> = ({scene, index, total, sourceTitle, durationInFrames}) => {
  const frame = useCurrentFrame();
  const visual = fallbackVisual(scene);
  const layout = fallbackLayout(scene, visual);
  const transition = fallbackTransition(scene, index);
  const photo = visual.type === 'photo';
  const isCompare = !scene.diagramSpec && (layout === 'compare-columns' || layout === 'compare-versus');
  const hasPresetVisual = Boolean(scene.diagramSpec) || visual.type === 'diagram' || visual.type === 'symbol' || visual.type === 'number';
  const visualReveal = eventProgress(scene, 'show-visual', frame, 5, 14);
  const compareReveal = eventProgress(scene, 'show-visual', frame, 6, 18);
  const headlineReveal = eventProgress(scene, 'show-headline', frame, hasPresetVisual || isCompare ? 14 : 6, 13);
  const sublineReveal = eventProgress(scene, 'show-subline', frame, hasPresetVisual || isCompare ? 22 : 15, 13);
  const headlineY = interpolate(headlineReveal, [0, 1], [34, 0], clampInterpolation);
  const sublineY = interpolate(sublineReveal, [0, 1], [18, 0], clampInterpolation);

  const headlineBase = layout === 'statement-giant' ? 150 : layout === 'outro-minimal' ? 140 : photo ? 136 : 126;
  const headingTop = hasPresetVisual || isCompare ? 1040 : photo ? 1000 : 700;
  const headingHeight = 1310 - headingTop - (scene.subline ? 90 : 0);
  const heading = fitCopy(scene.headline, SAFE_CONTENT_WIDTH - 20, headingHeight, Math.min(headlineBase, hasPresetVisual || isCompare ? 98 : 124));
  const subline = fitCopy(scene.subline ?? '', SAFE_CONTENT_WIDTH - 20, 78, 30);

  return (
    <AbsoluteFill style={{background: BLACK, color: WHITE, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: BLACK, color: WHITE, fontFamily: 'Pretendard, Arial, sans-serif', overflow: 'hidden', transformOrigin: 'center center', ...transitionMotion(transition, frame, durationInFrames)}}>
        <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>

        {photo ? (
          <>
            <div style={layout === 'photo-full-bleed' ? {position: 'absolute', inset: 0} : {position: 'absolute', top: CONTENT_TOP + 10, left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 20, height: 520, overflow: 'hidden'}}>
              <PhotoCover scene={scene} frame={frame} index={index} />
            </div>
            {layout === 'photo-full-bleed' ? <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.08) 36%, rgba(0,0,0,.86) 78%, rgba(0,0,0,.96) 100%)'}} /> : null}
          </>
        ) : null}

        <BlogChrome index={index} total={total} sourceTitle={sourceTitle} />

        {hasPresetVisual && !isCompare && !photo ? (
          <div data-layout="visual" style={{position: 'absolute', top: CONTENT_TOP + 10, left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 22, height: 566, opacity: visualReveal, transform: `translateY(${(1 - visualReveal) * 20}px) scale(${0.985 + visualReveal * 0.015})`, transformOrigin: 'center center'}}>
            {scene.diagramSpec ? <DiagramRenderer spec={scene.diagramSpec} durationInFrames={durationInFrames} framesPath={scene.diagramFramesPath} /> : <PresetVisual visual={visual} camera={scene.camera} durationInFrames={durationInFrames} />}
          </div>
        ) : null}

        {isCompare ? <ComparePanel scene={scene} reveal={compareReveal} versus={layout === 'compare-versus'} /> : null}

        <div data-layout="copy" style={{position: 'absolute', left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 20, top: headingTop, zIndex: 20}}>
          <div style={{fontSize: heading.fontSize, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.045em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', textShadow: photo ? '0 4px 30px rgba(0,0,0,.58)' : 'none', opacity: headlineReveal, transform: `translateY(${headlineY}px)`}}>
            {heading.text}
          </div>

          {scene.subline ? (
            <div style={{marginTop: 12, fontSize: subline.fontSize, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.025em', color: photo ? WHITE : GRAY, whiteSpace: 'pre-wrap', opacity: sublineReveal, transform: `translateY(${sublineY}px)`}}>
              {subline.text}
            </div>
          ) : null}
        </div>

        <CaptionOverlay scene={scene} photo={photo} />

        <div style={{position: 'absolute', bottom: SAFE_BOTTOM + 16, left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 28, height: 3, background: DARK_GRAY, zIndex: 30}}>
          <div style={{width: `${((index + 1) / total) * 100}%`, height: '100%', background: WHITE}} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortVideo: React.FC<RenderManifest> = ({source, scenes}) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{background: BLACK}}>
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
