import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { number, request } from "@/lib/data";

type State<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "connected"; updatedAt: string; timezone: string } & T);
export type GA4 = State<{
  propertyId: string;
  summary: { users: number; sessions: number; views: number };
  daily: { day: string; users: number; sessions: number; views: number }[];
  sources: { source: string; sessions: number }[];
  thresholded: boolean;
}>;
type SearchMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type SearchReport = State<{
  site: string;
  summary: SearchMetrics | null;
  daily: ({ day: string } & SearchMetrics)[];
  queries: ({ query: string } & SearchMetrics)[];
}>;
export function useGoogleReport<T extends GA4 | SearchReport>(
  provider: string,
  start: string,
  end: string,
  revision: number,
  enabled: boolean,
): T {
  const [state, setState] = useState<T>({ status: "loading" } as T);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" } as T);
    if (!enabled) return () => controller.abort();
    request<T>(
      `/ghost/api/dashboard/google?provider=${provider}&start=${start}&end=${end}`,
      {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(45000),
        ]),
      },
    )
      .then((value) => {
        if (!controller.signal.aborted) setState(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            status: "error",
            message:
              "통계를 불러오지 못했습니다. 상단 새로고침으로 다시 시도해 주세요.",
          } as T);
      });
    return () => controller.abort();
  }, [provider, start, end, revision, enabled]);
  return state;
}
export const connectionLabel = (state: GA4 | SearchReport) =>
  state.status === "connected"
    ? "연결됨"
    : state.status === "loading"
      ? "확인 중"
      : "연결 확인 필요";
const percent = (value: number | undefined) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`;
function ReportState({ state }: { state: GA4 | SearchReport }) {
  return state.status === "connected" ? null : (
    <p role={state.status === "error" ? "alert" : "status"} className="muted">
      {state.status === "loading"
        ? "Google 통계를 불러오고 있습니다…"
        : state.message}
    </p>
  );
}
function ReportChart({
  rows,
  metric,
  label,
  id,
}: {
  rows: { day: string; [key: string]: string | number }[];
  metric: string;
  label: string;
  id: string;
}) {
  if (!rows.length)
    return <p className="chart-empty">이 기간에 반환된 데이터가 없습니다.</p>;
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`${label} 일별 추이. 아래 일별 데이터에서 수치를 확인하세요.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-current)"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-current)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="day"
              tickFormatter={(value) => value.slice(5)}
              minTickGap={35}
            />
            <YAxis allowDecimals={false} width={48} />
            <Tooltip formatter={(value) => number(Number(value))} />
            <Area
              dataKey={metric}
              name={label}
              dot={{ r: 3 }}
              stroke="var(--chart-current)"
              fill={`url(#${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>일별 데이터 보기</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>{label}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>{number(Number(row[metric]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
function Updated({ state }: { state: GA4 | SearchReport }) {
  return state.status === "connected" ? (
    <p className="muted small">
      조회 {new Date(state.updatedAt).toLocaleString("ko-KR")} · 최대 5분 캐시 ·
      날짜 기준 {state.timezone}
    </p>
  ) : null;
}
export function GA4Panel({ state }: { state: GA4 }) {
  return (
    <Card className="google-report">
      <div className="panel-heading">
        <div>
          <h2>방문자와 유입 경로</h2>
          <p className="muted small">
            GA4 · 전체 사용자 수는 선택 기간의 중복을 제거한 값입니다.
          </p>
        </div>
        <span className="tag">{connectionLabel(state)}</span>
      </div>
      <ReportState state={state} />
      {state.status === "connected" && (
        <>
          <dl className="google-summary">
            <div>
              <dt>전체 사용자</dt>
              <dd>{number(state.summary.users)}</dd>
            </div>
            <div>
              <dt>세션</dt>
              <dd>{number(state.summary.sessions)}</dd>
            </div>
            <div>
              <dt>페이지·화면 조회</dt>
              <dd>{number(state.summary.views)}</dd>
            </div>
          </dl>
          <ReportChart
            rows={state.daily}
            metric="users"
            label="일별 사용자"
            id="ga4-users"
          />
          <h3>유입 경로 상위 20개</h3>
          <p className="muted small">
            세션 소스 / 매체 기준 · 일별 사용자 합계는 기간 전체 사용자와 다를
            수 있습니다.
          </p>
          {state.sources.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>소스 / 매체</th>
                    <th>세션</th>
                  </tr>
                </thead>
                <tbody>
                  {state.sources.map((row) => (
                    <tr key={row.source}>
                      <td>{row.source}</td>
                      <td>{number(row.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">이 기간에 반환된 유입 경로가 없습니다.</p>
          )}
          <p className="muted small">
            최근 데이터는 처리 중일 수 있습니다. 태그 차단과 Google의 사용자
            식별 방식에 따라 자체 방문 집계와 다릅니다.
            {state.thresholded &&
              " Google의 개인정보 보호 기준에 따라 일부 데이터가 제한됩니다."}
          </p>
          <Updated state={state} />
        </>
      )}
    </Card>
  );
}
export function SearchPanel({ state }: { state: SearchReport }) {
  return (
    <Card className="google-report">
      <div className="panel-heading">
        <div>
          <h2>Google 검색 성과</h2>
          <p className="muted small">
            웹 검색 · 확정된 데이터만 표시하므로 최근 며칠은 빠질 수 있습니다.
          </p>
        </div>
        <span className="tag">{connectionLabel(state)}</span>
      </div>
      <ReportState state={state} />
      {state.status === "connected" && (
        <>
          <dl className="google-summary">
            <div>
              <dt>클릭</dt>
              <dd>{number(state.summary?.clicks)}</dd>
            </div>
            <div>
              <dt>노출</dt>
              <dd>{number(state.summary?.impressions)}</dd>
            </div>
            <div>
              <dt>클릭률</dt>
              <dd>{percent(state.summary?.ctr)}</dd>
            </div>
            <div>
              <dt>평균 순위</dt>
              <dd>{state.summary?.position.toFixed(1) ?? "—"}</dd>
            </div>
          </dl>
          <ReportChart
            rows={state.daily}
            metric="clicks"
            label="검색 클릭"
            id="search-clicks"
          />
          <h3>검색어 상위 50개</h3>
          {state.queries.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>검색어</th>
                    <th>클릭</th>
                    <th>노출</th>
                    <th>클릭률</th>
                    <th>평균 순위</th>
                  </tr>
                </thead>
                <tbody>
                  {state.queries.map((row) => (
                    <tr key={row.query}>
                      <td>{row.query}</td>
                      <td>{number(row.clicks)}</td>
                      <td>{number(row.impressions)}</td>
                      <td>{percent(row.ctr)}</td>
                      <td>{row.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">이 기간에 공개된 검색어 데이터가 없습니다.</p>
          )}
          <p className="muted small">
            익명 처리된 검색어는 표시되지 않습니다. 검색어 표의 합계와 전체
            클릭·노출은 다를 수 있습니다.
          </p>
          <Updated state={state} />
        </>
      )}
    </Card>
  );
}
