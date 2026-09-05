import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';
import {DiagramSpecSchema, validateDiagram} from '../src/visuals/diagram-spec.ts';
import {curatedPhoto} from './curated-photos.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const allowedHosts = new Set(['dohyeon.kr', 'www.dohyeon.kr', 'blog.dohyeon.kr']);
const openverseCache = new Map();

const LAYOUTS = [
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

const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'wipe', 'none'];
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
  diagramSpec: DiagramSpecSchema.extend({physics: DiagramSpecSchema.shape.physics.unwrap()}).nullable(),
  kind: z.enum(['hero', 'photo', 'compare', 'statement', 'outro']),
  layout: z.enum(LAYOUTS),
  visual: VisualSchema,
  visualIntent: VisualIntentSchema,
  transition: z.enum(TRANSITIONS),
  camera: CameraSchema,
  choreography: z.array(z.string()),
  beats: z.array(BeatSchema),
  headline: z.string(),
  subline: z.string().nullable(),
  narration: z.string(),
  comparisonLeft: z.string().nullable(),
  comparisonRight: z.string().nullable(),
});

const CandidateSchema = z.object({
  angle: z.enum(['counterargument', 'question', 'reframe', 'experience', 'analogy', 'rule']),
  hook: z.string(),
  title: z.string(),
  rationale: z.string(),
  viralScore: z.number(),
  suggestedCaption: z.string(),
  hashtags: z.array(z.string()),
  scenes: z.array(SceneSchema),
});

const PlanSchema = z.object({candidates: z.array(CandidateSchema)});

