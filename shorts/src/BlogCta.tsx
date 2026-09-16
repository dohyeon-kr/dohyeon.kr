import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {BlogCtaContent, BlogCtaFontFaces, BLOG_CTA_BACKGROUND} from './BlogCtaContent.mjs';
import type {SceneLayer} from './motion/SceneTransition';
import type {RenderScene} from './types';

// Stable copy throughout the spoken CTA; the parent handles the shared blur dissolve.
export const BlogCta: React.FC<{layer: SceneLayer; scene: RenderScene}> = ({layer, scene}) => (
  <AbsoluteFill style={{background: layer === 'visual' ? BLOG_CTA_BACKGROUND : undefined, color: '#fff', fontFamily: 'Pretendard, Arial, sans-serif'}}>
    <BlogCtaFontFaces fontUrl={staticFile} />
    {layer === 'text' && <BlogCtaContent scene={scene} />}
  </AbsoluteFill>
);
