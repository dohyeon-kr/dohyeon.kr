import {NotebookUiMotionSchema} from '../src/visuals/notebook-ui-motion-schema.ts';
import {getTemplate} from '../src/templates/registry.ts';
import {SYSTEM_PROMPT, VISUAL_SYSTEM_PROMPT, renderPrompt} from './shorts-prompts.mjs';
import {withBlogCta} from './blog-cta.mjs';
import {GeneratedPresenterSchema} from '../src/presenter/schema.ts';
import {BackgroundVideoSchema} from '../src/video/schema.ts';
import {loadVideoCatalog} from './video-assets.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import OpenAI from './shorts-openai.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';
import {DiagramSpecSchema} from '../src/visuals/diagram-spec.ts';
import {TRANSITIONS} from '../src/motion/schema.ts';
import {GeneratedLightEffectSchema, GeneratedTransitionOptionsSchema} from './generated-motion-schema.mjs';
import {validateSceneMotion} from '../src/motion/validate.ts';
import {GeneratedDiagramEventSchema} from './generated-diagram-schema.mjs';
import {enrichVisuals} from './resolve-visuals.mjs';

import {normalizeAdditionalRequest} from './generation-input.mjs';
import {generateInStages} from './generation-stages.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const allowedHosts = new Set(['dohyeon.kr', 'www.dohyeon.kr', 'blog.dohyeon.kr']);

const LAYOUTS = [
  'presenter-bust',
  'photo-top-right',
  'photo-full-bleed',
  'photo-split-left',
  'photo-strip',
  'diagram-centered',
  'symbol-right',
  'statement-giant',
  'statement-offset',
  'compare-columns',
  'compare-versus',
  'outro-minimal',
];

const RELATION_TYPES = [
  'literal',
  'comparison',
  'change-over-time',
  'small-input-large-output',
  'accumulation',
  'bottleneck',
  'convergence',
  'divergence',
  'flow',
  'balance',
  'zoom-depth',
  'network-growth',
];
const STRATEGY_TYPES = [
  'simulation',
  'graph',
  'spatial-diagram',
  'physical-metaphor',
  'photo',
  'icon',
  'number',
  'minimal',
];
const CAMERA_MOTIONS = ['static', 'push-in', 'pull-out', 'zoom', 'pan-left', 'pan-right'];
const CAMERA_TARGETS = ['center', 'endpoint', 'inflection', 'subject', 'detail'];

const VisualSchema = z.object({
  type: z.enum(['photo', 'diagram', 'symbol', 'number', 'none']),
  motif: z.string().nullable(),
  query: z.string().nullable(),
  value: z.string().nullable(),
  xLabel: z.string().nullable(),
  yLabel: z.string().nullable(),
});

const VisualIntentSchema = z.object({
  concept: z.string(),
  relation: z.object({
    type: z.enum(RELATION_TYPES),
    description: z.string().nullable(),
  }),
  strategy: z.object({
    type: z.enum(STRATEGY_TYPES),
    metaphor: z.string().nullable(),
    rationale: z.string(),
  }),
});

const BeatSchema = z.object({
  text: z.string(),
  emphasis: z.enum(['low', 'mid', 'high']),
  pauseAfterMs: z.number().min(0).max(600),
  delivery: z.enum(['normal', 'push', 'hold', 'drop']),
  visualPriority: z.enum(['low', 'mid', 'high']),
  keyword: z.string().nullable(),
  visualCue: z.string().nullable(),
});

const CameraSchema = z.object({
  motion: z.enum(CAMERA_MOTIONS),
  target: z.enum(CAMERA_TARGETS),
  intensity: z.enum(['subtle', 'medium']),
  startProgress: z.number().min(0).max(1),
  endProgress: z.number().min(0).max(1),
});

const SceneSchema = z.object({
  uiMotion: NotebookUiMotionSchema.nullable().optional(),
  presenter: GeneratedPresenterSchema.nullable(),
  backgroundVideo: BackgroundVideoSchema.nullable(),
  visualStory: z.object({initial: z.string(), trigger: z.string(), change: z.string(), invariant: z.string(), result: z.string()}).nullable(),
  diagramSpec: DiagramSpecSchema.extend({events: z.array(GeneratedDiagramEventSchema).max(120), physics: DiagramSpecSchema.shape.physics.unwrap(), nodes: z.array(DiagramSpecSchema.shape.nodes.element.extend({connector: DiagramSpecSchema.shape.nodes.element.shape.connector.unwrap(), strokeStyle: z.enum(['solid', 'dashed']).nullable()})).min(1).max(40)}).nullable(),
  kind: z.enum(['hero', 'photo', 'compare', 'statement', 'outro']),
  layout: z.enum(LAYOUTS),
  visual: VisualSchema,
  visualIntent: VisualIntentSchema,
  transition: z.enum(TRANSITIONS),
  transitionOptions: GeneratedTransitionOptionsSchema.nullable(),
  effects: z.array(GeneratedLightEffectSchema).max(4),
  camera: CameraSchema,
  choreography: z.array(z.string()),
  beats: z.array(BeatSchema),
  headline: z.string(),
  subline: z.string().nullable(),
  narration: z.string(),
  comparisonLeft: z.string().nullable(),
  comparisonRight: z.string().nullable(),
});