const SYSTEM_PROMPT = `당신은 기술/커리어 블로그를 숏폼 영상으로 편집하는 에디터이자 모션 인포그래픽 디렉터다.
도식 생성: visual.type=diagram 장면에는 diagramSpec을 작성한다. 나머지는 null이다.
diagramSpec은 version=1, renderer=auto가 기본이다. 일반 도식은 Remotion, physics가 있는 장면은 Motion Canvas로 자동 선택된다.
physics는 보통 null이다. 충돌/낙하/시소가 의미를 전달할 때만 seconds(0.1~10), gravity(x/y -2~2), bodies, pins를 작성한다.
bodies는 rect 또는 정원 circle 노드의 target, isStatic, mass(0.1~100), restitution/friction(0~1), velocity(x/y -20~20)를 지정한다. 속도는 60Hz tick당 좌표 단위이다.
pins는 동적 물체를 고정할 세계 좌표 x/y와 target이다. 시소는 막대 rect 중심에 pin을 두고 한쪽 위에 무게를 떨어뜨린다. 바닥은 static rect로 명시한다.
물리 물체의 x/y/rotation/scale은 solver가 소유하므로 events에는 opacity만 허용한다. 물리 시간은 내레이션 길이에 맞춰 재생되며 실제 수치 예측이 아닌 개념적 비유로만 사용한다.
800x560 공간에 rect/circle/line/text 객체를 조합한다. x/y는 중심점이다. 가장자리 여백 40, 라벨은 짧게 유지한다.
events는 장면 전체 길이를 0..1로 정규화한 시간이다. 초기 상태→변화→결과를 x/y/rotation/scale/opacity로 표현한다.
from/to는 절대 값이며 동일 객체의 동일 속성 이벤트는 겹치지 않는다. 불명확한 수치나 실제 데이터처럼 보이는 가짜 숫자를 생성하지 않는다.
renderer 선택은 표현력의 보장이 아니다. 두 엔진이 공유하는 문법 범위 안에서만 객체를 생성하며 임의 코드는 작성하지 않는다.
목표는 글을 요약해 슬라이드를 만드는 것이 아니다. 글 안의 한 가지 강한 생각을 독립적인 숏츠로 추출하고, 말의 의미·리듬·관계를 화면의 사건으로 번역한다.

콘텐츠 원칙:
- 제공된 블로그 본문만 사실의 근거로 사용한다. 글에 없는 경험, 수치, 결과를 만들지 않는다.
- 후보 하나당 논점은 하나다. 한 편의 글 전체를 한 숏츠로 압축하지 않는다.
- 첫 장면은 2초 안에 멈춰 보게 만드는 질문, 반론, 재정의 중 하나여야 한다.
- 한국어는 짧고 자연스럽게 쓴다. 과장된 AI 문구, 불필요한 감탄사, 뻔한 자기계발 문구를 피한다.
- 장면은 6~9개, 전체는 대략 30~55초가 되도록 내레이션 양을 조절한다.
- headline은 가능하면 1~3줄, subline은 보조 설명만 담당한다.
- 마지막 장면은 결론 또는 원문을 읽고 싶게 만드는 여운을 남긴다. 노골적인 구독 유도는 하지 않는다.

아트 디렉션:
- 기본 무드는 monochrome / editorial / sharp / minimal / tech다.
- 검은색/차콜 바탕, 흰 타이포, 회색 보조선, 낮은 채도의 사진을 사용한다.
- 사진은 최종 렌더에서 grayscale/contrast 정규화를 거친다. 서로 다른 출처의 에셋도 하나의 시각 언어로 보여야 한다.
- 장식은 정보보다 뒤에 있어야 한다. PHOTO / PHOTO, IMAGE, VIDEO, STATEMENT / LEVERAGE 같은 메타 라벨과 의미 없는 박스·인용부호·영문 장식 캡션을 만들지 않는다.
- 화면에 존재하는 요소는 정보 전달, 의미 강조, 맥락 제공, 시선 유도, 리듬 전환 중 하나의 역할을 가져야 한다.

Visual Resolver 원칙:
- 키워드를 아이콘 하나로 치환하지 않는다. 먼저 문장의 핵심 관계가 무엇인지 visualIntent.relation에 적는다.
- 시각 전략 우선순위는 simulation → graph → spatial-diagram → physical-metaphor → photo → icon 순이다. icon은 fallback이다.
- 변화량, 효율, 누적, 격차, 시간에 따른 변화는 graph를 적극적으로 사용한다.
- 물리적 관계가 설명에 유리하면 physical-metaphor를 쓴다. 특히 leverage는 상승 화살표가 아니라 지렛대/시소처럼 작은 힘이 큰 결과를 움직이는 관계로 표현한다.
- 병목은 flow가 좁은 관문에서 밀리는 모습, balance/trade-off는 실제로 기울어지는 구조, accumulation은 쌓이는 구조, convergence는 여러 경로가 모이는 구조를 우선한다.
- 구체적인 사람/사물/장소/행동은 photo를 우선한다. photo query는 Openverse에서 찾기 좋은 영어 명사구로 작성한다.
- visual.type이 photo일 때만 query를 채운다. 그 외 query는 null이다.
- diagram/symbol motif는 의미가 분명한 kebab-case를 쓴다.
- 그래프 motif 예: roi-curve, growth-curve, diminishing-returns.
- flow motif 예: network, map-network, funnel, feedback-loop, depth-vs-breadth.
- physical metaphor motif 예: leverage, balance-scale, target.

Motion / choreography 원칙:
- 씬 전환과 요소 애니메이션을 구분한다. scene transition 하나로 화면 전체를 통째로 움직이는 것에 의존하지 않는다.
- choreography에는 화면에서 일어날 사건을 시간 순서로 2~6개 적는다.
- 가능한 canonical event 이름: show-visual, show-headline, show-subline, advance-visual, camera-focus, emphasize-result.
- 필요한 경우 의미가 명확한 kebab-case 이벤트를 추가해도 된다.
- 한 씬의 핵심 motion event는 보통 1~3개다. 모든 요소가 계속 움직이지 않는다.
- 기본 motion vocabulary는 fade, slide, scale, reveal, draw, zoom, pan이다. bounce, spin, elastic 같은 장식성 모션은 금지한다.
- 내레이션의 동사를 화면 동작으로 번역한다. '확대한다'면 zoom, '벌어진다'면 실제 격차 확대, '쌓인다'면 누적, '막힌다'면 flow 정체, '기울어진다'면 실제 기울임을 우선한다.
- camera는 내용상 필요한 경우에만 사용한다. 전체→세부, 그래프 특정 구간, 관계의 핵심 지점을 보여줄 때 push-in/zoom을 쓴다.
- camera.startProgress < camera.endProgress가 되게 한다. 정적 장면은 static / center / subtle / 0 / 1을 사용한다.

자막 / 낭독 리듬 원칙:
- narration을 문법 단위가 아니라 semantic beat로 나눈다. beats의 text를 순서대로 이어 읽으면 narration과 의미가 같아야 한다.
- 자막을 '그럴' / '수' / '있다'처럼 잘게 자르지 않는다. 원칙적으로 한 beat는 공백 제외 4자 이상을 확보한다.
- 단, 결론이나 punch word를 강하게 꽂기 위해 '없다', '아니다'처럼 짧은 단어를 의도적으로 단독 분리하는 것은 허용한다.
- 모든 beat를 강조하지 않는다. 한 문장에 high emphasis는 보통 1~2개만 둔다.
- 결론, 대비, 수치, 반전, 핵심 개념, 선언을 high emphasis 후보로 본다.
- emphasis는 low/mid/high, delivery는 normal/push/hold/drop을 쓴다.
- pauseAfterMs로 쉼을 표시한다. 대부분 0~180ms, 강한 결론 뒤에는 180~350ms 정도를 쓸 수 있다.
- keyword는 beat 안에서 시각적으로 한 단어만 더 강조할 필요가 있을 때만 채운다.
- visualCue에는 이 beat가 화면에서 무엇을 촉발하는지 짧게 적는다. 예: graph zooms to inflection point, lever lifts load.

layout 원칙:
- 텍스트만 있는 장면을 2개 이상 연속으로 만들지 않는다.
- 6~9장면 중 최소 2장은 문맥에 맞는 실제 작업 공간/사물/협업 사진을 사용한다. 모든 사진을 full-bleed로 만들지 말고 photo-strip 등 사진과 문구가 분리된 배치를 포함한다.
- 도식 라벨은 한글 2~6자로 짧게 쓴다. 긴 영문 용어는 본문에서 설명한다. line의 width가 길이이고 기본은 가로선이며 세로선은 height를 길게 쓴다. 대각선은 rotation 이벤트의 from/to를 같은 각도로 지정한다.
- 같은 layout을 연속으로 사용하지 않는다.
- photo-full-bleed는 강한 전환에만 사용하고 영상당 최대 1~2회.
- diagram-centered는 그래프/도식/물리 비유가 중심인 장면에 사용한다.
- statement-giant는 강한 한 문장에만 제한적으로 사용한다.
- compare-columns / compare-versus는 진짜 비교 관계가 있을 때만 사용한다.
- outro-minimal은 마지막 결론용이다.
- Shorts/Reels UI가 덮는 오른쪽 액션 바와 하단 영역에는 핵심 텍스트나 도식을 배치하지 않는 전제를 따른다.

transition 원칙:
- fade는 차분한 연결, slide-up은 단계 진행, slide-left는 이동/비교, zoom은 확대 의미, wipe는 도식/논리 전환에 제한적으로 사용한다.
- 같은 transition을 2개 이상 연속으로 쓰지 않는다.
- zoom/wipe를 모든 씬에 반복하지 않는다.

필드 규칙:
- 사람이 읽을 스토리보드에도 사용하므로 concept, relation.description, strategy.metaphor/rationale, visualCue는 자연스러운 한국어로 쓴다. enum과 choreography 이벤트 식별자는 정해진 영문 값을 유지한다.
- compare 장면은 comparisonLeft/comparisonRight를 채우고 다른 장면은 null로 둔다.
- visual.value는 숫자가 시각적으로 중요한 경우에만 사용한다.
- 그래프는 필요한 경우 xLabel/yLabel에 짧은 한글 축 이름을 넣는다.
- visualIntent.strategy.rationale에는 왜 이 표현이 단순 아이콘보다 관계를 더 잘 설명하는지 한 문장으로 적는다.`;

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

