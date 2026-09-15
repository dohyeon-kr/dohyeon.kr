import { describe, expect, it } from "vitest";
import { rankSeoOpportunities } from "./seo-opportunities";

describe("rankSeoOpportunities", () => {
  it("prioritizes impressions with realistic ranking upside", () => {
    const rows = rankSeoOpportunities([
      { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },
      { query: "브랜드 검색", clicks: 90, impressions: 100, ctr: 0.9, position: 1 },
      { query: "expo ota", clicks: 0, impressions: 120, ctr: 0, position: 24 },
      { query: "희소 검색어", clicks: 0, impressions: 5, ctr: 0, position: 10 },
    ]);

    expect(rows.map((row) => row.query)).toEqual(["storybook 협업", "expo ota"]);
    expect(rows[0].action).toBe("본문·내부링크 보강");
    expect(rows[0].priority).toBe("높음");
    expect(rows[1].action).toBe("전용 글 검토");
  });

  it("flags low CTR near page one for title and description work", () => {
    const [row] = rankSeoOpportunities([
      { query: "프론트엔드 협업", clicks: 1, impressions: 80, ctr: 0.0125, position: 6 },
    ]);

    expect(row.action).toBe("제목·검색 설명 개선");
    expect(row.reason).toContain("클릭률");
  });
});
