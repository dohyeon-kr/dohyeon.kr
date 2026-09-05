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
  if (visual.type === 'photo') return 'photo-full-bleed';
  if (scene.layout) return scene.layout;
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

type TimedBeat = SubtitleBeat & {startSeconds: number; endSeconds: number};

const timedBeats = (scene: RenderScene): TimedBeat[] => {
  const beats = scene.beats?.filter((beat) => beat.text.trim()) ?? [];
  if (!beats.length) return [];
  const duration = Math.max(0.8, scene.audioDurationSeconds ?? 3.6);
  const rawPauseSeconds = beats.reduce((sum, beat) => sum + Math.max(0, beat.pauseAfterMs) / 1000, 0);
  const pauseBudget = Math.min(rawPauseSeconds, duration * 0.24);
  const pauseScale = rawPauseSeconds > 0 ? pauseBudget / rawPauseSeconds : 0;
  const speechBudget = Math.max(0.5, duration - pauseBudget);
  const weights = beats.map((beat) => Math.max(1, compactLength(beat.text)) * (beat.delivery === 'hold' ? 1.12 : 1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return beats.map((beat, index) => {
    const span = (speechBudget * weights[index]) / totalWeight;
    const startSeconds = cursor;
    const endSeconds = Math.min(duration, startSeconds + span);
    cursor = endSeconds + (Math.max(0, beat.pauseAfterMs) / 1000) * pauseScale;
    return {...beat, startSeconds, endSeconds};
  });
};

const highlightedText = (text: string, keyword: string | null | undefined) => {
  if (!keyword?.trim()) return text;
  const index = text.indexOf(keyword);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <span style={{display: 'inline-block', margin: '0 3px', padding: '1px 6px 3px', background: BLACK, color: WHITE, lineHeight: 1}}>{keyword}</span>
      {text.slice(index + keyword.length)}
    </>
  );
};

const CaptionOverlay: React.FC<{scene: RenderScene; photo: boolean}> = ({scene, photo}) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const beats = timedBeats(scene);
  const activeBeat = beats.find((item) => seconds >= item.startSeconds && seconds < item.endSeconds);
  const fallbackCue = scene.captions?.find((item) => seconds >= item.startSeconds && seconds < item.endSeconds);
  if (!activeBeat && !fallbackCue) return null;

  const text = (activeBeat?.text ?? fallbackCue?.text ?? '').replace(/\s+/g, ' ').trim();
  const length = compactLength(text);
  const emphasis = activeBeat?.emphasis ?? 'mid';
  const delivery = activeBeat?.delivery ?? 'normal';
  const start = activeBeat?.startSeconds ?? fallbackCue?.startSeconds ?? seconds;
  const entry = interpolate(seconds, [start, start + 0.11], [0, 1], clampInterpolation);
  const baseFontSize = length > 19 ? 30 : length > 15 ? 34 : length > 11 ? 38 : 42;
  const fontSize = baseFontSize + (emphasis === 'high' ? 5 : emphasis === 'low' ? -2 : 0);
  const scale = emphasis === 'high'
    ? interpolate(entry, [0, 1], [0.94, 1.035], clampInterpolation)
    : interpolate(entry, [0, 1], [0.98, 1], clampInterpolation);
  const y = delivery === 'push'
    ? interpolate(entry, [0, 1], [12, -3], clampInterpolation)
    : interpolate(entry, [0, 1], [7, 0], clampInterpolation);

  return (
    <div style={{position: 'absolute', left: SAFE_LEFT, right: SAFE_RIGHT + 20, bottom: SAFE_BOTTOM + 46, display: 'flex', justifyContent: 'flex-start', zIndex: 40, pointerEvents: 'none', opacity: entry, transform: `translateY(${y}px) scale(${scale})`, transformOrigin: 'left bottom'}}>
      <div style={{maxWidth: SAFE_CONTENT_WIDTH - 18, padding: emphasis === 'high' ? '13px 19px 14px' : '12px 17px 13px', border: `${emphasis === 'high' ? 3 : 2}px solid ${photo ? BLACK : WHITE}`, borderRadius: 0, background: WHITE, color: BLACK, fontSize, fontWeight: 900, lineHeight: 1.08, letterSpacing: emphasis === 'high' ? '-0.055em' : '-0.045em', textAlign: 'left', whiteSpace: 'nowrap', wordBreak: 'keep-all'}}>
        {highlightedText(text, activeBeat?.keyword)}
      </div>
    </div>
  );
};