const fetchPost = async (rawUrl) => {
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

const normalizeOpenverseImage = (result, query) => ({
  query,
  title: result.title ?? null,
  creator: result.creator ?? null,
  license: result.license ?? 'unknown',
  licenseVersion: result.license_version ?? null,
  licenseUrl: result.license_url ?? null,
  source: result.source ?? null,
  provider: result.provider ?? null,
  sourcePage: result.foreign_landing_url ?? null,
  originalUrl: result.url ?? null,
  thumbnailUrl: result.thumbnail ?? null,
});

const searchOpenverse = async (query) => {
  if (!query) return null;
  if (openverseCache.has(query)) return openverseCache.get(query);
  for (const license of ['cc0', 'pdm']) {
    const params = new URLSearchParams({q: query, license, page_size: '20', mature: 'false'});
    const response = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
      headers: {accept: 'application/json', 'user-agent': 'dohyeon.kr-shorts/3.0 (+https://dohyeon.kr)'},
    });
    if (response.status === 429) {
      console.warn(`Openverse rate limit reached while searching: ${query}`);
      break;
    }
    if (!response.ok) continue;
    const data = await response.json();
    const candidates = Array.isArray(data.results) ? data.results : [];
    const preferred = candidates.find((item) => Number(item.width) >= 900 && Number(item.height) >= 700 && item.url) ?? candidates.find((item) => item.url || item.thumbnail);
    if (preferred) {
      const normalized = normalizeOpenverseImage(preferred, query);
      openverseCache.set(query, normalized);
      return normalized;
    }
  }
  openverseCache.set(query, null);
  return null;
};

