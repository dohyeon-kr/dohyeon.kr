import React, {useId} from 'react';
import {AbsoluteFill, Freeze, useCurrentFrame, useVideoConfig} from 'remotion';
import {transitionProgress, type SceneTransition, type TransitionOptions} from './schema';

export type SceneLayer = 'visual' | 'text';
type Props = {type: SceneTransition; options?: TransitionOptions | null; durationInFrames: number; previousFrames?: number; previous?: (layer: SceneLayer) => React.ReactNode; current: (layer: SceneLayer) => React.ReactNode};

// Visual handles hold the previous end frame. Audio and scene offsets never overlap.
export const SceneTransitionStage: React.FC<Props> = ({type, options, durationInFrames, previousFrames, previous, current}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const id = `transition-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = type === 'none' || type === 'match-cut' ? 1 : transitionProgress(frame, fps, durationInFrames, options ?? undefined);
  const strength = options?.intensity ?? .35;
  const origin = options?.origin ?? [.5, .5];
  const direction = options?.direction ?? 'left';
  const vertical = direction === 'up' || direction === 'down';
  const sign = direction === 'right' || direction === 'down' ? -1 : 1;
  const old: React.CSSProperties = {};
  const next: React.CSSProperties = {};
  let overlay: React.ReactNode = null;
  const blur = Math.sin(Math.PI * p) * (8 + strength * 24);
  const fade = () => {next.opacity = p;};
  const wipe = () => {next.clipPath = vertical ? `inset(${direction === 'down' ? (1 - p) * 100 : 0}% 0 ${direction === 'up' ? (1 - p) * 100 : 0}% 0)` : `inset(0 ${direction === 'left' ? (1 - p) * 100 : 0}% 0 ${direction === 'right' ? (1 - p) * 100 : 0}%)`;};
  switch (type) {
    case 'none': case 'match-cut': break;
    case 'fade': case 'cross-dissolve': fade(); break;
    case 'slide-up': fade(); next.transform = `translateY(${(1 - p) * 44}px)`; break;
    case 'slide-left': fade(); next.transform = `translateX(${(1 - p) * 56}px)`; break;
    case 'zoom': fade(); next.transform = `scale(${.96 + .04 * p})`; break;
    case 'wipe': wipe(); break;
    case 'blur-dissolve': case 'defocus-refocus':
      fade(); old.filter = next.filter = `blur(${blur * (type === 'defocus-refocus' ? 1.5 : 1)}px)`;
      old.transform = next.transform = `scale(${1 + .035 * Math.sin(Math.PI * p)})`; break;
    case 'directional-blur':
      fade(); old.filter = next.filter = `url(#${id}-blur)`;
      next.transform = `translate${vertical ? 'Y' : 'X'}(${sign * (1 - p) * 65}px)`; break;
    case 'zoom-blur': fade(); break;
    case 'dip-to-black': case 'dip-to-white':
      old.opacity = Math.max(0, 1 - 2 * p); next.opacity = Math.max(0, 2 * p - 1); break;
    case 'push':
      old.transform = `translate${vertical ? 'Y' : 'X'}(${-sign * p * 100}%)`;
      next.transform = `translate${vertical ? 'Y' : 'X'}(${sign * (1 - p) * 100}%)`; break;
    case 'iris-reveal': next.clipPath = `circle(${p * 150}% at ${origin[0] * 100}% ${origin[1] * 100}%)`; break;
    case 'luma-wipe': {
      // A procedural grayscale matte, revealed in luminance order.
      const threshold = p * 140 - 20;
      next.maskImage = `linear-gradient(125deg, #000 ${threshold}%, transparent ${threshold + 20}%)`;
      break;
    }
    case 'light-wipe':
      wipe(); overlay = <AbsoluteFill style={{opacity: Math.sin(Math.PI * p) * .65, background: `linear-gradient(${vertical ? 0 : 90}deg, transparent ${p * 100 - 12}%, white ${p * 100}%, transparent ${p * 100 + 12}%)`, mixBlendMode: 'screen'}} />; break;
    case 'light-leak-transition': case 'film-burn':
      fade(); overlay = <AbsoluteFill style={{opacity: Math.sin(Math.PI * p) * (type === 'film-burn' ? .95 : .6), background: type === 'film-burn' ? `radial-gradient(ellipse at ${p * 110}% ${30 + Math.sin(p * 9) * 20}%, white 5%, #ddd 20%, transparent 65%), radial-gradient(ellipse at ${100 - p * 100}% 90%, #fff 0%, transparent 55%)` : `radial-gradient(ellipse at ${p * 80}% 20%, white 0%, transparent 72%)`, mixBlendMode: 'screen'}} />; break;
    default: {const unreachable: never = type; throw new Error(`Unsupported transition: ${unreachable}`);}
  }
  const oldFrame = (layer: SceneLayer) => previous ? <Freeze frame={Math.max(0, (previousFrames ?? 1) - 1)}>{previous(layer)}</Freeze> : null;
  const visual = (content: React.ReactNode, style: React.CSSProperties) => type === 'zoom-blur' && p > 0 && p < 1 ? (
    <AbsoluteFill style={style}>{Array.from({length: 6}, (_, i) => <AbsoluteFill key={i} style={{opacity: 1 / (i + 1), transform: `scale(${1 + i * .015 * Math.sin(Math.PI * p) * (1 + strength)})`, transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%`}}>{content}</AbsoluteFill>)}</AbsoluteFill>
  ) : <AbsoluteFill style={style}>{content}</AbsoluteFill>;
  return <AbsoluteFill style={{overflow: 'hidden', background: type === 'dip-to-white' ? '#fff' : '#050505'}}>
    <svg width={0} height={0}><defs><filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={vertical ? `0 ${blur}` : `${blur} 0`} /></filter></defs></svg>
    {p < 1 && visual(oldFrame('visual'), old)}
    {visual(current('visual'), next)}
    {p < 1 ? overlay : null}
    {p < 1 && <AbsoluteFill style={{...old, filter: undefined, opacity: Math.min(1 - p, Number(old.opacity ?? 1))}}>{oldFrame('text')}</AbsoluteFill>}
    <AbsoluteFill style={{...next, filter: undefined, opacity: Math.min(p, Number(next.opacity ?? 1))}}>{current('text')}</AbsoluteFill>
  </AbsoluteFill>;
};
