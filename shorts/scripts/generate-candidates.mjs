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

const SceneSchema = z.object({
  kind: z.enum(['hero', 'photo', 'compare', 'statement', 'outro']),
  headline: z.string(),
  subline: z.string().nullable(),
  narration: z.string(),
  imageQuery: z.string().nullable(),
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

const SYSTEM_PROMPT = `당신은 기술/커리어 블로그를 숏폼 영상으로 편집하는 에디터다.
목표는 글을 요약하는 것이 아니라, 글 안의 한 가지 강한 생각을 독립적인 숏츠로 추출하는 것이다.

원칙:
- 제공된 블로그 본문만 사실의 근거로 사용한다. 글에 없는 경험, 수치, 결과를 만들지 않는다.
- 후보 하나당 논점은 하나다. 한 편의 글을 1개의 숏츠로 압축하려 하지 않는다.
- 첫 장면은 2초 안에 멈춰 보게 만드는 질문, 반론, 재정의 중 하나여야 한다.
- 한국어는 짧고 자연스럽게 쓴다. 과장된 AI 문구, 불필요한 감탄사, 뻔한 자기계발 문구를 피한다.
- 장면은 5~8개, 전체는 대략 25~50초가 되도록 내레이션 양을 조절한다.
- 화면 텍스트는 PT처럼 짧게 쓴다. headline은 가능하면 1~3줄, subline은 보조 설명만 담당한다.
- 비주얼은 흰색/오프화이트 배경의 모노크롬 에디토리얼 PT를 전제로 한다.
- 사진 장면은 실제 사진이 의미를 보강할 때만 사용한다. 후보당 photo/hero 사진 장면은 2~4개 정도가 적당하다.
- imageQuery는 Openverse에서 찾기 좋은 영어 명사구로 쓴다. 너무 추상적인 단어보다 실제 촬영 가능한 사물/장소/행동을 선호한다.
- compare 장면은 comparisonLeft/comparisonRight를 반드시 채운다. 다른 장면은 null로 둔다.
- 마지막 장면은 결론 또는 원문을 읽고 싶게 만드는 여운을 남긴다. 노골적인 구독 유도는 하지 않는다.
- viralScore는 0~100 사이에서 hook 강도, 독립 이해 가능성, 논쟁성/새로움, 공유 가능성을 종합해 평가한다.`;

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
    headers: {'user-agent': 'dohyeon.kr-shorts/1.0 (+https://dohyeon.kr)'},
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
        'user-agent': 'dohyeon.kr-shorts/1.0 (+https://dohyeon.kr)',
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

const enrichImages = async (candidate) => {
  const scenes = [];
  for (const scene of candidate.scenes) {
    const shouldSearch = Boolean(scene.imageQuery) && (scene.kind === 'photo' || scene.kind === 'hero');
    scenes.push({
      ...scene,
      image: shouldSearch ? await searchOpenverse(scene.imageQuery) : null,
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
    input: `아래 블로그 글에서 서로 겹치지 않는 숏츠 후보를 정확히 ${count}개 만들어라.\n\n제목: ${post.title}\nURL: ${post.url}\n\n본문:\n${post.body}`,
    text: {
      format: zodTextFormat(PlanSchema, 'blog_shorts_candidates'),
    },
  });

  if (!response.output_parsed) throw new Error('The model did not return a parsed shorts plan.');
  const rawCandidates = response.output_parsed.candidates.slice(0, count);
  if (rawCandidates.length < count) {
    throw new Error(`Expected ${count} candidates, received ${rawCandidates.length}.`);
  }

  const enriched = [];
  for (const candidate of rawCandidates) enriched.push(await enrichImages(candidate));
  enriched.sort((a, b) => b.viralScore - a.viralScore);

  const slug = slugFromUrl(post.url, post.title);
  const outputDir = path.join(shortsRoot, 'content', slug);
  await fs.mkdir(outputDir, {recursive: true});

  for (const [index, candidate] of enriched.entries()) {
    const manifest = {
      schemaVersion: 1,
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
        theme: 'monochrome-editorial',
        imagePlacement: 'upper-right',
        textPlacement: 'lower-left',
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
    `# Shorts candidates — ${post.title}\n\nSource: ${post.url}\n\n${summary}\n\nDelete or edit candidates before merging the generated PR. Merging a candidate JSON triggers rendering.\n`,
    'utf8',
  );

  console.log(`Generated ${enriched.length} candidates in ${path.relative(repoRoot, outputDir)}`);
};

await main();
