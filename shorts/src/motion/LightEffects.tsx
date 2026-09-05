import React, {useId} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {flowPoint} from './flow-path';
import {effectState, type LightEffect} from './schema';

const tint = (color: string, alpha: number) => `${color}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}`;

// Effects operate on geometry/photos only; diagram labels live above this surface.
export const LightEffects: React.FC<{effects?: LightEffect[] | null; bounds?: {x: number; y: number; width: number; height: number}; children?: React.ReactNode}> = ({effects, children, bounds}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const id = `light-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const active = (effects ?? []).map((effect, i) => ({effect, i, ...effectState(effect, frame, fps)})).filter(e => e.opacity > 0 && e.effect.type !== 'flow-glow');
  const sweep = bounds ?? {x: 0, y: 0, width: 800, height: 560};
  const sweepWidth = sweep.width * .4;
  const filters = active.filter(({effect}) => ['glow', 'bloom', 'rim-light', 'light-sweep'].includes(effect.type));
  return <AbsoluteFill style={{isolation: 'isolate'}}>
    <svg width={0} height={0} style={{position: 'absolute'}}><defs>
      {filters.map(({effect: e, i, opacity, progress}) => <filter key={i} id={`${id}-${i}`} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
        {e.type === 'light-sweep' ? <>
          <feImage href={`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560"><defs><linearGradient id="g"><stop stop-color="white" stop-opacity="0"/><stop offset=".5" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><rect x="${sweep.x - sweepWidth + progress * (sweep.width + sweepWidth * 2)}" y="-200" width="${sweepWidth}" height="960" fill="url(#g)" transform="rotate(15 ${sweep.x + sweep.width / 2} ${sweep.y + sweep.height / 2})"/></svg>`)}`} x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="band" />
          <feComposite in="band" in2="SourceAlpha" operator="in" result="mask" />
        </> : e.type === 'rim-light' ? <>
          <feMorphology in="SourceAlpha" operator="dilate" radius={Math.max(1, (e.radius ?? 16) / 6)} result="expanded" />
          <feComposite in="expanded" in2="SourceAlpha" operator="out" result="edge" />
          <feGaussianBlur in="edge" stdDeviation={2} result="mask" />
        </> : <>
          <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="luma" />
          <feComponentTransfer in="luma" result="bright"><feFuncA type="linear" slope={e.type === 'bloom' ? 4 : 2} intercept={e.type === 'bloom' ? -2.8 : -.8} /></feComponentTransfer>
          <feGaussianBlur in="bright" stdDeviation={e.radius ?? (e.type === 'bloom' ? 22 : 10)} result="mask" />
        </>}
        <feFlood floodColor={e.color} floodOpacity={opacity} result="ink" />
        <feComposite in="ink" in2="mask" operator="in" result="light" />
        <feBlend in="SourceGraphic" in2="light" mode="screen" />
      </filter>)}
    </defs></svg>
    <AbsoluteFill style={{filter: filters.length ? filters.map(({i}) => `url(#${id}-${i})`).join(' ') : undefined}}>{children}</AbsoluteFill>
    {active.filter(({effect}) => !['glow', 'bloom', 'rim-light', 'light-sweep'].includes(effect.type)).map(({effect: e, i, progress, opacity}) => {
      const x = (e.origin?.[0] ?? .3) * 100;
      const y = (e.origin?.[1] ?? .35) * 100;
      const white = e.color;
      let background = '';
      switch (e.type) {
        case 'light-leak': background = `radial-gradient(ellipse at ${Math.sin(e.seed + progress * 2) * 12}% ${25 + progress * 35}%, ${white} 0%, ${tint(white, .35)} 30%, transparent 72%)`; break;
        case 'light-streak': background = `radial-gradient(ellipse 48% 1.2% at ${x}% ${y}%, ${white} 0%, ${tint(white, .6)} 25%, transparent 100%)`; break;
        case 'glint': background = `radial-gradient(ellipse 5% .45% at ${x}% ${y}%, ${white}, transparent), radial-gradient(ellipse .35% 7% at ${x}% ${y}%, ${white}, transparent), radial-gradient(circle at ${x}% ${y}%, ${white}, transparent 4%)`; break;
        case 'lens-flare': background = `radial-gradient(circle at ${x}% ${y}%, ${white}, transparent 13%), radial-gradient(ellipse 55% .5% at ${x}% ${y}%, ${white}, transparent), ${[.35, .65, 1].map((d, j) => `radial-gradient(circle at ${x + (100 - 2 * x) * d}% ${y + (100 - 2 * y) * d}%, transparent ${2 + j}%, ${tint(white, .4)} ${3 + j}%, transparent ${4 + j}%)`).join(', ')}`; break;
        case 'spotlight': background = `radial-gradient(ellipse 38% 45% at ${x}% ${y}%, transparent 35%, #000 100%)`; break;
        case 'light-rays': background = `repeating-conic-gradient(from ${-20 + progress * 4}deg at ${x}% ${y}%, transparent 0deg 12deg, ${tint(white, .5)} 15deg, transparent 19deg 32deg)`; break;
      }
      return <AbsoluteFill key={i} data-effect={e.type} style={{pointerEvents: 'none', opacity, background, mixBlendMode: e.type === 'spotlight' ? 'normal' : 'screen', maskImage: e.type === 'light-rays' ? `radial-gradient(ellipse at ${x}% ${y}%, #000, transparent 75%)` : undefined}} />;
    })}
  </AbsoluteFill>;
};

export const FlowGlow: React.FC<{effect: LightEffect; points: [number, number][]; opacity?: number}> = ({effect, points, opacity: nodeOpacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const id = `pulse-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const state = effectState(effect, frame, fps);
  if (state.opacity === 0) return null;
  const [x, y] = flowPoint(points, state.progress);
  const length = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
  const tail = (effect.trailLength ?? 38) / Math.max(1, length);
  return <g data-effect="flow-glow" opacity={state.opacity * nodeOpacity}>
    <defs><radialGradient id={id}><stop offset="0" stopColor={effect.color} stopOpacity={.85} /><stop offset=".35" stopColor={effect.color} stopOpacity={.28} /><stop offset="1" stopColor={effect.color} stopOpacity={0} /></radialGradient></defs>
    {Array.from({length: 7}, (_, i) => {const t = state.progress - tail * i / 7; if (t < 0 || i === 0) return null; const [tx, ty] = flowPoint(points, t); return <circle key={i} cx={tx} cy={ty} r={(effect.coreRadius ?? 4) * (1 - i / 9)} fill={effect.color} opacity={(1 - i / 7) * .5} />;})}
    <circle cx={x} cy={y} r={effect.radius ?? 28} fill={`url(#${id})`} />
    <circle cx={x} cy={y} r={effect.coreRadius ?? 4} fill={effect.color} />
  </g>;
};
