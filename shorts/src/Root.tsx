import React from 'react';
import {Composition} from 'remotion';
import {ShortVideo} from './ShortVideo';
import type {RenderManifest} from './types';

const defaultProps: RenderManifest = {
  schemaVersion: 2,
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
    visualDensity: 'high',
    subtitles: 'burned-in',
    safeArea: 'shorts-reels',
  },
  scenes: [
    {
      kind: 'statement',
      layout: 'diagram-centered',
      transition: 'wipe',
      visual: {
        type: 'diagram',
        motif: 'roi-curve',
        query: null,
        value: null,
        xLabel: '투입 시간',
        yLabel: '학습 효용',
      },
      headline: '좋은 설명은\n생각을 보이게 만든다.',
      subline: '사진이 없으면 도식으로 보여준다',
      narration: '추상적인 생각은 사진보다 도식이 더 정확할 때가 있습니다.',
      imageQuery: null,
      comparisonLeft: null,
      comparisonRight: null,
      image: null,
      imagePath: null,
      audioPath: null,
      audioDurationSeconds: 4,
      captions: [
        {startSeconds: 0, endSeconds: 2, text: '추상적인 생각은'},
        {startSeconds: 2, endSeconds: 4, text: '도식이 더 정확할 때가 있습니다.'},
      ],
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
