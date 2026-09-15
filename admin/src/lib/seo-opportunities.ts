export type SearchQueryMetrics = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoOpportunity = SearchQueryMetrics & {
  priority: "높음" | "중간" | "낮음";
  action: "제목·검색 설명 개선" | "본문·내부링크 보강" | "전용 글 검토";
  reason: string;
  score: number;
};

function ctrTarget(position: number) {
  if (position <= 3) return 0.08;
  if (position <= 5) return 0.05;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.015;
  return 0.01;
}

export function rankSeoOpportunities(rows: SearchQueryMetrics[]): SeoOpportunity[] {
  return rows
    .filter(
      (row) =>
        row.impressions >= 10 &&
        Number.isFinite(row.position) &&
        Number.isFinite(row.ctr),
    )
    .map((row): SeoOpportunity | null => {
      const target = ctrTarget(row.position);
      const ctrGap = Math.max(0, target - row.ctr);
      const rankOpportunity = row.position >= 4 && row.position <= 20;
      const lowCtr = row.position <= 10 && ctrGap > 0;
      const underserved = row.position > 20 && row.impressions >= 50;

      if (!rankOpportunity && !lowCtr && !underserved) return null;

      let action: SeoOpportunity["action"];
      let reason: string;
      if (underserved) {
        action = "전용 글 검토";
        reason = "노출은 있지만 평균 순위가 20위 밖입니다. 검색 의도를 직접 다루는 글이 필요한지 확인하세요.";
      } else if (lowCtr) {
        action = "제목·검색 설명 개선";
        reason = "상대적으로 앞쪽에 노출되지만 내부 기준보다 클릭률이 낮습니다.";
      } else {
        action = "본문·내부링크 보강";
        reason = "평균 순위가 4~20위라 기존 글을 보강해 순위를 올릴 여지가 있습니다.";
      }

      const rankWeight = row.position <= 20 ? Math.max(1, 21 - row.position) : 1;
      const score = row.impressions * (rankWeight + ctrGap * 100);
      const priority =
        row.impressions >= 100 && row.position <= 20
          ? "높음"
          : row.impressions >= 30
            ? "중간"
            : "낮음";

      return { ...row, priority, action, reason, score };
    })
    .filter((row): row is SeoOpportunity => row !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
