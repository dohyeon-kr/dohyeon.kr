import {createHmac} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {FEATURE_PROMPT, FeaturePlanSchema, validateFeaturePlan} from './feature-image-plan.mjs';

export function ghostToken(key, now = Date.now()) {
  const [id, secret, extra] = (key || '').split(':');
  if (extra || !/^[a-f0-9]{24}$/i.test(id || '') || !/^[a-f0-9]{64}$/i.test(secret || '')) throw new Error('Invalid GHOST_ADMIN_API_KEY');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const timestamp = Math.floor(now / 1000);
  const unsigned = `${encode({alg: 'HS256', typ: 'JWT', kid: id})}.${encode({iat: timestamp, exp: timestamp + 300, aud: '/admin/'})}`;
  return `${unsigned}.${createHmac('sha256', Buffer.from(secret, 'hex')).update(unsigned).digest('base64url')}`;
}
export class GhostClient {
  constructor({url, key, fetchImpl = fetch}) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('GHOST_URL must be an HTTPS site URL');
    this.base = `${parsed.href.replace(/\/$/, '')}/ghost/api/admin/`;
    this.key = key;
    this.fetch = fetchImpl;
  }
  async request(endpoint, {method = 'GET', body, form = false} = {}) {
    const response = await this.fetch(this.base + endpoint, {
      method, redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: {Authorization: `Ghost ${ghostToken(this.key)}`, 'Accept-Version': 'v6.0', ...(form ? {} : {'Content-Type': 'application/json'})},
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
    if (!response.ok) {
      const error = new Error(`Ghost API ${method} failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
  async getPost(id) {
    if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error('Invalid post ID');
    const result = await this.request(`posts/${id}/?formats=html`);
    if (!result.posts?.[0]) throw new Error('Ghost returned no post');
    return result.posts[0];
  }
  async candidates(since, limit = 5) {
    if (!since || !Number.isFinite(Date.parse(since))) throw new Error('GHOST_FEATURE_IMAGES_SINCE must be an explicit ISO date');
    const filter = `feature_image:null+created_at:>='${new Date(since).toISOString()}'+status:[draft,published,scheduled]`;
    const posts = [];
    let page = 1;
    do {
      const query = new URLSearchParams({formats: 'html', filter, order: 'created_at desc', limit: '50', page: String(page)});
      const result = await this.request(`posts/?${query}`);
      for (const post of result.posts ?? []) {
        if (eligible(post)) posts.push(post);
        if (posts.length === limit) return posts;
      }
      page = result.meta?.pagination?.next;
    } while (page);
    return posts;
  }
  async upload(file) {
    const form = new FormData();
    form.set('file', new Blob([await readFile(file)], {type: 'image/png'}), path.basename(file));
    form.set('purpose', 'image');
    const result = await this.request('images/upload/', {method: 'POST', body: form, form: true});
    const url = result.images?.[0]?.url;
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Ghost returned no HTTPS image URL');
    return url;
  }
  async attach(post, image, alt) {
    // Never send status, title, HTML or lexical. updated_at is Ghost's collision guard.
    return this.request(`posts/${post.id}/`, {method: 'PUT', body: {posts: [{updated_at: post.updated_at, feature_image: image, feature_image_alt: alt}]}});
  }
}

export function postText(post) {
  return (post.html || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export function eligible(post, now = Date.now()) {
  return !post.feature_image && ['draft', 'published', 'scheduled'].includes(post.status)
    && Boolean(post.title?.trim()) && postText(post).length >= 80
    && Number.isFinite(Date.parse(post.updated_at)) && now - Date.parse(post.updated_at) >= 120_000;
}
const unchanged = (before, after) => !after.feature_image && before.title === after.title && before.html === after.html;

export async function processPost(post, {ghost, planPost, render, outputDir, apply = false, now = Date.now()}) {
  if (!eligible(post, now)) return {id: post.id, status: 'skipped'};
  const plan = validateFeaturePlan(await planPost({title: post.title, text: postText(post).slice(0, 24_000)}));
  await mkdir(outputDir, {recursive: true});
  const file = path.join(outputDir, `${post.id}.png`);
  await render(plan, file);
  await writeFile(path.join(outputDir, `${post.id}.json`), JSON.stringify(plan, null, 2));
  if (!apply) return {id: post.id, status: 'preview', file};
  let current = await ghost.getPost(post.id);
  if (!unchanged(post, current)) return {id: post.id, status: 'changed-during-render'};
  const image = await ghost.upload(file);
  current = await ghost.getPost(post.id);
  if (!unchanged(post, current)) return {id: post.id, status: 'changed-during-upload'};
  try {
    await ghost.attach(current, image, plan.description);
  } catch (error) {
    if ([409, 422].includes(error.status)) return {id: post.id, status: 'edit-conflict'};
    throw error;
  }
  const saved = await ghost.getPost(post.id);
  if (saved.feature_image !== image) throw new Error('Feature image attachment could not be verified');
  return {id: post.id, status: 'attached', file};
}

async function main() {
  const ghost = new GhostClient({url: process.env.GHOST_URL || 'https://blog.dohyeon.kr', key: process.env.GHOST_ADMIN_API_KEY});
  const posts = process.env.GHOST_POST_ID ? [await ghost.getPost(process.env.GHOST_POST_ID)] : await ghost.candidates(process.env.GHOST_FEATURE_IMAGES_SINCE);
  if (!posts.some(post => eligible(post))) { console.log('No eligible posts without a feature image.'); return; }
  const [{default: OpenAI}, {zodTextFormat}, {renderFeatureImage}] = await Promise.all([import('openai'), import('openai/helpers/zod'), import('./render-feature-image.mjs')]);
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 1});
  const planPost = async post => {
    const response = await client.responses.parse({model: process.env.SHORTS_TEXT_MODEL || 'gpt-5.6-sol', reasoning: {effort: 'low'}, instructions: FEATURE_PROMPT, input: JSON.stringify(post), text: {format: zodTextFormat(FeaturePlanSchema, 'blog_feature_diagram')}, max_output_tokens: 3000});
    if (!response.output_parsed) throw new Error('No feature image plan returned');
    return response.output_parsed;
  };
  let failed = false;
  for (const post of posts) {
    try {
      console.log(JSON.stringify(await processPost(post, {ghost, planPost, render: renderFeatureImage, outputDir: process.env.FEATURE_IMAGE_OUTPUT_DIR || path.resolve(import.meta.dirname, '../output/feature-images'), apply: process.argv.includes('--apply')})));
    } catch (error) {
      failed = true;
      // Avoid logging API responses or draft content in public Actions logs.
      console.error(`Feature image failed for post ${post.id} (${error.name || 'Error'}). Re-run a preview to diagnose.`);
    }
  }
  if (failed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
