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
const INK = '#11110f';
const PAPER = '#f4f4f1';
const MUTED = '#666661';

// Keep meaningful content away from Shorts/Reels UI chrome.
// Full-bleed photos may extend underneath the UI because they are treated as background.
const SAFE_LEFT = 82;
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

const fontSizeFor = (text: string, base = 92) => {
  const compact = compactLength(text);
  if (compact > 42) return base - 30;
  if (compact > 32) return base - 20;
  if (compact > 24) return base - 10;
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

const fallbackTransition = (scene: RenderScene, index: number): SceneTransition => {
  if (scene.transition) return scene.transition;
  const defaults: SceneTransition[] = ['fade', 'slide-up', 'slide-left', 'fade', 'wipe'];
  return defaults[index % defaults.length];
};

const transitionMotion = (
  transition: SceneTransition,
  frame: number,
  durationInFrames: number,
): React.CSSProperties => {
  const enter = interpolate(frame, [0, 14], [0, 1], clampInterpolation);
  const exitStart = Math.max(14, durationInFrames - 10);
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], clampInterpolation);
  const opacity = transition === 'none' ? exit : enter * exit;

  if (transition === 'slide-up') {
    const y = interpolate(frame, [0, 16], [54, 0], clampInterpolation);
    return {opacity, transform: `translateY(${y}px)`};
  }
  if (transition === 'slide-left') {
    const x = interpolate(frame, [0, 16], [68, 0], clampInterpolation);
    return {opacity, transform: `translateX(${x}px)`};
  }
  if (transition === 'zoom') {
    const scale = interpolate(frame, [0, 18], [0.955, 1], clampInterpolation);
    return {opacity, transform: `scale(${scale})`};
  }
  if (transition === 'wipe') {
    const rightInset = interpolate(frame, [0, 18], [100, 0], clampInterpolation);
    return {opacity: exit, clipPath: `inset(0 ${rightInset}% 0 0)`};
  }
  return {opacity};
};

const MonochromePhoto: React.FC<{
  scene: RenderScene;
  style: React.CSSProperties;
  frame: number;
  index: number;
}> = ({scene, style, frame, index}) => {
  if (!scene.imagePath) return null;
  const scale = interpolate(frame, [0, 150], [1.055, 1.015], clampInterpolation);
  const x = interpolate(frame, [0, 150], [index % 2 === 0 ? -8 : 8, 0], clampInterpolation);

  return (
    <div style={{overflow: 'hidden', background: '#d9d9d4', ...style}}>
      <Img
        src={staticFile(scene.imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.12) brightness(0.9)',
          transform: `translateX(${x}px) scale(${scale})`,
        }}
      />
    </div>
  );
};

