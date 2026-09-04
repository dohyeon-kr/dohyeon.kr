import React from 'react';
import {Composition} from 'remotion';
import {ShortVideo} from './ShortVideo';
import type {RenderManifest} from './types';

const defaultProps: RenderManifest = {
  schemaVersion: 1,
  id: 'preview',
  status: 'candidate',
  source: {url: 'https://dohyeon.kr', title: 'dohyeon.kr'},
  candidate: {
    angle: 'reframe',
    hook: '생각을 짧게 보여주는 방법',
    title: 'Blog Shorts',
    rationale: 'Preview',
    viralScore: 0,
    suggestedCaption: '',
    hashtags: [],
  },
  style: {
    theme: 'monochrome-editorial',
    imagePlacement: 'upper-right',
    textPlacement: 'lower-left',
  },
  scenes: [
    {
      kind: 'hero',
      headline: '블로그의 한 문장을\n숏츠의 한 장면으로.',
      subline: 'dohyeon.kr',
      narration: '',
      imageQuery: null,
      comparisonLeft: null,
      comparisonRight: null,
      image: null,
      imagePath: null,
      audioPath: null,
      audioDurationSeconds: 4,
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ShortVideo"
    component={ShortVideo}
    durationInFrames={60 * 30}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
  />
);
