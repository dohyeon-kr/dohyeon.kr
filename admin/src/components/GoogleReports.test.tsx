import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { duration, GA4Panel } from "./GoogleReports";

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
