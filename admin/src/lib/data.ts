export type Point = {
  day: string;
  visits: number | null;
  views: number | null;
};
export type Stats = {
  start: string;
  end: string;
  daily: Point[];
  previous: Point[];
  posts: {
    slug: string;
    lifetime: number;
    views: number | null;
    previous: number | null;
  }[];
  comments: { visible: number; hidden: number; deleted: number };
  coverage: { visitsSince: string | null; postDailySince: string };
  updatedAt: string;
  timezone: string;
};
export type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  url: string;
  html?: string;
  meta_title?: string;
  meta_description?: string;
  custom_excerpt?: string;
  canonical_url?: string;
  published_at: string | null;
  updated_at: string;
};
export type Comment = {
  id: string;
  postSlug: string;
  displayName: string;
  body: string;
  status: "visible" | "hidden" | "deleted";
  createdAt: string;
};
export const number = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("ko-KR").format(v);
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
export function range(days: number) {
  const end = today();
  const start = new Date(end + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end };
}
export function sum(points: Point[], key: "visits" | "views") {
  const values = points.map((p) => p[key]).filter((v) => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}
export function change(current: number | null, previous: number | null) {
  if (current === null || previous === null) return "비교 데이터 없음";
  if (previous === 0)
    return current === 0 ? "이전 기간과 동일" : "이전 기간 0건";
  return `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}%`;
}
export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  if (response.status === 401 || response.status === 403)
    throw new Error(
      "관리자 로그인이 필요합니다. Owner 또는 Administrator 계정으로 로그인해 주세요.",
    );
  if (!response.ok)
    throw new Error(
      `데이터를 불러오지 못했습니다 (${response.status}). 다시 시도해 주세요.`,
    );
  return response.json();
}
export async function getPosts() {
  let page: number | null = 1;
  const posts: Post[] = [];
  while (page) {
    const result: {
      posts: Post[];
      meta: { pagination: { next: number | null } };
    } = await request(
      `/ghost/api/admin/posts/?limit=100&page=${page}&formats=html&filter=status:published`,
    );
    posts.push(...result.posts);
    page = result.meta.pagination.next;
  }
  return posts;
}
export async function getComments() {
  const comments: Comment[] = [];
  let batch: Comment[];
  do {
    const result = await request<{ comments: Comment[] }>(
      `/ghost/api/comments-admin?offset=${comments.length}`,
    );
    batch = result.comments;
    comments.push(...batch);
  } while (batch.length === 500);
  return comments;
}
export function safePostUrl(post: Post) {
  try {
    const url = new URL(post.url, location.origin);
    return url.origin === location.origin
      ? url.pathname
      : "/" + encodeURIComponent(post.slug) + "/";
  } catch {
    return "/" + encodeURIComponent(post.slug) + "/";
  }
}
export function auditPost(post: Post) {
  const doc = new DOMParser().parseFromString(post.html || "", "text/html");
  const issues: string[] = [];
  if (!post.title?.trim()) issues.push("게시물 제목이 없습니다.");
  if (!post.meta_description?.trim() && !post.custom_excerpt?.trim())
    issues.push(
      "검색 설명을 직접 지정하지 않았습니다. 자동 발췌가 적절한지 확인하세요.",
    );
  const missing = [...doc.querySelectorAll("img")].filter(
    (img) => !img.hasAttribute("alt"),
  ).length;
  if (missing) issues.push(`대체 텍스트 속성이 없는 이미지 ${missing}개`);
  if (post.canonical_url) {
    try {
      const u = new URL(post.canonical_url);
      if (u.protocol !== "https:")
        issues.push("canonical URL이 HTTPS가 아닙니다.");
    } catch {
      issues.push("canonical URL 형식이 올바르지 않습니다.");
    }
  }
  return issues;
}
export function auditDocument(doc: Document) {
  const findings: string[] = [];
  if (!doc.title.trim()) findings.push("페이지 title 누락");
  if (
    !doc
      .querySelector('meta[name="description"]')
      ?.getAttribute("content")
      ?.trim()
  )
    findings.push("검색 설명 누락");
  if (!doc.querySelector('link[rel="canonical"]')?.getAttribute("href"))
    findings.push("canonical 누락");
  if (
    /noindex/i.test(
      doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
    )
  )
    findings.push("noindex로 색인 차단 중");
  const h1 = doc.querySelectorAll("h1").length;
  if (h1 !== 1) findings.push(`H1 제목 ${h1}개 — 구조 확인 필요`);
  return findings;
}

/** Read only same-origin sitemap documents; an incomplete crawl is never a failure verdict. */
export async function auditSitemap(path: string): Promise<string | null> {
  const read = async (url: string) => {
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        "sitemap을 불러오지 못해 포함 여부를 확인하지 못했습니다.",
      );
    const doc = new DOMParser().parseFromString(
      await response.text(),
      "application/xml",
    );
    if (doc.querySelector("parsererror"))
      throw new Error("sitemap 형식을 확인하지 못했습니다.");
    return doc;
  };
  const includes = (doc: Document) =>
    [...doc.querySelectorAll("url > loc")].some((node) => {
      try {
        return (
          new URL(node.textContent || "").pathname.replace(/\/$/, "") ===
          path.replace(/\/$/, "")
        );
      } catch {
        return false;
      }
    });
  try {
    const index = await read("/sitemap.xml");
    if (includes(index)) return null;
    const children = [...index.querySelectorAll("sitemap > loc")]
      .map((node) => new URL(node.textContent || "", location.origin))
      .filter((url) => url.origin === location.origin);
    if (children.length > 10)
      return "sitemap이 10개를 초과해 자동 점검 범위를 벗어났습니다.";
    if (children.length) {
      const results = await Promise.all(
        children.map((url) => read(url.pathname + url.search)),
      );
      if (results.some(includes)) return null;
      if (results.some((doc) => doc.querySelector("sitemapindex")))
        return "중첩 sitemap은 직접 확인이 필요합니다.";
    } else if (!index.querySelector("urlset"))
      return "sitemap의 게시물 목록을 확인하지 못했습니다.";
    return "sitemap에 이 게시물의 URL이 없습니다. canonical과 공개 상태를 확인하세요.";
  } catch (error) {
    return (error as Error).message;
  }
}
