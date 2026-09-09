import {resolveTemplate} from '../src/templates/registry.ts';
import {renderPrompt} from './shorts-prompts.mjs';
import {withBlogCta, BLOG_CTA_ID} from './blog-cta.mjs';
import {createPhotoQueryRepair} from './repair-photo-query.mjs';
import {loadVideoCatalog, validateVideoSelection} from './video-assets.mjs';
import {validateBackgroundVideo} from '../src/video/schema.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import OpenAI from './shorts-openai.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';
import {CandidateSchema, SYSTEM_PROMPT, fetchPost, createDiagramRepair} from './generate-candidates.mjs';
import {SHORTS_EDITORIAL_POLICY} from './generation-input.mjs';
import {GeneratedPresenterSchema, normalizeGeneratedPresenter, validateScenePresenter} from '../src/presenter/schema.ts';
import {candidatePath, validateSelection, START, END} from './candidate-selection.mjs';
import {describeCandidate} from './describe-candidates.mjs';
import {createPhotoSearch, enrichVisuals} from './resolve-visuals.mjs';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {readReviewOriginal} from './load-storyboard.mjs';

export const ReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({scene: z.number().int().min(0), severity: z.enum(['high', 'medium', 'low']), problem: z.string(), improvement: z.string()})),
  limitations: z.array(z.string()),
});
const safeName = value => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
export async function resolveManifest(name) {
  if (!candidatePath.test(name || '') || name.split('/').some(x => x === '..' || x === '.')) throw new Error('Invalid candidate path');
  await validateSelection([name]);
  return JSON.parse(await fs.readFile(name, 'utf8'));
}
export function validateRevision(candidate, {deferDiagramValidation = false} = {}) {
  const sceneCount = candidate.scenes.length;
  if (!sceneCount) throw new Error('Expected at least one body scene');
  const compact = value => value.replace(/[\s\p{P}\p{S}]/gu, '');
  for (const [i, scene] of candidate.scenes.entries()) {
    validateScenePresenter({...scene,presenter:GeneratedPresenterSchema.safeParse(scene.presenter).success ? normalizeGeneratedPresenter(scene.presenter) : scene.presenter});
    validateBackgroundVideo(scene);
    if (compact(scene.narration) !== compact(scene.beats.map(b => b.text).join(''))) throw new Error(`Scene ${i + 1}: narration/beats mismatch`);
    if (scene.beats.some(b => b.keyword && !b.text.includes(b.keyword))) throw new Error(`Scene ${i + 1}: keyword absent from beat`);
    if (scene.camera.startProgress >= scene.camera.endProgress) throw new Error(`Scene ${i + 1}: invalid camera interval`);
    if (scene.visual.type === 'diagram') {
      if (!deferDiagramValidation) validateDiagram(scene.diagramSpec);
    }
    else if (scene.diagramSpec) throw new Error(`Scene ${i + 1}: unexpected diagram`);
  }
}
export async function frameInput(manifest, directory) {
  const prefix = `${safeName(path.basename(path.dirname(directory.manifest)))}-${safeName(manifest.id || path.basename(directory.manifest, '.json'))}`;
  const content = [];
  for (let i = 0; i < manifest.scenes.length; i++) {
    const stem = `${prefix}-scene-${String(i + 1).padStart(2, '0')}`;
    for (const phase of (manifest.scenes[i].diagramSpec || manifest.scenes[i].backgroundVideo || manifest.scenes[i].presenter != null) ? ['-initial', '-change', ''] : ['']) {
      const bytes = await fs.readFile(path.join(directory.frames, prefix, `${stem}${phase}.png`));
      content.push({type: 'input_text', text: `장면 ${i + 1}, ${phase || 'result'}`},
        {type: 'input_image', image_url: `data:image/png;base64,${bytes.toString('base64')}`, detail: 'high'});
    }
  }
  return content;
}
async function photoInventory(exclude) {
  const inventory = [];
  for (const entry of await fs.readdir('shorts/content', {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    for (const name of await fs.readdir(`shorts/content/${entry.name}`)) {
      const filename = `shorts/content/${entry.name}/${name}`;
      if (!/^candidate-\d+\.json$/.test(name) || filename === exclude) continue;
      const manifest = JSON.parse(await fs.readFile(filename, 'utf8'));
      manifest.scenes.forEach((s, i) => {if (s.image?.originalUrl || s.backgroundVideo) inventory.push({file: filename, scene: i + 1, image: s.image ?? null, backgroundVideo: s.backgroundVideo ?? null});});
    }
  }
  return inventory;
}
export async function resolveReviewVisuals(candidate, original, {client, model, reportDir, search = createPhotoSearch(), ...options}) {
  const existing = new Map(original.scenes.filter(s => s.image).map(s => [(s.visual?.query || s.imageQuery)?.trim(), s.image]));
  const checkpoint = {title: candidate.title, status: 'processing', scenes: structuredClone(candidate.scenes), history: []};
  const save = () => fs.writeFile(path.join(reportDir, 'visual-repair.json'), JSON.stringify(checkpoint, null, 2) + '\n');
  await save();
  const deadline = Date.now() + 40 * 60_000;
  try {
    const resolved = await enrichVisuals(candidate, {
      ...options,
      repairDiagram: createDiagramRepair(client, {model, deadline}),
      repairPhoto: options.repairPhoto ?? createPhotoQueryRepair(client, {model, deadline}),
      photoFailureMode: 'throw',
      search: async query => existing.get(query) || await search(query),
      onProgress: async event => {
        checkpoint.scenes[event.sceneNumber - 1] = event.scene;
        checkpoint.history.push({status: event.status, sceneNumber: event.sceneNumber, errors: event.history});
        await save();
      },
    });
    if (resolved.scenes.some(s => s.visualResolution?.status === 'fallback')) throw new Error('Visual resolution failed; refusing to silently remove visuals');
    validateRevision(resolved);
    checkpoint.status = 'validated';
    await save();
    return resolved;
  } catch (error) {
    checkpoint.status = 'failed';
    checkpoint.error = error.message;
    await save();
    throw error;
  }
}

async function main() {
  const [mode, filename] = process.argv.slice(2);
  await resolveManifest(filename);
  if (mode === 'validate') return;
  if (mode !== 'improve') throw new Error('Usage: review-storyboard.mjs validate|improve <candidate-path>');
  const comment = process.env.REVIEW_COMMENT || '';
  if (comment.length > 12000) throw new Error('Review comment exceeds 12000 characters');
  const reportDir = process.env.REVIEW_OUTPUT_DIR;
  if (!reportDir) throw new Error('REVIEW_OUTPUT_DIR is required');
  const {original, provenance} = await readReviewOriginal(filename, reportDir);
  const template = resolveTemplate(original);
  const policy = await fs.readFile('shorts/docs/creative-system.md', 'utf8');
  const narrationPolicy = JSON.stringify(SHORTS_EDITORIAL_POLICY, null, 2);
  const post = await fetchPost(original.source.url);
  const inventory = await photoInventory(filename);
  const frames = await frameInput(original, {manifest: filename, frames: path.join(reportDir, 'before')});
  const client = new OpenAI({timeout: 240000, maxRetries: 2});
  const model = process.env.SHORTS_REVIEW_MODEL || process.env.SHORTS_TEXT_MODEL || 'gpt-5.6-sol';
  const videoCatalog = await loadVideoCatalog();
  const context = JSON.stringify({post, original, comment, otherCandidatePhotos: inventory, availableVideos: videoCatalog});
  const reviewResponse = await client.responses.parse({model, store: false,
    instructions: renderPrompt('storyboard-review', {systemPrompt: SYSTEM_PROMPT, narrationPolicy, creativePolicy: policy, templateInstructions: template.instructions}),
    input: [{role: 'user', content: [{type: 'input_text', text: context}, ...frames]}],
    text: {format: zodTextFormat(ReviewSchema, 'storyboard_review')},
  });
  if (!reviewResponse.output_parsed) throw new Error('Review refused or incomplete');
  const review = reviewResponse.output_parsed;
  await fs.writeFile(path.join(reportDir, 'review.json'), JSON.stringify(review, null, 2));
  const response = await client.responses.parse({model, store: false,
    instructions: renderPrompt('storyboard-improve', {systemPrompt: SYSTEM_PROMPT, narrationPolicy, creativePolicy: policy, templateInstructions: template.instructions}),
    input: JSON.stringify({context: {...JSON.parse(context), original: {...original, scenes: original.scenes.filter(s => s.commonPage !== BLOG_CTA_ID)}}, review}),
    text: {format: zodTextFormat(CandidateSchema, 'improved_storyboard')},
  });
  if (!response.output_parsed) throw new Error('Improvement refused or incomplete');
  const candidate = CandidateSchema.parse(response.output_parsed);
  validateRevision(candidate, {deferDiagramValidation: true});
  candidate.scenes.forEach(scene => validateVideoSelection(scene, videoCatalog));
  const resolved = await resolveReviewVisuals(candidate, original, {client, model, reportDir});
  const firstPhoto = resolved.scenes[0]?.image?.originalUrl;
  if (firstPhoto && inventory.some(p => p.image?.originalUrl === firstPhoto)) throw new Error('Opening photo duplicates another candidate; choose a different query in the review comment');
  const {scenes, ...metadata} = resolved;
  const improved = withBlogCta({...original, status: 'candidate', candidate: metadata, scenes});
  await fs.writeFile(filename, JSON.stringify(improved, null, 2) + '\n');
  await fs.writeFile(filename.replace(/\.json$/, '.md'), describeCandidate(improved, path.basename(filename)));
  const report = ['# 스토리보드 AI 리뷰', '', `대상: \`${filename}\``, '', `모델: ${model}`, '',
    `검토한 스토리보드: ${provenance.releaseUrl}`, '', `원본 JSON 커밋: ${provenance.sourceCommit}`, '',
    '## 코멘트', '', comment ? comment.split('\n').map(l => `> ${l}`).join('\n') : '없음 — 기본 품질 기준으로 리뷰', '',
    review.summary, '', ...review.issues.map(x => `- 장면 ${x.scene || '전체'} / ${x.severity}: ${x.problem}\n  개선 제안: ${x.improvement}`), '',
    '## 확인 범위', '', '발행된 스토리보드의 기존 장면 이미지를 재렌더 없이 AI가 검토했습니다. 수정 후 프레임은 Actions 아티팩트에서 직접 검토하세요. AI 제안은 모든 항목의 해결을 보장하지 않습니다.', '',
    ...review.limitations.map(x => `- ${x}`), '', START, `- [x] \`${filename}\``, END, '',
    '병합 후 선택한 후보의 스토리보드를 다시 생성합니다. 최종 영상 렌더는 별도 승인합니다.', ''];
  const runUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  report.push(`[수정 전후 장면 이미지 다운로드](${runUrl})`, '');
  await fs.writeFile(path.join(reportDir, 'review.md'), report.join('\n'));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
