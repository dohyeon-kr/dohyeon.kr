import React from 'react';
import {Composition, registerRoot, staticFile} from 'remotion';
import {DiagramRenderer} from './visuals/DiagramRenderer';
import {featureDiagram} from '../scripts/feature-image-plan.mjs';

export const FeatureImage = ({plan}: {plan: {title: string[]; relationship: string; labels: string[][]; description: string}}) => (
  <div style={{width: '100%', height: '100%', background: '#080808', color: '#fff', fontFamily: 'Pretendard', padding: '72px 80px', boxSizing: 'border-box'}}>
    <style>{`@font-face {font-family: Pretendard; src: url('${staticFile('fonts/Pretendard-Bold.woff')}'); font-weight: 700;}`}</style>
    <div style={{fontSize: 64, fontWeight: 700, lineHeight: 1.5, height: 192}}>{plan.title.map((line, i) => <div key={i}>{line}</div>)}</div>
    <div style={{height: 560, width: '100%'}}><DiagramRenderer spec={featureDiagram(plan)} durationInFrames={1} strict /></div>
  </div>
);
registerRoot(() => <Composition id="FeatureImage" component={FeatureImage} width={1600} height={900} fps={30} durationInFrames={1} defaultProps={{plan: {title: ['판단을 규칙으로', '릴스 자동화를 만든 과정'], relationship: 'sequence', labels: [['문제 발견'], ['판단을', '규칙으로'], ['검증과', '자동 수정']], description: '문제 발견에서 판단의 규칙화, 검증과 자동 수정으로 이어지는 릴스 제작 과정'}}} />);
