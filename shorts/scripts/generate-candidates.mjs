import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';

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

const VisualSchema = z.object({
  type: z.enum(['photo', 'diagram', 'symbol', 'number', 'none']),
  motif: z.string().nullable(),
  query: z.string().nullable(),
  value: z.string().nullable(),
  xLabel: z.string().nullable(),
  yLabel: z.string().nullable(),
});

const SceneSchema = z.object({
  kind: z.enum(['hero', 'photo', 'compare', 'statement', 'outro']),
  layout: z.enum(LAYOUTS),
  visual: VisualSchema,
  transition: z.enum(TRANSITIONS),
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

const PlanSchema = z.object({
  candidates: z.array(CandidateSchema),
});

const SYSTEM_PROMPT = `당신은 기술/커리어 블로그를 숏폼 영상으로 편집하는 에디터이자 시각 연출가다.
목표는 글을 요약하는 것이 아니라, 글 안의 한 가지 강한 생각을 독립적인 숏츠로 추출하고 거의 모든 장면에 의미 있는 시각적 앵커를 부여하는 것이다.

콘텐츠 원칙:
- 제공된 블로그 본문만 사실의 근거로 사용한다. 글에 없는 경험, 수치, 결과를 만들지 않는다.
- 후보 하나당 논점은 하나다. 한 편의 글을 1개의 숏츠로 압축하려 하지 않는다.
- 첫 장면은 2초 안에 멈춰 보게 만드는 질문, 반론, 재정의 중 하나여야 한다.
- 한국어는 짧고 자연스럽게 쓴다. 과장된 AI 문구, 불필요한 감탄사, 뻔한 자기계발 문구를 피한다.
- 장면은 6~9개, 전체는 대략 30~55초가 되도록 내레이션 양을 조절한다.
- headline은 가능하면 1~3줄, subline은 보조 설명만 담당한다.
- 마지막 장면은 결론 또는 원문을 읽고 싶게 만드는 여운을 남긴다. 노골적인 구독 유도는 하지 않는다.
- viralScore는 0~100 사이에서 hook 강도, 독립 이해 가능성, 논쟁성/새로움, 공유 가능성을 종합해 평가한다.

시각 연출 원칙:
- 화면은 검은색/차콜 기반의 다크 모노크롬 에디토리얼 PT다. 흰 타이포와 회색 보조선을 사용한다.
- 거의 모든 장면은 photo, diagram, symbol, number 중 하나의 시각적 앵커를 가진다. none은 미니멀한 결론 장면에서만 예외적으로 사용한다.
- 텍스트만 있는 장면을 2개 이상 연속으로 만들지 않는다.
- 같은 layout을 연속으로 사용하지 않는다.
- 한 영상에서 photo 레이아웃은 최소 2종류를 사용한다.
- 6~9장 기준 photo 2~4장, diagram/symbol 2~4장을 권장한다.
- 구체적인 사람/사물/장소/행동은 photo를 우선한다. photo의 query는 Openverse에서 찾기 좋은 영어 명사구로 작성한다.
- 비유가 실제 물리 장면을 직접 떠올리게 하면 추상 도식보다 photo를 우선한다. 예: 그림의 전체 구도를 잡는 비유 → 손으로 스케치하는 사진, 목표를 겨누는 비유 → 과녁/타겟 사진.
- 관계, 변화량, 흐름처럼 사진보다 구조 자체가 중요한 추상 개념은 diagram 또는 symbol을 우선한다. 예: ROI → 그래프, 트레이드오프 → 저울, 연결 구조 → 네트워크.
- visual.type이 photo일 때만 query를 채운다. 그 외에는 query를 null로 둔다.
- visual.type이 diagram/symbol일 때 motif는 아래 시각 언어 중 가장 가까운 값을 사용한다. 정확히 맞는 것이 없으면 의미가 분명한 짧은 kebab-case 이름을 쓴다.
- Shorts/Reels UI가 덮는 오른쪽 액션 바와 하단 채널/설명 영역에는 핵심 텍스트나 도식을 배치하지 않는 전제를 따른다. full-bleed 사진 배경만 해당 영역까지 확장 가능하다.

권장 개념 → 시각 언어:
- ROI / 효율 / 비용 대비 효과 → roi-curve
- 균형 / 트레이드오프 → balance-scale
- 목표 / 목적 → target
- 방향 → compass 또는 arrow-path
- 깊게 파기 / 확대 / 정밀도 → magnifier
- 전체 구조 / 멘탈 모델 → map-network
- 선택 / 분기 → fork-road
- 레버리지 → leverage
- 부채 / 나중에 돌아올 지점 → bookmark-stack
- 병목 → funnel
- 연결 / 관계 → network
- 우선순위 → ranked-list
- 성장 → ladder
- 리스크 → warning
- 시간 / 투자 시간 → hourglass
- 반복 / 피드백 → feedback-loop

layout 사용 지침:
- photo-top-right: 상단 우측의 안전 영역 안에 사진 + 좌하단 문장. 기본 사진 장면.
- photo-full-bleed: 화면 전체 사진 + 텍스트 오버레이. 강한 전환에만 사용하고 영상당 최대 1~2회.
- photo-split-left: 왼쪽 사진 + 오른쪽 문장.
- photo-strip: 중앙 가로 사진 띠 + 위/아래 텍스트.
- diagram-centered: 그래프/도식이 중심인 장면.
- symbol-right: 오른쪽 안전 영역 안의 큰 상징 + 왼쪽 문장.
- statement-giant: 강한 한 문장을 화면 대부분에 크게. 과용하지 않는다.
- statement-offset: 비대칭 타이포그래피 + 작은 시각 요소.
- compare-columns: 두 개념을 나란히 비교.
- compare-versus: 양쪽 개념의 충돌/선택을 강하게 대비.
- outro-minimal: 마지막 결론용.

transition 사용 지침:
- fade: 차분한 연결, 결론, 호흡 전환.
- slide-up: 설명이 한 단계 진행되는 느낌.
- slide-left: 비교, 이동, 다음 단계로 넘어가는 느낌.
- zoom: 첫 장면이나 확대/정밀도 개념에 제한적으로 사용.
- wipe: 도식/그래프/강한 논리 전환에 사용.
- none: 이미 화면 자체가 충분히 강한 경우만 사용.
- 같은 transition을 2개 이상 연속으로 사용하지 않는다.
- 모든 장면에 과한 움직임을 넣지 않는다. 영상 전체에서 fade/slide 계열을 중심으로 하고 zoom/wipe는 강조 장면에만 쓴다.

compare 장면은 comparisonLeft/comparisonRight를 반드시 채운다. 다른 장면은 null로 둔다.
visual.value는 number 타입 또는 숫자가 시각적으로 중요한 경우에만 사용한다.
roi-curve 같은 그래프는 필요한 경우 xLabel/yLabel에 짧은 한글 축 이름을 넣는다.`;

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
  const comments = /<section\s+class=["'][^"']*\barticle-comments\b[^"']*["'][^>]*>/i.exec(
    html.slice(bodyStart),
  );
  if (!comments) throw new Error('Could not locate the end of the Ghost post body.');

  const beforeComments = html.slice(bodyStart, bodyStart + comments.index).trimEnd();
  return beforeComments.replace(/<\/section>\s*$/i, '');
};

const fetchPost = async (rawUrl) => {
  const url = new URL(rawUrl);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Only dohyeon.kr blog URLs are allowed. Received: ${url.hostname}`);
  }
  url.hash = '';

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {'user-agent': 'dohyeon.kr-shorts/2.0 (+https://dohyeon.kr)'},
  });
  if (!response.ok) throw new Error(`Failed to fetch post: ${response.status} ${response.statusText}`);

  const finalUrl = new URL(response.url);
  if (!allowedHosts.has(finalUrl.hostname)) {
    throw new Error(`Post redirected outside dohyeon.kr: ${finalUrl.hostname}`);
  }

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
  const fromPath = url.pathname.split('/').filter(Boolean).at(-1);
  const source = fromPath || fallback;
  return source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
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
    const params = new URLSearchParams({
      q: query,
      license,
      page_size: '20',
      mature: 'false',
    });
    const response = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'dohyeon.kr-shorts/2.0 (+https://dohyeon.kr)',
      },
    });

    if (response.status === 429) {
      console.warn(`Openverse rate limit reached while searching: ${query}`);
      break;
    }
    if (!response.ok) continue;

    const data = await response.json();
    const candidates = Array.isArray(data.results) ? data.results : [];
    const preferred =
      candidates.find((item) => Number(item.width) >= 900 && Number(item.height) >= 700 && item.url) ??
      candidates.find((item) => item.url || item.thumbnail);

    if (preferred) {
      const normalized = normalizeOpenverseImage(preferred, query);
      openverseCache.set(query, normalized);
      return normalized;
    }
  }

  openverseCache.set(query, null);
  return null;
};

const enrichVisuals = async (candidate) => {
  const scenes = [];
  for (const scene of candidate.scenes) {
    const imageQuery = scene.visual.type === 'photo' ? scene.visual.query : null;
    scenes.push({
      ...scene,
      imageQuery,
      image: imageQuery ? await searchOpenverse(imageQuery) : null,
    });
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
    input: `아래 블로그 글에서 서로 겹치지 않는 숏츠 후보를 정확히 ${count}개 만들어라. 각 후보는 내용뿐 아니라 장면별 시각 연출, 레이아웃 리듬, 트랜지션까지 완성해야 한다.\n\n제목: ${post.title}\nURL: ${post.url}\n\n본문:\n${post.body}`,
    text: {
      format: zodTextFormat(PlanSchema, 'blog_shorts_candidates_v2'),
    },
  });

  if (!response.output_parsed) throw new Error('The model did not return a parsed shorts plan.');
  const rawCandidates = response.output_parsed.candidates.slice(0, count);
  if (rawCandidates.length < count) {
    throw new Error(`Expected ${count} candidates, received ${rawCandidates.length}.`);
  }

  const enriched = [];
  for (const candidate of rawCandidates) enriched.push(await enrichVisuals(candidate));
  enriched.sort((a, b) => b.viralScore - a.viralScore);

  const slug = slugFromUrl(post.url, post.title);
  const outputDir = path.join(shortsRoot, 'content', slug);
  await fs.mkdir(outputDir, {recursive: true});

  for (const [index, candidate] of enriched.entries()) {
    const manifest = {
      schemaVersion: 2,
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
      },
      scenes: candidate.scenes,
    };

    await fs.writeFile(
      path.join(outputDir, `${manifest.id}.json`),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
  }

  const summary = enriched
    .map(
      (candidate, index) =>
        `${index + 1}. [${Math.round(candidate.viralScore)}] ${candidate.hook} — ${candidate.angle}`,
    )
    .join('\n');
  await fs.writeFile(
    path.join(outputDir, 'README.md'),
    `# Shorts candidates — ${post.title}\n\nSource: ${post.url}\n\n${summary}\n\nEach scene includes a layout, visual strategy, and transition. Edit or delete candidates before merging the generated PR. Merging a candidate JSON triggers rendering.\n`,
    'utf8',
  );

  console.log(`Generated ${enriched.length} candidates in ${path.relative(repoRoot, outputDir)}`);
};

await main();
