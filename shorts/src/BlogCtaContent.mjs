import {createElement as h} from 'react';
import {BLOG_URL} from '../scripts/blog-cta.mjs';

export const BLOG_CTA_BACKGROUND = '#080808';

// One presentation for Remotion and server-rendered HyperFrames HTML.
// Keep this component free of frame/player hooks so both engines use identical DOM.
export function BlogCtaContent({scene}) {
  return h('div', {
    'data-overlay-reserve': 'cta',
    style: {position: 'absolute', left: '50%', top: '50%', width: 864,
      transform: 'translate(-50%, -50%)', textAlign: 'center', color: '#fff',
      fontFamily: 'BlogCtaPretendard, Arial, sans-serif'},
  },
  h('div', {style: {fontSize: 100, fontWeight: 800, lineHeight: 1.25,
    letterSpacing: '-0.035em', whiteSpace: 'pre-wrap', wordBreak: 'keep-all'}}, scene.headline),
  h('div', {style: {marginTop: 64, fontSize: 60, fontWeight: 600, lineHeight: 1.4,
    display: 'inline-block', borderBottom: '3px dotted #fff', paddingBottom: 12}}, BLOG_URL),
  h('div', {style: {marginTop: 48}},
    h('div', {style: {display: 'inline-block', padding: '24px 44px', background: '#fff',
      color: BLOG_CTA_BACKGROUND, fontSize: 48, fontWeight: 800, lineHeight: 1.3}}, scene.subline)));
}

// Isolate the existing CTA font files from each renderer's body typography.
// fontUrl is supplied by the renderer, never by candidate content.
export function BlogCtaFontFaces({fontUrl}) {
  return h('style', null,
    `@font-face{font-family:BlogCtaPretendard;src:url('${fontUrl('fonts/Pretendard-Bold.woff')}') format('woff');font-weight:700 900;font-style:normal;} @font-face{font-family:BlogCtaPretendard;src:url('${fontUrl('fonts/Pretendard-Regular.woff')}') format('woff');font-weight:300 600;font-style:normal;}`);
}
