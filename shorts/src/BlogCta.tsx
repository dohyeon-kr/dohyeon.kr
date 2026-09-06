import {BLOG_URL} from '../scripts/blog-cta.mjs';
import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import type {SceneLayer} from './motion/SceneTransition';
import type {RenderScene} from './types';

// Stable copy throughout the spoken CTA; the parent handles the shared fade.
export const BlogCta: React.FC<{layer: SceneLayer; scene: RenderScene}> = ({layer, scene}) => (
  <AbsoluteFill style={{background: layer === 'visual' ? '#080808' : undefined, color: '#fff', fontFamily: 'Pretendard, Arial, sans-serif'}}>
    <style>{`@font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;} @font-face{font-family:Pretendard;src:url('${staticFile('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;}`}</style>
    {layer === 'text' && <div style={{position: 'absolute', left: 88, top: 580, width: 790}}>
      <div style={{fontSize: 78, fontWeight: 800, lineHeight: 1.28, letterSpacing: '-0.035em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all'}}>{scene.headline}</div>
      <div style={{marginTop: 64, fontSize: 48, fontWeight: 600, lineHeight: 1.4}}>{BLOG_URL}</div>
      <div style={{marginTop: 32, fontSize: 38, lineHeight: 1.4, color: '#bdbdbd'}}>{scene.subline}</div>
    </div>}
  </AbsoluteFill>
);