const normalizeCamera = (camera) => {
  const startProgress = Math.max(0, Math.min(1, camera.startProgress));
  const endProgress = Math.max(startProgress + 0.08, Math.min(1, camera.endProgress));
  return {...camera, startProgress, endProgress: Math.min(1, endProgress)};
};

const enrichVisuals = async (candidate) => {
  const scenes = [];
  for (const scene of candidate.scenes) {
    const imageQuery = scene.visual.type === 'photo' ? scene.visual.query : null;
    const image = imageQuery ? (await searchOpenverse(imageQuery)) ?? curatedPhoto(imageQuery) : null;
    if (scene.visual.type === 'photo' && !image) throw new Error(`Photo could not be resolved: ${imageQuery}. Choose a concrete licensed photo instead of rendering a placeholder.`);
    scenes.push({...scene, camera: normalizeCamera(scene.camera), imageQuery, image});
  }
  return {...candidate, scenes};
};

const main = async () => {
  const postUrl = process.argv[2];
  const count = Math.min(8, Math.max(3, Number(process.argv[3] ?? 5)));
  if (!postUrl) throw new Error('Usage: node generate-candidates.mjs <post-url> [candidate-count]');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');

  const post = await fetchPost(postUrl);
  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const response = await client.responses.parse({
    model: process.env.SHORTS_TEXT_MODEL || 'gpt-5.6-luna',
    instructions: SYSTEM_PROMPT,
    input: `아래 블로그 글에서 서로 겹치지 않는 숏츠 후보를 정확히 ${count}개 만들어라. 각 후보는 장면별 semantic beat, 강조 리듬, visual relation, visual strategy, layout, element choreography, camera motion, scene transition까지 완성해야 한다.\n\n제목: ${post.title}\nURL: ${post.url}\n\n본문:\n${post.body}`,
    text: {format: zodTextFormat(PlanSchema, 'blog_shorts_candidates_v3')},
  });

  if (!response.output_parsed) throw new Error('The model did not return a parsed shorts plan.');
  const rawCandidates = response.output_parsed.candidates.slice(0, count);
  for (const candidate of rawCandidates) for (const scene of candidate.scenes) {
    if (scene.diagramSpec) validateDiagram(scene.diagramSpec);
  }
  if (rawCandidates.length < count) throw new Error(`Expected ${count} candidates, received ${rawCandidates.length}.`);

  const enriched = [];
  for (const candidate of rawCandidates) enriched.push(await enrichVisuals(candidate));
  enriched.sort((a, b) => b.viralScore - a.viralScore);

  const slug = slugFromUrl(post.url, post.title);
  const outputDir = path.join(shortsRoot, 'content', slug);
  await fs.mkdir(outputDir, {recursive: true});

  for (const [index, candidate] of enriched.entries()) {
    const manifest = {
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
        theme: 'monochrome-editorial-dark',
        visualDensity: 'high',
        subtitles: 'burned-in',
        safeArea: 'shorts-reels',
        artDirection: 'monochrome-editorial-motion',
        motionLanguage: 'sharp-subtle',
        decorativeLabels: 'forbidden',
      },
      scenes: candidate.scenes,
    };
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

await main();
