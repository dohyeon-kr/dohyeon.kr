import {readFileSync} from 'node:fs';
export const normalizeAdditionalRequest = (value = '') => {
  if (typeof value !== 'string') throw new TypeError('Additional request must be text.');
  if (value.length > 4000) throw new Error('Additional request must be at most 4000 characters.');
  return value.trim();
};

export const SHORTS_EDITORIAL_POLICY = JSON.parse(readFileSync(new URL('../prompts/editorial-policy.json', import.meta.url), 'utf8'));

export const buildGenerationInput = (post, count, additionalRequest = '') => {
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Candidate count must be an integer from 3 to 8.');
  return JSON.stringify({
    task: readFileSync(new URL('../prompts/generation-task.md', import.meta.url), 'utf8'),
    candidateCount: count,
    editorialPolicy: SHORTS_EDITORIAL_POLICY,
    editorialRequest: normalizeAdditionalRequest(additionalRequest),
    sourceArticle: {title: post.title, url: post.url, body: post.body},
  });
};