export const CandidateSchema = z.object({
  angle: z.enum(['counterargument', 'question', 'reframe', 'experience', 'analogy', 'rule']),
  hook: z.string(),
  title: z.string(),
  rationale: z.string(),
  viralScore: z.number(),
  suggestedCaption: z.string(),
  hashtags: z.array(z.string()),
  scenes: z.array(SceneSchema),
});

export {SYSTEM_PROMPT, VISUAL_SYSTEM_PROMPT} from './shorts-prompts.mjs';

export const createDiagramRepair = (client, {model = process.env.SHORTS_TEXT_MODEL || 'gpt-6-astra', maxCalls = 60, deadline = Date.now() + 40 * 60_000} = {}) => {
  let calls = 0;
  return async ({scene, title, sceneNumber, error, attempt, history = [], originalScene = scene, mode = 'repair'}) => {
    if (calls >= maxCalls || Date.now() >= deadline) throw new Error('Diagram repair run budget exhausted');
    calls++;
    const response = await client.responses.parse({
      model, store: false, reasoning: {effort: mode === 'redesign' ? 'medium' : 'low'},
      instructions: renderPrompt('diagram-repair', {systemPrompt: SYSTEM_PROMPT}),
      input: JSON.stringify({title, sceneNumber, scene, originalScene, validationError: error, attempt, history, mode}),
      text: {format: zodTextFormat(z.object({diagramSpec: SceneSchema.shape.diagramSpec.unwrap()}), 'repaired_diagram')},
    }, {timeout: Math.max(1, Math.min(180_000, deadline - Date.now())), maxRetries: 2});
    if (!response.output_parsed) throw new Error('Diagram repair refused or incomplete');
    return response.output_parsed.diagramSpec;
  };
};

