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
test('long headings fit the copy region and vertical lines keep their height', () => {
  const fitted = fitCopy('반복되는 마찰은\n방식을 돌아보라는 신호다', 808, 210, 98);
  assert.ok(fitted.text.split('\n').length * fitted.fontSize * 1.12 <= 210);
  assert.deepEqual(linePoints({width: 2, height: 220}), [[0, -110], [0, 110]]);
  const label = nodeLabel({shape: 'rect', label: '애플리케이션 상태', width: 190, height: 70});
  assert.ok(label.fontSize < 28 || label.text.includes('\n'));
});
