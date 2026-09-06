import {BLOG_URL} from '../scripts/blog-cta.mjs';
import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import type {SceneLayer} from './motion/SceneTransition';
import type {RenderScene} from './types';

// Stable copy throughout the spoken CTA; the parent handles the shared blur dissolve.
export const BlogCta: React.FC<{layer: SceneLayer; scene: RenderScene}> = ({layer, scene}) => (
  <AbsoluteFill style={{background: layer === 'visual' ? '#080808' : undefined, color: '#fff', fontFamily: 'Pretendard, Arial, sans-serif'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;}`}</style>
    {layer === 'text' && <div data-overlay-reserve="cta" style={{position: 'absolute', left: '50%', top: '50%', width: 864, transform: 'translate(-50%, -50%)', textAlign: 'center'}}>
      <div style={{fontSize: 100, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.035em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all'}}>{scene.headline}</div>
      <div style={{marginTop: 64, fontSize: 60, fontWeight: 600, lineHeight: 1.4, display: 'inline-block', borderBottom: '3px dotted #fff', paddingBottom: 12}}>{BLOG_URL}</div>
      <div style={{marginTop: 48}}><div style={{display: 'inline-block', padding: '24px 44px', background: '#fff', color: '#080808', fontSize: 48, fontWeight: 800, lineHeight: 1.3}}>{scene.subline}</div></div>
    </div>}
  </AbsoluteFill>
);