const decodeEntities = (value) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const textFromHtml = (html) =>
  decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractGhostContent = (html) => {
  const opening = /<section\s+class=["'][^"']*\bgh-content\b[^"']*["'][^>]*>/i.exec(html);
  if (!opening) throw new Error('Could not locate the Ghost post body (.gh-content).');
  const bodyStart = opening.index + opening[0].length;
  const comments = /<section\s+class=["'][^"']*\barticle-comments\b[^"']*["'][^>]*>/i.exec(html.slice(bodyStart));
  if (!comments) throw new Error('Could not locate the end of the Ghost post body.');
  const beforeComments = html.slice(bodyStart, bodyStart + comments.index).trimEnd();
  return beforeComments.replace(/<\/section>\s*$/i, '');
};

export const fetchPost = async (rawUrl) => {
  const url = new URL(rawUrl);
  if (!allowedHosts.has(url.hostname)) throw new Error(`Only dohyeon.kr blog URLs are allowed. Received: ${url.hostname}`);
  url.hash = '';
  const response = await fetch(url, {redirect: 'follow', headers: {'user-agent': 'dohyeon.kr-shorts/3.0 (+https://dohyeon.kr)'}});
  if (!response.ok) throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);
  const finalUrl = new URL(response.url);
  if (!allowedHosts.has(finalUrl.hostname)) throw new Error(`Post redirected outside dohyeon.kr: ${finalUrl.hostname}`);
  const html = await response.text();
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const contentHtml = extractGhostContent(html);
  const title = textFromHtml(titleMatch?.[1] ?? ogTitleMatch?.[1] ?? finalUrl.pathname);
  const body = textFromHtml(contentHtml);
  if (body.length < 120) throw new Error('Post body is unexpectedly short.');
  return {url: finalUrl.toString(), title, body};
};

const slugFromUrl = (rawUrl, fallback) => {
  const url = new URL(rawUrl);
  const source = url.pathname.split('/').filter(Boolean).at(-1) || fallback;
  return source.toLowerCase().normalize('NFKD').replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'post';
};

const main = async () => {
  const template = getTemplate(process.env.SHORTS_TEMPLATE || undefined);
  const postUrl = process.argv[2];
  const count = Number(process.argv[3] ?? 5);
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Candidate count must be an integer from 3 to 8.');
  if (!postUrl) throw new Error('Usage: node generate-candidates.mjs <post-url> [candidate-count]');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');

  const additionalRequest = normalizeAdditionalRequest(process.env.SHORTS_ADDITIONAL_REQUEST);
  const post = await fetchPost(postUrl);
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY, timeout: 240_000, maxRetries: 2});
  const diagnosticsDir = process.env.SHORTS_DIAGNOSTICS_DIR || path.join(shortsRoot, 'output', 'generation-diagnostics');
  await fs.mkdir(diagnosticsDir, {recursive: true});
  await fs.writeFile(path.join(diagnosticsDir, 'source.json'), JSON.stringify({post, count, additionalRequest, template: template.id}, null, 2));
  let rawCandidates;
  try {
    rawCandidates = await generateInStages({
      client, post, count, additionalRequest, candidateSchema: CandidateSchema,
      visualInstructions: VISUAL_SYSTEM_PROMPT, templateInstructions: template.instructions, videoCatalog: await loadVideoCatalog(),
      checkpoint: (stage, result) => fs.writeFile(path.join(diagnosticsDir, `${stage}.json`), JSON.stringify(result, null, 2)),
    });
  } catch (error) {
    await fs.writeFile(path.join(diagnosticsDir, 'generation-error.json'), JSON.stringify({error: error.message}, null, 2));
    throw error;
  }
  const enriched = [];
  const repairDiagram = createDiagramRepair(client);
  await fs.writeFile(path.join(diagnosticsDir, 'raw-plan.json'), JSON.stringify({post, rawCandidates}, null, 2));
  const failures = [];
  for (const [index, candidate] of rawCandidates.entries()) {
    const checkpoint = {title: candidate.title, status: 'processing', scenes: structuredClone(candidate.scenes), history: []};
    const save = () => fs.writeFile(path.join(diagnosticsDir, `candidate-${index + 1}.json`), JSON.stringify(checkpoint, null, 2));
    await save();
    try {
      enriched.push(await enrichVisuals(candidate, {repairDiagram, onProgress: async event => {
        checkpoint.scenes[event.sceneNumber - 1] = event.scene;
        checkpoint.history.push({status: event.status, sceneNumber: event.sceneNumber, errors: event.history});
        await save();
      }}));
      checkpoint.status = 'validated';
    } catch (error) {
      checkpoint.status = 'failed';
      checkpoint.error = error.message;
      failures.push(error.message);
    }
    await save();
  }
  if (failures.length) throw new Error(`Generation stopped with ${failures.length} failed candidates; completed scenes and repair history saved to ${diagnosticsDir}\n${failures.join('\n')}`);
  enriched.sort((a, b) => b.viralScore - a.viralScore);

  const slug = slugFromUrl(post.url, post.title);
  const outputDir = path.join(shortsRoot, 'content', slug);
  await fs.mkdir(outputDir, {recursive: true});

  for (const [index, candidate] of enriched.entries()) {
    const manifest = withBlogCta({
      schemaVersion: 3,
      id: `candidate-${String(index + 1).padStart(2, '0')}`,
      status: 'candidate',
      source: {url: post.url, title: post.title},
      candidate: {
        angle: candidate.angle,
        hook: candidate.hook,
        title: candidate.title,
        rationale: candidate.rationale,
        viralScore: Math.round(Math.max(0, Math.min(100, candidate.viralScore))),
        suggestedCaption: candidate.suggestedCaption,
        hashtags: candidate.hashtags,
      },
      style: {
        theme: template.id,
        template: template.id,
        subtitles: 'burned-in',
        safeArea: 'shorts-reels',
        artDirection: 'monochrome-editorial-motion',
        motionLanguage: 'sharp-subtle',
        decorativeLabels: 'forbidden',
      },
      scenes: candidate.scenes,
    });
    manifest.scenes.forEach((scene, i) => validateSceneMotion(scene, manifest.scenes[i - 1]));
    await fs.writeFile(path.join(outputDir, `${manifest.id}.json`), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  const summary = enriched.map((candidate, index) => `${index + 1}. [${Math.round(candidate.viralScore)}] ${candidate.hook} — ${candidate.angle}`).join('\n');
  await fs.writeFile(
    path.join(outputDir, 'README.md'),
    `# Shorts candidates — ${post.title}\n\nSource: ${post.url}\n\n${summary}\n\nSchema v3 includes semantic subtitle beats, visual relation/strategy, element choreography, camera motion, and scene transitions. Edit or delete candidates before merging the generated PR.\n`,
    'utf8',
  );

  console.log(`Generated ${enriched.length} candidates in ${path.relative(repoRoot, outputDir)}`);
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `candidate_dir=${path.relative(repoRoot, outputDir)}\n`);
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();