const DiagramVisual: React.FC<{visual: SceneVisual; reveal: number}> = ({visual, reveal}) => {
  const motif = visual.motif ?? 'generic';
  const common = {
    stroke: INK,
    fill: 'none',
    strokeWidth: 5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const body = (() => {
    switch (motif) {
      case 'roi-curve':
        return (
          <>
            <line x1="90" y1="520" x2="550" y2="520" {...common} />
            <line x1="90" y1="520" x2="90" y2="90" {...common} />
            <path
              d="M110 490 C210 478 280 430 335 350 C395 263 430 155 530 115"
              {...common}
              strokeWidth={9}
            />
            <circle cx="335" cy="350" r="10" fill={INK} />
            <text x="320" y="585" textAnchor="middle" fontSize="27" fill={MUTED}>
              {visual.xLabel ?? '투입'}
            </text>
            <text
              x="35"
              y="305"
              textAnchor="middle"
              fontSize="27"
              fill={MUTED}
              transform="rotate(-90 35 305)"
            >
              {visual.yLabel ?? '효용'}
            </text>
          </>
        );
      case 'balance-scale':
        return (
          <>
            <line x1="320" y1="120" x2="320" y2="475" {...common} strokeWidth={10} />
            <line x1="120" y1="205" x2="520" y2="175" {...common} strokeWidth={10} />
            <circle cx="320" cy="190" r="23" fill={PAPER} stroke={INK} strokeWidth="8" />
            <line x1="155" y1="203" x2="115" y2="355" {...common} />
            <line x1="475" y1="178" x2="520" y2="330" {...common} />
            <path d="M65 355 Q115 425 165 355 Z" fill="#deded8" stroke={INK} strokeWidth="5" />
            <path d="M470 330 Q520 400 570 330 Z" fill="#c7c7c0" stroke={INK} strokeWidth="5" />
            <path d="M250 500 L390 500 L320 430 Z" fill={INK} />
          </>
        );
      case 'target':
        return (
          <>
            {[205, 145, 85].map((r) => (
              <circle key={r} cx="315" cy="310" r={r} {...common} />
            ))}
            <circle cx="315" cy="310" r="20" fill={INK} />
            <line x1="515" y1="100" x2="338" y2="286" {...common} strokeWidth={11} />
            <path d="M515 100 L478 111 L504 137 Z" fill={INK} />
          </>
        );
      case 'compass':
      case 'arrow-path':
        return (
          <>
            <circle cx="315" cy="310" r="220" {...common} />
            <circle cx="315" cy="310" r="18" fill={INK} />
            <path d="M315 115 L370 320 L315 285 L260 320 Z" fill={INK} />
            <path
              d="M315 505 L270 305 L315 335 L360 305 Z"
              fill="#c8c8c2"
              stroke={INK}
              strokeWidth="4"
            />
            <text x="315" y="72" textAnchor="middle" fontSize="38" fontWeight="800" fill={INK}>
              N
            </text>
          </>
        );
      case 'magnifier':
        return (
          <>
            <circle cx="270" cy="260" r="155" {...common} strokeWidth={12} />
            <line x1="380" y1="375" x2="540" y2="535" {...common} strokeWidth={25} />
            <circle cx="270" cy="260" r="55" stroke="#aaa9a3" fill="none" strokeWidth="4" />
          </>
        );
      case 'leverage':
        return (
          <>
            <line x1="90" y1="390" x2="550" y2="265" {...common} strokeWidth={18} />
            <path d="M250 475 L390 475 L330 340 Z" fill="#cfcfc8" stroke={INK} strokeWidth="5" />
            <rect x="455" y="175" width="120" height="120" fill={INK} rx="8" />
            <rect x="65" y="345" width="70" height="70" fill="#bab9b2" stroke={INK} strokeWidth="5" rx="8" />
            <path d="M100 310 L100 235 M75 265 L100 235 L125 265" {...common} strokeWidth={8} />
          </>
        );
      case 'bookmark-stack':
        return (
          <>
            <rect x="120" y="110" width="370" height="420" fill="#deded8" stroke={INK} strokeWidth="6" rx="12" />
            <rect x="165" y="75" width="370" height="420" fill={PAPER} stroke={INK} strokeWidth="6" rx="12" />
            <path d="M430 75 L500 75 L500 240 L465 212 L430 240 Z" fill={INK} />
            {[165, 225, 285, 345].map((y, i) => (
              <line
                key={y}
                x1="220"
                y1={y}
                x2={i === 3 ? 405 : 455}
                y2={y}
                stroke="#9a9a94"
                strokeWidth="8"
                strokeLinecap="round"
              />
            ))}
          </>
        );
      case 'funnel':
        return (
          <>
            <path d="M80 120 H550 L400 345 V500 H235 V345 Z" fill="#deded8" stroke={INK} strokeWidth="7" />
            {[135, 205, 275, 345, 415, 485].map((x, i) => (
              <circle key={x} cx={x} cy={80 + (i % 2) * 15} r="15" fill={INK} />
            ))}
            <path d="M315 540 L315 585 M290 560 L315 585 L340 560" {...common} strokeWidth={8} />
          </>
        );
      case 'map-network':
      case 'network': {
        const nodes = [
          [120, 160],
          [310, 105],
          [500, 180],
          [205, 330],
          [420, 350],
          [300, 510],
        ];
        return (
          <>
            {[
              [0, 1],
              [1, 2],
              [0, 3],
              [1, 3],
              [1, 4],
              [2, 4],
              [3, 4],
              [3, 5],
              [4, 5],
            ].map(([a, b]) => (
              <line
                key={`${a}-${b}`}
                x1={nodes[a][0]}
                y1={nodes[a][1]}
                x2={nodes[b][0]}
                y2={nodes[b][1]}
                stroke="#8f8f89"
                strokeWidth="5"
              />
            ))}
            {nodes.map(([x, y], i) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r={i === 1 ? 34 : 24}
                fill={i === 1 ? INK : PAPER}
                stroke={INK}
                strokeWidth="7"
              />
            ))}
          </>
        );
      }
      case 'fork-road':
        return (
          <>
            <path d="M315 560 V360 C315 280 220 255 155 170" {...common} strokeWidth={20} />
            <path d="M315 360 C315 280 410 255 480 150" {...common} strokeWidth={20} />
            <path d="M125 205 L155 170 L175 215" {...common} strokeWidth={10} />
            <path d="M450 180 L480 150 L495 197" {...common} strokeWidth={10} />
          </>
        );
      case 'ranked-list':
        return (
          <>
            {[1, 2, 3].map((n, i) => (
              <g key={n}>
                <text
                  x="105"
                  y={175 + i * 145}
                  fontSize="68"
                  fontWeight="900"
                  fill={i === 0 ? INK : '#a6a69f'}
                >
                  {String(n).padStart(2, '0')}
                </text>
                <line
                  x1="220"
                  y1={150 + i * 145}
                  x2={530 - i * 50}
                  y2={150 + i * 145}
                  stroke={i === 0 ? INK : '#aaa9a3'}
                  strokeWidth="12"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </>
        );
      case 'ladder':
        return (
          <>
            <line x1="190" y1="520" x2="300" y2="90" {...common} strokeWidth={12} />
            <line x1="390" y1="520" x2="500" y2="90" {...common} strokeWidth={12} />
            {[450, 360, 270, 180].map((y, i) => (
              <line
                key={y}
                x1={210 + i * 20}
                y1={y}
                x2={410 + i * 20}
                y2={y}
                {...common}
                strokeWidth={10}
              />
            ))}
            <path d="M490 105 L530 75 L535 125" {...common} strokeWidth={9} />
          </>
        );
      case 'warning':
        return (
          <>
            <path d="M315 85 L570 530 H60 Z" fill="#deded8" stroke={INK} strokeWidth="9" />
            <line x1="315" y1="225" x2="315" y2="385" stroke={INK} strokeWidth="24" strokeLinecap="round" />
            <circle cx="315" cy="445" r="14" fill={INK} />
          </>
        );
      case 'hourglass':
        return (
          <>
            <rect x="155" y="80" width="320" height="35" fill={INK} rx="8" />
            <rect x="155" y="515" width="320" height="35" fill={INK} rx="8" />
            <path d="M190 115 C205 220 285 260 315 315 C345 260 425 220 440 115" {...common} strokeWidth={8} />
            <path d="M190 515 C205 410 285 370 315 315 C345 370 425 410 440 515" {...common} strokeWidth={8} />
            <path d="M250 445 Q315 375 380 445 Z" fill="#b8b8b1" />
          </>
        );
      case 'feedback-loop':
        return (
          <>
            <path d="M160 245 A185 185 0 0 1 480 215" {...common} strokeWidth={16} />
            <path d="M470 175 L500 220 L448 235" fill={INK} />
            <path d="M475 385 A185 185 0 0 1 155 415" {...common} strokeWidth={16} />
            <path d="M168 455 L135 410 L188 395" fill={INK} />
            <circle cx="315" cy="315" r="45" fill="#d0d0ca" stroke={INK} strokeWidth="7" />
          </>
        );
      default:
        return (
          <>
            <circle
              cx="315"
              cy="315"
              r="210"
              stroke="#b9b9b2"
              fill="none"
              strokeWidth="4"
              strokeDasharray="16 18"
            />
            <circle cx="315" cy="315" r="110" stroke={INK} fill="none" strokeWidth="8" />
            <circle cx="315" cy="315" r="22" fill={INK} />
          </>
        );
    }
  })();

  const scale = 0.94 + reveal * 0.06;
  return (
    <div style={{width: '100%', height: '100%', opacity: reveal, transform: `scale(${scale})`}}>
      <svg viewBox="0 0 630 630" width="100%" height="100%" style={{overflow: 'visible'}}>
        {body}
      </svg>
    </div>
  );
};

const CompareVisual: React.FC<{
  scene: RenderScene;
  reveal: number;
  versus: boolean;
}> = ({scene, reveal, versus}) => (
  <div
    style={{
      position: 'absolute',
      top: versus ? 315 : 260,
      left: SAFE_LEFT,
      right: SAFE_RIGHT + 24,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: versus ? 54 : 18,
      opacity: reveal,
    }}
  >
    {[scene.comparisonLeft, scene.comparisonRight].map((label, index) => (
      <div
        key={`${label}-${index}`}
        style={{
          minHeight: versus ? 470 : 500,
          padding: '40px 30px',
          borderTop: `${versus ? 8 : 3}px solid ${INK}`,
          borderBottom: '1px solid #8d8d89',
          display: 'flex',
          alignItems: 'flex-end',
          fontSize: versus ? 48 : 44,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.045em',
          background: versus && index === 1 ? '#deded8' : 'transparent',
        }}
      >
        {label ?? ''}
      </div>
    ))}
    {versus ? (
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 190,
          transform: 'translate(-50%, -50%)',
          fontSize: 42,
          fontWeight: 900,
          background: PAPER,
          padding: '12px 16px',
        }}
      >
        VS
      </div>
    ) : null}
  </div>
);

const CaptionOverlay: React.FC<{scene: RenderScene; fullBleed: boolean}> = ({scene, fullBleed}) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  const cue = scene.captions?.find(
    (item) => seconds >= item.startSeconds && seconds < item.endSeconds,
  );
  if (!cue) return null;

  const text = cue.text.replace(/\s+/g, ' ').trim();
  const length = compactLength(text);
  const fontSize = length > 19 ? 31 : length > 15 ? 34 : length > 11 ? 37 : 40;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_LEFT,
        right: SAFE_RIGHT + 24,
        bottom: SAFE_BOTTOM + 44,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: SAFE_CONTENT_WIDTH - 24,
          padding: '12px 20px 13px',
          borderRadius: 8,
          background: fullBleed ? 'rgba(17,17,15,.9)' : 'rgba(17,17,15,.86)',
          color: PAPER,
          fontSize,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.025em',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          wordBreak: 'keep-all',
          boxShadow: '0 4px 30px rgba(0,0,0,.08)',
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
  const reveal = interpolate(frame, [0, 14], [0, 1], clampInterpolation);
  const textY = interpolate(frame, [0, 14], [24, 0], clampInterpolation);
  const layout = fallbackLayout(scene);
  const visual = fallbackVisual(scene);
  const transition = fallbackTransition(scene, index);
  const fullBleed = layout === 'photo-full-bleed' && Boolean(scene.imagePath);
  const isCompare = layout === 'compare-columns' || layout === 'compare-versus';
  const visualAnchor = visual.type === 'diagram' || visual.type === 'symbol' || visual.type === 'number';
  const headerColor = fullBleed ? PAPER : INK;
  const secondaryColor = fullBleed ? 'rgba(244,244,241,.72)' : MUTED;

  const photo = (() => {
    if (!scene.imagePath || visual.type !== 'photo') return null;
    if (layout === 'photo-full-bleed') {
      return (
        <>
          <MonochromePhoto
            scene={scene}
            frame={frame}
            index={index}
            style={{position: 'absolute', inset: 0}}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(8,8,8,.08) 8%, rgba(8,8,8,.18) 46%, rgba(8,8,8,.8) 100%)',
            }}
          />
        </>
      );
    }
    if (layout === 'photo-split-left') {
      return (
        <MonochromePhoto
          scene={scene}
          frame={frame}
          index={index}
          style={{position: 'absolute', left: 0, top: 150, width: 420, height: 1040}}
        />
      );
    }
    if (layout === 'photo-strip') {
      return (
        <MonochromePhoto
          scene={scene}
          frame={frame}
          index={index}
          style={{position: 'absolute', left: SAFE_LEFT, top: 410, width: 760, height: 470}}
        />
      );
    }
    return (
      <MonochromePhoto
        scene={scene}
        frame={frame}
        index={index}
        style={{position: 'absolute', top: 205, left: 325, width: 515, height: 650}}
      />
    );
  })();

  const diagram = visualAnchor && !isCompare ? (
    <div
      style={{
        position: 'absolute',
        top: layout === 'diagram-centered' ? 230 : 325,
        left: layout === 'diagram-centered' ? 130 : 430,
        width: layout === 'diagram-centered' ? 650 : 390,
        height: layout === 'diagram-centered' ? 650 : 390,
      }}
    >
      {visual.type === 'number' ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 220,
            fontWeight: 900,
            letterSpacing: '-0.08em',
            opacity: reveal,
          }}
        >
          {visual.value ?? String(index + 1).padStart(2, '0')}
        </div>
      ) : (
        <DiagramVisual visual={visual} reveal={reveal} />
      )}
    </div>
  ) : null;

  const textStyle: React.CSSProperties = (() => {
    if (layout === 'photo-full-bleed') {
      return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 150, width: 750, color: PAPER};
    }
    if (layout === 'photo-split-left') {
      return {left: 470, bottom: SAFE_BOTTOM + 150, width: 370};
    }
    if (layout === 'statement-giant') {
      return {left: SAFE_LEFT, top: 360, width: 760};
    }
    if (layout === 'diagram-centered') {
      return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 135, width: 760};
    }
    if (layout === 'symbol-right') {
      return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 180, width: 430};
    }
    if (layout === 'outro-minimal') {
      return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 190, width: 760};
    }
    if (isCompare) {
      return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 130, width: 760};
    }
    return {left: SAFE_LEFT, bottom: SAFE_BOTTOM + 150, width: 720};
  })();

  const headlineBase =
    layout === 'statement-giant'
      ? 110
      : layout === 'photo-split-left'
        ? 68
        : layout === 'outro-minimal'
          ? 96
          : 86;

  return (
    <AbsoluteFill style={{background: PAPER, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: PAPER,
          color: INK,
          fontFamily: 'Pretendard, Arial, sans-serif',
          overflow: 'hidden',
          transformOrigin: 'center center',
          ...transitionMotion(transition, frame, durationInFrames),
        }}
      >
        <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;font-display:swap;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;font-display:swap;}`}</style>

        {photo}
        {diagram}
        {layout === 'compare-columns' ? (
          <CompareVisual scene={scene} reveal={reveal} versus={false} />
        ) : null}
        {layout === 'compare-versus' ? (
          <CompareVisual scene={scene} reveal={reveal} versus />
        ) : null}

        {!photo && !diagram && !isCompare && layout !== 'statement-giant' && layout !== 'outro-minimal' ? (
          <div
            style={{
              position: 'absolute',
              top: 270,
              left: 280,
              width: 540,
              height: 570,
              borderTop: `4px solid ${INK}`,
              borderBottom: '1px solid #9b9b96',
              opacity: reveal,
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 34,
                fontSize: 150,
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
            top: 76,
            left: SAFE_LEFT,
            width: 620,
            display: 'flex',
            gap: 18,
            alignItems: 'center',
            fontSize: 22,
            letterSpacing: '0.02em',
            color: secondaryColor,
            opacity: 0.9,
            zIndex: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <strong style={{color: headerColor}}>dohyeon.kr</strong>
          <span>•</span>
          <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{sourceTitle}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            top: 78,
            right: SAFE_RIGHT + 20,
            fontSize: 20,
            color: secondaryColor,
            letterSpacing: '0.08em',
            zIndex: 10,
          }}
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>

        <div
          style={{
            position: 'absolute',
            ...textStyle,
            transform: `translateY(${textY}px)`,
            opacity: reveal,
            zIndex: 12,
          }}
        >
          <div
            style={{
              fontSize: fontSizeFor(scene.headline, headlineBase),
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.055em',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              textShadow: fullBleed ? '0 3px 24px rgba(0,0,0,.24)' : 'none',
            }}
          >
            {scene.headline}
          </div>
          {scene.subline ? (
            <div
              style={{
                marginTop: 28,
                maxWidth: 700,
                fontSize: layout === 'photo-split-left' ? 25 : 28,
                lineHeight: 1.4,
                letterSpacing: '-0.025em',
                color: fullBleed ? 'rgba(244,244,241,.82)' : '#575752',
                whiteSpace: 'pre-wrap',
                wordBreak: 'keep-all',
              }}
            >
              {scene.subline}
            </div>
          ) : null}
        </div>

        <CaptionOverlay scene={scene} fullBleed={fullBleed} />

        <div
          style={{
            position: 'absolute',
            bottom: SAFE_BOTTOM + 16,
            left: SAFE_LEFT,
            width: SAFE_CONTENT_WIDTH - 30,
            height: 2,
            background: fullBleed ? 'rgba(244,244,241,.25)' : '#d0d0cb',
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: `${((index + 1) / total) * 100}%`,
              height: '100%',
              background: fullBleed ? PAPER : INK,
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
    <AbsoluteFill style={{background: PAPER}}>
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
