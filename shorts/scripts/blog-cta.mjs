export const BLOG_CTA_ID = 'blog-cta-v1';
export const BLOG_URL = 'blog.dohyeon.kr';

export function createBlogCta() {
  const texts = ['더 자세한 이야기는', '블로그에 정리했습니다.', '프로필 링크에서 읽어보세요.'];
  return {
    commonPage: BLOG_CTA_ID,
    kind: 'outro', layout: 'outro-minimal', transition: 'fade',
    headline: '더 자세한 이야기는\n블로그에서',
    subline: '프로필 링크에서 읽기',
    narration: texts.join(' '),
    beats: texts.map(text => ({text, emphasis: 'mid', delivery: 'normal', pauseAfterMs: 160,
      visualPriority: 'high', keyword: null, visualCue: null})),
    visual: {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null},
    camera: {motion: 'static', target: 'center', intensity: 'subtle', startProgress: 0, endProgress: 1},
    choreography: [], imageQuery: null, image: null, comparisonLeft: null, comparisonRight: null,
  };
}

// Preserve the editorial conclusion; replace only our explicitly marked common page.
export function withBlogCta(manifest) {
  return {...manifest, scenes: [...manifest.scenes.filter(scene => scene.commonPage !== BLOG_CTA_ID), createBlogCta()]};
}
