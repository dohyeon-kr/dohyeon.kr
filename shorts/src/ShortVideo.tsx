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
import type {RenderManifest, RenderScene} from './types';

const FPS = 30;
const MIN_SCENE_SECONDS = 2.2;
const SCENE_TAIL_SECONDS = 0.28;

const sceneFrames = (scene: RenderScene) =>
  Math.max(
    Math.round(MIN_SCENE_SECONDS * FPS),
    Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS),
  );

const fontSizeFor = (text: string) => {
  const compact = text.replace(/\s/g, '').length;
  if (compact > 38) return 64;
  if (compact > 28) return 72;
  if (compact > 20) return 82;
  return 92;
};

const CompareVisual: React.FC<{scene: RenderScene; opacity: number}> = ({scene, opacity}) => (
  <div
    style={{
      position: 'absolute',
      top: 250,
      right: 84,
      width: 760,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 20,
      opacity,
    }}
  >
    {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => (
      <div
        key={`${label}-${index}`}
        style={{
          minHeight: 520,
          padding: '44px 34px',
          borderTop: '3px solid #111',
          borderBottom: '1px solid #8d8d89',
          display: 'flex',
          alignItems: 'flex-end',
          fontSize: 52,
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: '-0.045em',
        }}
      >
        {label ?? ''}
      </div>
    ))}
  </div>
);

const SceneFrame: React.FC<{
  scene: RenderScene;
  index: number;
  total: number;
  sourceTitle: string;
}> = ({scene, index, total, sourceTitle}) => {
  const frame = useCurrentFrame();
  const entrance = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const imageScale = interpolate(frame, [0, 90], [1.045, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [0, 14], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hasPhoto = scene.imagePath && (scene.kind === 'photo' || scene.kind === 'hero');

  return (
    <AbsoluteFill
      style={{
        background: '#f4f4f1',
        color: '#11110f',
        fontFamily: 'Pretendard, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <style>{`@font-face{font-family:Pretendard;src:url('${staticFile(
        'fonts/Pretendard-Bold.woff',
      )}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile(
        'fonts/Pretendard-Regular.woff',
      )}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>

      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 82,
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          fontSize: 22,
          letterSpacing: '0.02em',
          color: '#4c4c49',
          opacity: 0.8,
        }}
      >
        <strong style={{color: '#11110f'}}>dohyeon.kr</strong>
        <span>•</span>
        <span>{sourceTitle}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 78,
          right: 82,
          fontSize: 20,
          color: '#6c6c68',
          letterSpacing: '0.08em',
        }}
      >
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>

      {hasPhoto ? (
        <div
          style={{
            position: 'absolute',
            top: 205,
            right: 72,
            width: 700,
            height: 760,
            overflow: 'hidden',
            background: '#d9d9d4',
            opacity: entrance,
          }}
        >
          <Img
            src={staticFile(scene.imagePath as string)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'grayscale(1) contrast(1.12) brightness(0.9)',
              transform: `scale(${imageScale})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(10,10,10,0.07))',
            }}
          />
        </div>
      ) : null}

      {scene.kind === 'compare' ? <CompareVisual scene={scene} opacity={entrance} /> : null}

      {!hasPhoto && scene.kind !== 'compare' ? (
        <div
          style={{
            position: 'absolute',
            top: 270,
            right: 94,
            width: 640,
            height: 620,
            borderTop: '4px solid #11110f',
            borderBottom: '1px solid #9b9b96',
            opacity: entrance,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 34,
              fontSize: 160,
              lineHeight: 0.86,
              fontWeight: 800,
              letterSpacing: '-0.07em',
              color: '#deded9',
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 82,
          bottom: 190,
          width: 870,
          transform: `translateY(${textY}px)`,
          opacity: entrance,
        }}
      >
        <div
          style={{
            fontSize: fontSizeFor(scene.headline),
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.055em',
            whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all',
          }}
        >
          {scene.headline}
        </div>
        {scene.subline ? (
          <div
            style={{
              marginTop: 34,
              maxWidth: 760,
              fontSize: 30,
              lineHeight: 1.45,
              letterSpacing: '-0.025em',
              color: '#575752',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
            }}
          >
            {scene.subline}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 78,
          left: 82,
          width: 916,
          height: 2,
          background: '#d0d0cb',
        }}
      >
        <div
          style={{
            width: `${((index + 1) / total) * 100}%`,
            height: '100%',
            background: '#11110f',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const ShortVideo: React.FC<RenderManifest> = ({source, scenes}) => {
  let cursor = 0;

  return (
    <AbsoluteFill>
      {scenes.map((scene, index) => {
        const durationInFrames = sceneFrames(scene);
        const from = cursor;
        cursor += durationInFrames;

        return (
          <Sequence key={`${index}-${scene.headline}`} from={from} durationInFrames={durationInFrames}>
            <SceneFrame scene={scene} index={index} total={scenes.length} sourceTitle={source.title} />
            {scene.audioPath ? <Html5Audio src={staticFile(scene.audioPath)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
