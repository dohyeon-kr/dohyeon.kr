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
const BLACK = '#050505';
const WHITE = '#ffffff';
const GRAY = '#8a8a8a';
const DARK_GRAY = '#242424';

const SAFE_LEFT = 64;
const SAFE_RIGHT = 188;
const SAFE_BOTTOM = 370;
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
    return {
      type: 'photo',
      motif: null,
      query: scene.imageQuery,
      value: null,
      xLabel: null,
      yLabel: null,
    };
  }
  if (scene.kind === 'compare') {
    return {
      type: 'diagram',
      motif: 'compare',
      query: null,
      value: null,
      xLabel: null,
      yLabel: null,
    };
  }
  return {
    type: 'none',
    motif: null,
    query: null,
    value: null,
    xLabel: null,
    yLabel: null,
  };
};

const fallbackLayout = (scene: RenderScene, visual: SceneVisual): SceneLayout => {
  // Photos always use one cover template. Legacy photo layouts are intentionally normalized.
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

const PhotoCover: React.FC<{
  scene: RenderScene;
  frame: number;
  index: number;
}> = ({scene, frame, index}) => {
  const scale = interpolate(frame, [0, 180], [1.08, 1.02], clampInterpolation);
  const x = interpolate(frame, [0, 180], [index % 2 === 0 ? -12 : 12, 0], clampInterpolation);

  if (!scene.imagePath) {
    return (
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(135deg, #111 0%, #111 32%, #313131 32%, #313131 58%, #151515 58%, #151515 100%)',
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: BLACK}}>
      <Img
        src={staticFile(scene.imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.2) brightness(0.72)',
          transform: `translateX(${x}px) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

const BlogChrome: React.FC<{index: number; total: number; sourceTitle: string; inverted?: boolean}> = ({
  index,
  total,
  sourceTitle,
  inverted = false,
}) => {
  const foreground = inverted ? BLACK : WHITE;
  const background = inverted ? WHITE : BLACK;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 58,
          left: SAFE_LEFT,
          right: SAFE_RIGHT + 18,
          zIndex: 20,
          color: foreground,
        }}
      >
        <div style={{fontSize: 46, fontWeight: 900, letterSpacing: '-0.055em', lineHeight: 1}}>DLOG</div>
        <div style={{marginTop: 20, fontSize: 20, fontWeight: 900, letterSpacing: '-0.025em'}}>
          PROBLEMS BEFORE TECHNOLOGY
        </div>
        <div style={{height: 2, marginTop: 24, background: foreground}} />
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: '0.07em',
          }}
        >
          <span>SHORT / LATEST</span>
          <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </div>
        <div
          style={{
            marginTop: 13,
            display: 'inline-block',
            maxWidth: 610,
            padding: '7px 11px 8px',
            background,
            color: foreground,
            border: `2px solid ${foreground}`,
            fontSize: 16,
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sourceTitle}
        </div>
      </div>
    </>
  );
};

const CaptionOverlay: React.FC<{scene: RenderScene; photo: boolean}> = ({scene, photo}) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const cue = scene.captions?.find(
    (item) => seconds >= item.startSeconds && seconds < item.endSeconds,
  );
  if (!cue) return null;

  const text = cue.text.replace(/\s+/g, ' ').trim();
  const length = compactLength(text);
  const fontSize = length > 19 ? 30 : length > 15 ? 34 : length > 11 ? 38 : 42;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_LEFT,
        right: SAFE_RIGHT + 20,
        bottom: SAFE_BOTTOM + 46,
        display: 'flex',
        justifyContent: 'flex-start',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: SAFE_CONTENT_WIDTH - 18,
          padding: '12px 17px 13px',
          border: `2px solid ${photo ? BLACK : WHITE}`,
          borderRadius: 0,
          background: WHITE,
          color: BLACK,
          fontSize,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: '-0.045em',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const ComparePanel: React.FC<{scene: RenderScene; reveal: number; versus: boolean}> = ({scene, reveal, versus}) => (
  <div
    style={{
      position: 'absolute',
      top: 360,
      left: SAFE_LEFT,
      right: SAFE_RIGHT + 22,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,
      opacity: reveal,
    }}
  >
    {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => (
      <div
        key={`${label}-${index}`}
        style={{
          minHeight: 420,
          padding: '32px 28px',
          border: `2px solid ${WHITE}`,
          background: index === 1 ? WHITE : BLACK,
          color: index === 1 ? BLACK : WHITE,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{fontSize: 18, fontWeight: 900, letterSpacing: '0.08em'}}>
          {versus ? (index === 0 ? 'A / BEFORE' : 'B / AFTER') : `0${index + 1}`}
        </div>
        <div
          style={{
            fontSize: 54,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: '-0.055em',
            wordBreak: 'keep-all',
          }}
        >
          {label ?? ''}
        </div>
      </div>
    ))}
  </div>
);

const SceneFrame: React.FC<{
  scene: RenderScene;
  index: number;
  total: number;
  sourceTitle: string;
  durationInFrames: number;
}> = ({scene, index, total, sourceTitle, durationInFrames}) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 14], [0, 1], clampInterpolation);
  const textY = interpolate(frame, [0, 15], [28, 0], clampInterpolation);
  const visual = fallbackVisual(scene);
  const layout = fallbackLayout(scene, visual);
  const transition = fallbackTransition(scene, index);
  const photo = visual.type === 'photo';
  const isCompare = layout === 'compare-columns' || layout === 'compare-versus';
  const hasPresetVisual = visual.type === 'diagram' || visual.type === 'symbol' || visual.type === 'number';

  const headlineBase =
    layout === 'statement-giant'
      ? 150
      : layout === 'outro-minimal'
        ? 140
        : photo
          ? 136
          : 126;

  return (
    <AbsoluteFill style={{background: BLACK, color: WHITE, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: BLACK,
          color: WHITE,
          fontFamily: 'Pretendard, Arial, sans-serif',
          overflow: 'hidden',
          transformOrigin: 'center center',
          ...transitionMotion(transition, frame, durationInFrames),
        }}
      >
        <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>

        {photo ? (
          <>
            <PhotoCover scene={scene} frame={frame} index={index} />
            <AbsoluteFill
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.18) 36%, rgba(0,0,0,.86) 78%, rgba(0,0,0,.96) 100%)',
              }}
            />
          </>
        ) : null}

        <BlogChrome index={index} total={total} sourceTitle={sourceTitle} />

        {hasPresetVisual && !isCompare && !photo ? (
          <div
            style={{
              position: 'absolute',
              top: 338,
              left: SAFE_LEFT,
              width: SAFE_CONTENT_WIDTH - 22,
              height: layout === 'diagram-centered' ? 560 : 490,
              opacity: reveal,
            }}
          >
            <PresetVisual visual={visual} />
          </div>
        ) : null}

        {layout === 'compare-columns' ? <ComparePanel scene={scene} reveal={reveal} versus={false} /> : null}
        {layout === 'compare-versus' ? <ComparePanel scene={scene} reveal={reveal} versus /> : null}

        <div
          style={{
            position: 'absolute',
            left: SAFE_LEFT,
            width: SAFE_CONTENT_WIDTH - 20,
            bottom: SAFE_BOTTOM + (photo ? 150 : hasPresetVisual || isCompare ? 128 : 190),
            transform: `translateY(${textY}px)`,
            opacity: reveal,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              marginBottom: 22,
              padding: '7px 10px 8px',
              border: `2px solid ${WHITE}`,
              background: photo ? WHITE : BLACK,
              color: photo ? BLACK : WHITE,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            {scene.kind.toUpperCase()} / {visual.motif?.toUpperCase() ?? visual.type.toUpperCase()}
          </div>

          <div
            style={{
              fontSize: headlineSize(scene.headline, headlineBase),
              fontWeight: 900,
              lineHeight: 0.98,
              letterSpacing: '-0.065em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              textShadow: photo ? '0 4px 30px rgba(0,0,0,.58)' : 'none',
            }}
          >
            {scene.headline}
          </div>

          {scene.subline ? (
            <div
              style={{
                marginTop: 25,
                maxWidth: 720,
                fontSize: 31,
                fontWeight: 800,
                lineHeight: 1.18,
                letterSpacing: '-0.04em',
                color: photo ? WHITE : GRAY,
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
              }}
            >
              {scene.subline}
            </div>
          ) : null}
        </div>

        <CaptionOverlay scene={scene} photo={photo} />

        <div
          style={{
            position: 'absolute',
            bottom: SAFE_BOTTOM + 16,
            left: SAFE_LEFT,
            width: SAFE_CONTENT_WIDTH - 28,
            height: 3,
            background: DARK_GRAY,
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: `${((index + 1) / total) * 100}%`,
              height: '100%',
              background: WHITE,
            }}
          />
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
          <Sequence
            key={`${index}-${scene.headline}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneFrame
              scene={scene}
              index={index}
              total={scenes.length}
              sourceTitle={source.title}
              durationInFrames={durationInFrames}
            />
            {scene.audioPath ? <Html5Audio src={staticFile(scene.audioPath)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