const ComparePanel: React.FC<{scene: RenderScene; reveal: number; versus: boolean}> = ({scene, reveal, versus}) => (
  <div style={{position: 'absolute', top: CONTENT_TOP, left: SAFE_LEFT, right: SAFE_RIGHT + 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
    {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => {
      const local = Math.max(0, Math.min(1, reveal * 1.35 - index * 0.2));
      return (
        <div key={`${label}-${index}`} style={{minHeight: 420, padding: '32px 28px', border: `2px solid ${WHITE}`, background: index === 1 ? WHITE : BLACK, color: index === 1 ? BLACK : WHITE, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: local, transform: `translateY(${(1 - local) * 24}px)`}}>
          <div style={{fontSize: 18, fontWeight: 900, letterSpacing: '0.08em'}}>{versus ? (index === 0 ? 'BEFORE' : 'AFTER') : `0${index + 1}`}</div>
          <div style={{fontSize: 54, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.055em', wordBreak: 'keep-all'}}>{label ?? ''}</div>
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

  return (
    <AbsoluteFill style={{background: BLACK, color: WHITE, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: BLACK, color: WHITE, fontFamily: 'Pretendard, Arial, sans-serif', overflow: 'hidden', transformOrigin: 'center center', ...transitionMotion(transition, frame, durationInFrames)}}>
        <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>

        {photo ? (
          <>
            <PhotoCover scene={scene} frame={frame} index={index} />
            <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.18) 36%, rgba(0,0,0,.86) 78%, rgba(0,0,0,.96) 100%)'}} />
          </>
        ) : null}

        <BlogChrome index={index} total={total} sourceTitle={sourceTitle} />

        {hasPresetVisual && !isCompare && !photo ? (
          <div style={{position: 'absolute', top: CONTENT_TOP, left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 22, height: layout === 'diagram-centered' ? 560 : 490, opacity: visualReveal, transform: `translateY(${(1 - visualReveal) * 20}px) scale(${0.985 + visualReveal * 0.015})`, transformOrigin: 'center center'}}>
            {scene.diagramSpec ? <DiagramRenderer spec={scene.diagramSpec} durationInFrames={durationInFrames} framesPath={scene.diagramFramesPath} /> : <PresetVisual visual={visual} camera={scene.camera} durationInFrames={durationInFrames} />}
          </div>
        ) : null}

        {isCompare ? <ComparePanel scene={scene} reveal={compareReveal} versus={layout === 'compare-versus'} /> : null}

        <div style={{position: 'absolute', left: SAFE_LEFT, width: SAFE_CONTENT_WIDTH - 20, bottom: SAFE_BOTTOM + (photo ? 150 : hasPresetVisual || isCompare ? 128 : 190), zIndex: 20}}>
          <div style={{fontSize: headlineSize(scene.headline, headlineBase), fontWeight: 900, lineHeight: 0.98, letterSpacing: '-0.065em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', textShadow: photo ? '0 4px 30px rgba(0,0,0,.58)' : 'none', opacity: headlineReveal, transform: `translateY(${headlineY}px)`}}>
            {scene.headline}
          </div>

          {scene.subline ? (
            <div style={{marginTop: 25, maxWidth: 720, fontSize: 31, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.04em', color: photo ? WHITE : GRAY, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', opacity: sublineReveal, transform: `translateY(${sublineY}px)`}}>
              {scene.subline}
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
