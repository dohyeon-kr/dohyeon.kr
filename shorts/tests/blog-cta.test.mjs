import test from 'node:test';
import assert from 'node:assert/strict';
import {withBlogCta, BLOG_CTA_ID} from '../scripts/blog-cta.mjs';

test('preserves the original conclusion and appends exactly one common page', () => {
  for (const length of [6, 9, 18, 21]) {
    const original = {source: {url: 'https://blog.dohyeon.kr/post'}, scenes: Array.from({length}, (_, i) => ({kind: 'outro', headline: `결론 ${i}`}))};
    const copy = structuredClone(original);
    const result = withBlogCta(original);
    assert.deepEqual(original, copy);
    assert.deepEqual(result.scenes.slice(0, -1), original.scenes);
    assert.equal(result.scenes.length, length + 1);
    assert.equal(result.scenes.at(-1).commonPage, BLOG_CTA_ID);
    assert.deepEqual(withBlogCta(result), result);
  }
});
test('repairs duplicate or edited common pages without losing editorial scenes', () => {
  const result = withBlogCta({scenes: [{commonPage: BLOG_CTA_ID, narration: 'edited'}, {headline: '본문 결론'}, {commonPage: BLOG_CTA_ID}]});
  assert.equal(result.scenes.length, 2);
  assert.equal(result.scenes[0].headline, '본문 결론');
  assert.equal(result.scenes[1].narration, result.scenes[1].beats.map(b => b.text).join(' '));
});
