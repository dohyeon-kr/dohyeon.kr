import test from 'node:test';
import assert from 'node:assert/strict';
import {subtitleAt} from '../src/subtitles.ts';
import {fitCopy} from '../src/text-layout.ts';
import {linePoints, nodeLabel} from '../src/visuals/node-layout.ts';
test('semantic pauses hold their caption instead of flashing a legacy cue', () => {
  const scene = {beats: [{text: '첫 번째 의미', keyword: '의미'}, {text: '두 번째 의미'}], beatTimings: [{startSeconds: 0, endSeconds: 1}, {startSeconds: 1.3, endSeconds: 2}], captions: [{text: '작은 대체 자막', startSeconds: 0, endSeconds: 3}]};
  assert.equal(subtitleAt(scene, .99).text, '첫 번째 의미');
  assert.equal(subtitleAt(scene, 1.15).text, '첫 번째 의미');
  assert.equal(subtitleAt(scene, 1.3).text, '두 번째 의미');
  assert.equal(subtitleAt(scene, 2.1).text, '두 번째 의미');
});
test('final audio timeline preserves semantic beat emphasis and keyword metadata', () => {
  const scene = {
    audioPath: 'generated/scene-01.mp3',
    beats: [
      {text: '첫 번째 의미', keyword: '의미', emphasis: 'high', pauseAfterMs: 120, delivery: 'hold'},
      {text: '두 번째 의미', keyword: null, emphasis: 'mid', pauseAfterMs: 0, delivery: 'normal'},
    ],
    captions: [
      {text: '첫 번째', startSeconds: .2, endSeconds: .8},
      {text: '의미 두 번째', startSeconds: .8, endSeconds: 1.8},
      {text: '의미', startSeconds: 1.8, endSeconds: 2.2},
    ],
  };
  const first = subtitleAt(scene, .6);
  assert.equal(first.text, '첫 번째 의미');
  assert.equal(first.keyword, '의미');
  assert.equal(first.emphasis, 'high');
  assert.equal(subtitleAt(scene, 1.1).text, '첫 번째 의미');
  assert.equal(subtitleAt(scene, 1.3).text, '두 번째 의미');
});
test('final audio captions still fall back to measured cue text when editorial text cannot be reconciled', () => {
  const scene = {
    audioPath: 'generated/scene-01.mp3',
    beats: [{text: '편집용 문구', pauseAfterMs: 0, delivery: 'normal'}],
    captions: [
      {text: '실제 낭독 첫 구간', startSeconds: .35, endSeconds: 1.2},
      {text: '실제 낭독 다음 구간', startSeconds: 1.2, endSeconds: 2.4},
    ],
  };
  assert.equal(subtitleAt(scene, .2), null);
  assert.equal(subtitleAt(scene, .4).text, '실제 낭독 첫 구간');
  assert.equal(subtitleAt(scene, 1.5).text, '실제 낭독 다음 구간');
});
test('long headings fit the copy region and vertical lines keep their height', () => {
  const fitted = fitCopy('반복되는 마찰은\n방식을 돌아보라는 신호다', 808, 210, 98);
  assert.ok(fitted.text.split('\n').length * fitted.fontSize * 1.12 <= 210);
  assert.deepEqual(linePoints({width: 2, height: 220}), [[0, -110], [0, 110]]);
  assert.throws(() => nodeLabel({id: 'long', shape: 'rect', label: '애플리케이션 상태', width: 190, height: 70}), /label-padding/);
  assert.ok(nodeLabel({id: 'long', shape: 'rect', label: '애플리케이션 상태', width: 240, height: 140}).fontSize >= 24);
});

