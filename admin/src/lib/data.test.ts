// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { auditPost, auditDocument, change, sum, type Post } from "./data";
describe("data interpretation", () => {
  it("does not turn missing data into a zero or infinite growth", () => {
    expect(
      sum([{ day: "2026-01-01", visits: null, views: null }], "views"),
    ).toBeNull();
    expect(change(10, 0)).toBe("이전 기간 0건");
    expect(change(10, null)).toBe("비교 데이터 없음");
  });
  it("finds actionable metadata issues without flagging decorative alt text", () => {
    const post = {
      title: "제목",
      html: '<img src="a"><img src="b" alt="">',
      canonical_url: "bad",
    } as Post;
    expect(auditPost(post)).toEqual([
      "검색 설명을 직접 지정하지 않았습니다. 자동 발췌가 적절한지 확인하세요.",
      "대체 텍스트 속성이 없는 이미지 1개",
      "canonical URL 형식이 올바르지 않습니다.",
    ]);
  });
  it("checks the rendered page, including index blocking", () => {
    const doc = new DOMParser().parseFromString(
      '<title>Title</title><meta name="robots" content="noindex"><h1>Title</h1>',
      "text/html",
    );
    expect(auditDocument(doc)).toEqual([
      "검색 설명 누락",
      "canonical 누락",
      "noindex로 색인 차단 중",
    ]);
  });
});

describe("sitemap audit", () => {
  it("checks child sitemap membership and distinguishes fetch failure", async () => {
    const { auditSitemap } = await import("./data");
    const { vi } = await import("vitest");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            "<sitemapindex><sitemap><loc>http://localhost:3000/sitemap-posts.xml</loc></sitemap></sitemapindex>",
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            "<urlset><url><loc>https://blog.dohyeon.kr/post/</loc></url></urlset>",
          ),
        ),
    );
    // Use the environment origin so the crawler never follows foreign hosts.
    (fetch as ReturnType<typeof vi.fn>)
      .mockReset()
      .mockResolvedValueOnce(
        new Response(
          `<sitemapindex><sitemap><loc>${location.origin}/sitemap-posts.xml</loc></sitemap></sitemapindex>`,
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          "<urlset><url><loc>https://blog.dohyeon.kr/post/</loc></url></urlset>",
        ),
      );
    expect(await auditSitemap("/post/")).toBeNull();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("", { status: 503 }),
    );
    expect(await auditSitemap("/post/")).toContain("확인하지 못했습니다");
    vi.unstubAllGlobals();
  });
});
