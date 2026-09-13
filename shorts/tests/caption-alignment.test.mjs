import test from 'node:test';
import assert from 'node:assert/strict';
import {alignBeatTimings, captionsFromBeatTimings} from '../scripts/caption-alignment.mjs';

test('semantic beats use exact measured word boundaries when transcript text matches', () => {
  const beats = [
    {text: '자동화는 시간을 줄이는 일이 아니라'},
    {text: '누락 지점을 줄이는 일입니다.'},
  ];
  const words = [
    {word: '자동화는', start: .12, end: .62},
    {word: '시간을', start: .7, end: 1.02},
    {word: '줄이는', start: 1.08, end: 1.42},
    {word: '일이', start: 1.48, end: 1.68},
    {word: '아니라', start: 1.72, end: 2.08},
    {word: '누락', start: 2.34, end: 2.62},
    {word: '지점을', start: 2.67, end: 2.98},
    {word: '줄이는', start: 3.04, end: 3.38},
    {word: '일입니다.', start: 3.44, end: 3.92},
  ];
  const aligned = alignBeatTimings(beats, words, 4.05);
  assert.equal(aligned.method, 'exact');
  assert.deepEqual(aligned.timings, [
    {startSeconds: .12, endSeconds: 2.08},
    {startSeconds: 2.34, endSeconds: 3.92},
  ]);
  assert.deepEqual(captionsFromBeatTimings(beats, aligned.timings), [
    {text: beats[0].text, startSeconds: .12, endSeconds: 2.08},
    {text: beats[1].text, startSeconds: 2.34, endSeconds: 3.92},
  ]);
});

test('minor transcription spelling differences may use measured proportional word boundaries', () => {
  const beats = [{text: '5분이면 끝납니다.'}, {text: '그래도 자동화합니다.'}];
  const words = [
    {word: '오분이면', start: .1, end: .7},
    {word: '끝납니다.', start: .75, end: 1.18},
    {word: '그래도', start: 1.4, end: 1.75},
    {word: '자동화합니다.', start: 1.8, end: 2.5},
  ];
  const aligned = alignBeatTimings(beats, words, 2.6);
  assert.equal(aligned.method, 'proportional');
  assert.equal(aligned.timings[0].startSeconds, .1);
  assert.equal(aligned.timings.at(-1).endSeconds, 2.5);
  assert.ok(aligned.timings.every((timing) => words.some((word) => word.start === timing.startSeconds)));
  assert.ok(aligned.timings.every((timing) => words.some((word) => word.end === timing.endSeconds)));
});

test('late clustered word timestamps fall back to continuous semantic beat timing', () => {
  const beats = [
    {text: '그래서 판매 내역만 한 번 입력하게 만들었습니다.', delivery: 'push'},
    {text: '재고, 매출, 정산은 함수로 따라오게 했습니다.', delivery: 'normal'},
    {text: '빨라진 것보다 중요한 건 옮겨 적을 곳이 줄었다는 점입니다.', delivery: 'hold'},
  ];
  const words = [
    {word: '그래서', start: 6.9, end: 7.15},
    {word: '판매', start: 7.18, end: 7.42},
    {word: '내역만', start: 7.44, end: 7.75},
    {word: '한', start: 7.78, end: 7.9},
    {word: '번', start: 7.92, end: 8.05},
    {word: '입력하게', start: 8.08, end: 8.5},
    {word: '만들었습니다.', start: 8.52, end: 9.1},
    {word: '재고', start: 9.25, end: 9.48},
    {word: '매출', start: 9.5, end: 9.72},
    {word: '정산은', start: 9.74, end: 10.05},
    {word: '함수로', start: 10.08, end: 10.4},
    {word: '따라오게', start: 10.42, end: 10.82},
    {word: '했습니다.', start: 10.85, end: 11.2},
    {word: '빨라진', start: 11.35, end: 11.65},
    {word: '것보다', start: 11.68, end: 11.95},
    {word: '중요한', start: 11.98, end: 12.28},
    {word: '건', start: 12.3, end: 12.42},
    {word: '옮겨', start: 12.44, end: 12.66},
    {word: '적을', start: 12.68, end: 12.9},
    {word: '곳이', start: 12.92, end: 13.12},
    {word: '줄었다는', start: 13.14, end: 13.55},
    {word: '점입니다.', start: 13.58, end: 13.95},
  ];
  const aligned = alignBeatTimings(beats, words, 14.1);
  assert.equal(aligned.method, 'estimated');
  assert.equal(aligned.timings[0].startSeconds, 0);
  assert.ok(aligned.timings[0].endSeconds < aligned.timings[1].endSeconds);
  assert.ok(aligned.timings[1].endSeconds < aligned.timings[2].endSeconds);
  assert.ok(aligned.timings.at(-1).endSeconds > 13.8);
});

test('bad transcript coverage does not create a several-second blank caption lead-in', () => {
  const beats = [{text: '첫 문장입니다.'}, {text: '두 번째 문장입니다.'}];
  const words = [
    {word: '두', start: 4.8, end: 5.0},
    {word: '번째', start: 5.02, end: 5.3},
    {word: '문장입니다.', start: 5.32, end: 6.0},
  ];
  const aligned = alignBeatTimings(beats, words, 6.2);
  assert.equal(aligned.method, 'estimated');
  assert.equal(aligned.timings[0].startSeconds, 0);
});
