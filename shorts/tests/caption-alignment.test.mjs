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
  const aligned = alignBeatTimings(beats, words);
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

test('transcription spelling differences fall back to measured word boundaries, never character-time estimates', () => {
  const beats = [{text: '5분이면 끝납니다.'}, {text: '그래도 자동화합니다.'}];
  const words = [
    {word: '오분이면', start: .1, end: .7},
    {word: '끝납니다.', start: .75, end: 1.18},
    {word: '그래도', start: 1.4, end: 1.75},
    {word: '자동화합니다.', start: 1.8, end: 2.5},
  ];
  const aligned = alignBeatTimings(beats, words);
  assert.equal(aligned.method, 'proportional');
  assert.equal(aligned.timings[0].startSeconds, .1);
  assert.equal(aligned.timings.at(-1).endSeconds, 2.5);
  assert.ok(aligned.timings.every((timing) => words.some((word) => word.start === timing.startSeconds)));
  assert.ok(aligned.timings.every((timing) => words.some((word) => word.end === timing.endSeconds)));
});
