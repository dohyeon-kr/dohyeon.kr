export const normalizeAdditionalRequest = (value = '') => {
  if (typeof value !== 'string') throw new TypeError('Additional request must be text.');
  if (value.length > 4000) throw new Error('Additional request must be at most 4000 characters.');
  return value.trim();
};

export const buildGenerationInput = (post, count, additionalRequest = '') => {
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Candidate count must be an integer from 3 to 8.');
  return JSON.stringify({
    task: '서로 겹치지 않는 숏츠 후보를 지정된 수만큼 생성한다. 각 장면의 semantic beat, 강조 리듬, visual relation/strategy, layout, choreography, camera, transition을 완성한다.',
    candidateCount: count,
    editorialRequest: normalizeAdditionalRequest(additionalRequest),
    sourceArticle: {title: post.title, url: post.url, body: post.body},
  });
};
