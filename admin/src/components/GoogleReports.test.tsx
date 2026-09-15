import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { duration, GA4Panel, SearchPanel } from "./GoogleReports";

describe("GA4 engagement", () => {
  it("distinguishes unavailable time from zero and rounds across minutes", () => {
    expect(duration(null)).toBe("—");
    expect(duration(undefined)).toBe("—");
    expect(duration(0)).toBe("0분 0초");
    expect(duration(59.8)).toBe("1분 0초");
  });
  it("renders channel sessions and time without calling them new users", () => {
    const html = renderToStaticMarkup(
      <GA4Panel
        state={{
          status: "connected",
          propertyId: "123",
          timezone: "Asia/Seoul",
          updatedAt: "2026-09-06T00:00:00Z",
          summary: {
            users: 20,
            sessions: 29,
            views: 40,
            averageEngagementSeconds: 60,
          },
          daily: [],
          sources: [],
          social: [
            { source: "Facebook", sessions: 9, averageEngagementSeconds: 60 },
          ],
          thresholded: false,
        }}
      />,
    );
    expect(html).toContain("Facebook");
    expect(html).toContain("1분 0초");
    expect(html).toContain("신규 방문과 재방문을 모두 포함");
  });
});

describe("Search Console opportunities", () => {
  it("renders ranked SEO work without presenting it as a ranking guarantee", () => {
    const html = renderToStaticMarkup(
      <SearchPanel
        state={{
          status: "connected",
          site: "sc-domain:blog.dohyeon.kr",
          timezone: "America/Los_Angeles",
          updatedAt: "2026-09-15T00:00:00Z",
          summary: { clicks: 10, impressions: 300, ctr: 0.033, position: 8 },
          daily: [],
          queries: [
            { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },
          ],
          queryPages: [
            { query: "storybook 협업", page: "https://blog.dohyeon.kr/storybook/", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },
          ],
        }}
        posts={[{
          id: "post-1",
          title: "Storybook으로 협업하기",
          slug: "storybook",
          status: "published",
          url: "https://blog.dohyeon.kr/storybook/",
          published_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        }]}
      />,
    );

    expect(html).toContain("SEO 기회 후보");
    expect(html).toContain("storybook 협업");
    expect(html).toContain("본문·내부링크 보강");
    expect(html).toContain("Storybook으로 협업하기");
    expect(html).toContain("/ghost/#/editor/post/post-1");
    expect(html).toContain("실제 노출 페이지");
  });
});
