import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { number, type Point } from "@/lib/data";
export function Trend({
  points,
  previous,
  metric,
}: {
  points: Point[];
  previous: Point[];
  metric: "visits" | "views";
}) {
  const data = points.map((p, i) => ({
    day: p.day.slice(5).replace("-", "."),
    current: p[metric],
    previous: previous[i]?.[metric] ?? null,
  }));
  if (!data.some((p) => p.current !== null))
    return (
      <div className="chart-empty">이 기간에는 수집된 데이터가 없습니다.</div>
    );
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`${metric === "visits" ? "방문 횟수" : "게시물 조회수"} 일별 추이. 아래 일별 데이터에서 정확한 수치를 확인할 수 있습니다.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43765b" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#43765b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e9ebe6" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              minTickGap={35}
              tick={{ fontSize: 12, fill: "#737b72" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={48}
              tick={{ fontSize: 12, fill: "#737b72" }}
            />
            <Tooltip
              formatter={(value) => number(value as number)}
              contentStyle={{ borderRadius: 8, border: "1px solid #e0e4dc" }}
            />
            <Area
              type="monotone"
              dataKey="previous"
              name="이전 기간"
              stroke="#9ca49a"
              strokeDasharray="4 5"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              name="선택 기간"
              stroke="#43765b"
              strokeWidth={2.5}
              fill="url(#fill)"
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
                <th>선택 기간</th>
                <th>비교 날짜</th>
                <th>이전 기간</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.day}>
                  <td>{p.day}</td>
                  <td>{number(p[metric])}</td>
                  <td>{previous[i]?.day}</td>
                  <td>{number(previous[i]?.[metric])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
