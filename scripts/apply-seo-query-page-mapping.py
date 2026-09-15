from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"expected source block not found: {path}")
    file.write_text(text.replace(old, new, 1))


replace(
    "services/visit-counter/visit_counter.py",
    '''        queries = query(["query"], 50)\n        def values(row):\n            return {key: row[key] for key in ("clicks", "impressions", "ctr", "position")}\n        return {"site": site, "timezone": "America/Los_Angeles",\n                "summary": values(summary["rows"][0]) if summary.get("rows") else None,\n                "daily": sorted([{"day": row["keys"][0], **values(row)} for row in daily.get("rows", [])], key=lambda x: x["day"]),\n                "queries": [{"query": row["keys"][0], **values(row)} for row in queries.get("rows", [])]}\n''',
    '''        queries = query(["query"], 50)\n        query_pages = query(["query", "page"], 1000)\n        def values(row):\n            return {key: row[key] for key in ("clicks", "impressions", "ctr", "position")}\n        return {"site": site, "timezone": "America/Los_Angeles",\n                "summary": values(summary["rows"][0]) if summary.get("rows") else None,\n                "daily": sorted([{"day": row["keys"][0], **values(row)} for row in daily.get("rows", [])], key=lambda x: x["day"]),\n                "queries": [{"query": row["keys"][0], **values(row)} for row in queries.get("rows", [])],\n                "queryPages": [{"query": row["keys"][0], "page": row["keys"][1], **values(row)}\n                               for row in query_pages.get("rows", []) if len(row.get("keys", [])) >= 2]}\n''',
)

replace(
    "services/visit-counter/test_google_reports.py",
    '''    def test_search_totals_include_anonymized_queries(self):\n        total = {'clicks': 20, 'impressions': 100, 'ctr': .2, 'position': 4}\n        query = {'keys': ['hello'], 'clicks': 2, 'impressions': 10, 'ctr': .2, 'position': 4}\n        with patch.object(self.reports, '_post', side_effect=[{'rows': [total]}, {'rows': []}, {'rows': [query]}]) as post:\n            data = self.reports.report('searchConsole', '2026-01-01', '2026-01-02')\n            self.assertEqual(data['summary']['clicks'], 20)\n            self.assertEqual(data['queries'][0]['clicks'], 2)\n            self.assertIn('sc-domain%3Aexample.com', post.call_args.args[0])\n            self.assertEqual(post.call_args.args[1]['dataState'], 'final')\n''',
    '''    def test_search_totals_include_anonymized_queries(self):\n        total = {'clicks': 20, 'impressions': 100, 'ctr': .2, 'position': 4}\n        query = {'keys': ['hello'], 'clicks': 2, 'impressions': 10, 'ctr': .2, 'position': 4}\n        query_page = {'keys': ['hello', 'https://blog.dohyeon.kr/hello/'], 'clicks': 2, 'impressions': 10, 'ctr': .2, 'position': 4}\n        with patch.object(self.reports, '_post', side_effect=[{'rows': [total]}, {'rows': []}, {'rows': [query]}, {'rows': [query_page]}]) as post:\n            data = self.reports.report('searchConsole', '2026-01-01', '2026-01-02')\n            self.assertEqual(data['summary']['clicks'], 20)\n            self.assertEqual(data['queries'][0]['clicks'], 2)\n            self.assertEqual(data['queryPages'][0]['page'], 'https://blog.dohyeon.kr/hello/')\n            self.assertIn('sc-domain%3Aexample.com', post.call_args.args[0])\n            self.assertEqual(post.call_args.args[1]['dataState'], 'final')\n            self.assertEqual(post.call_args.args[1]['dimensions'], ['query', 'page'])\n            self.assertEqual(post.call_args.args[1]['rowLimit'], 1000)\n''',
)

replace(
    "admin/src/lib/seo-opportunities.ts",
    '''export type SearchQueryMetrics = {\n  query: string;\n  clicks: number;\n  impressions: number;\n  ctr: number;\n  position: number;\n};\n''',
    '''export type SearchQueryMetrics = {\n  query: string;\n  page?: string;\n  clicks: number;\n  impressions: number;\n  ctr: number;\n  position: number;\n};\n\nexport type SearchPost = {\n  id: string;\n  title: string;\n  slug: string;\n  url: string;\n};\n''',
)

replace(
    "admin/src/lib/seo-opportunities.ts",
    '''function ctrTarget(position: number) {\n''',
    '''function normalizedPath(value: string) {\n  try {\n    const url = new URL(value, "https://blog.dohyeon.kr");\n    return url.pathname.replace(/\\/+$/, "") || "/";\n  } catch {\n    return null;\n  }\n}\n\nexport function safeSearchPageHref(page: string) {\n  try {\n    const url = new URL(page);\n    if (\n      url.protocol !== "https:" ||\n      !["blog.dohyeon.kr", "dohyeon.kr"].includes(url.hostname)\n    )\n      return null;\n    return `${url.pathname}${url.search}`;\n  } catch {\n    return null;\n  }\n}\n\nexport function matchPostForSearchPage(page: string, posts: SearchPost[]) {\n  const target = normalizedPath(page);\n  if (!target) return undefined;\n  return posts.find((post) => normalizedPath(post.url) === target);\n}\n\nfunction ctrTarget(position: number) {\n''',
)

replace(
    "admin/src/lib/seo-opportunities.test.ts",
    '''import { rankSeoOpportunities } from "./seo-opportunities";\n''',
    '''import {\n  matchPostForSearchPage,\n  rankSeoOpportunities,\n  safeSearchPageHref,\n} from "./seo-opportunities";\n''',
)

replace(
    "admin/src/lib/seo-opportunities.test.ts",
    '''  it("flags low CTR near page one for title and description work", () => {\n    const [row] = rankSeoOpportunities([\n      { query: "프론트엔드 협업", clicks: 1, impressions: 80, ctr: 0.0125, position: 6 },\n    ]);\n\n    expect(row.action).toBe("제목·검색 설명 개선");\n    expect(row.reason).toContain("클릭률");\n  });\n});\n''',
    '''  it("flags low CTR near page one for title and description work", () => {\n    const [row] = rankSeoOpportunities([\n      { query: "프론트엔드 협업", clicks: 1, impressions: 80, ctr: 0.0125, position: 6 },\n    ]);\n\n    expect(row.action).toBe("제목·검색 설명 개선");\n    expect(row.reason).toContain("클릭률");\n  });\n\n  it("keeps the landing page attached to a ranked opportunity", () => {\n    const [row] = rankSeoOpportunities([\n      { query: "expo ota", page: "https://blog.dohyeon.kr/expo-ota/", clicks: 1, impressions: 140, ctr: 0.007, position: 12 },\n    ]);\n\n    expect(row.page).toBe("https://blog.dohyeon.kr/expo-ota/");\n  });\n});\n\ndescribe("search landing mapping", () => {\n  const posts = [\n    { id: "p1", title: "Expo OTA", slug: "expo-ota", url: "https://blog.dohyeon.kr/expo-ota/" },\n  ];\n\n  it("matches canonical search pages to Ghost posts by pathname", () => {\n    expect(matchPostForSearchPage("https://dohyeon.kr/expo-ota/", posts)?.id).toBe("p1");\n  });\n\n  it("only produces same-site HTTPS links", () => {\n    expect(safeSearchPageHref("https://blog.dohyeon.kr/expo-ota/?ref=search")).toBe("/expo-ota/?ref=search");\n    expect(safeSearchPageHref("https://evil.example/expo-ota/")).toBeNull();\n    expect(safeSearchPageHref("javascript:alert(1)")).toBeNull();\n  });\n});\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''import { Card } from "@/components/ui/card";\nimport { number, request } from "@/lib/data";\nimport { rankSeoOpportunities } from "@/lib/seo-opportunities";\n''',
    '''import { Card } from "@/components/ui/card";\nimport { Button } from "@/components/ui/button";\nimport { getPosts, number, request, type Post } from "@/lib/data";\nimport {\n  matchPostForSearchPage,\n  rankSeoOpportunities,\n  safeSearchPageHref,\n} from "@/lib/seo-opportunities";\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''  daily: ({ day: string } & SearchMetrics)[];\n  queries: ({ query: string } & SearchMetrics)[];\n}>;\n''',
    '''  daily: ({ day: string } & SearchMetrics)[];\n  queries: ({ query: string } & SearchMetrics)[];\n  queryPages?: ({ query: string; page: string } & SearchMetrics)[];\n}>;\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''export function SearchPanel({ state }: { state: SearchReport }) {\n  const opportunities =\n    state.status === "connected" ? rankSeoOpportunities(state.queries) : [];\n''',
    '''function SearchLandingCell({\n  page,\n  posts,\n  status,\n}: {\n  page?: string;\n  posts: Post[];\n  status: "idle" | "loading" | "done" | "error";\n}) {\n  if (!page) return <span className="muted">페이지 집계 없음</span>;\n  const href = safeSearchPageHref(page);\n  const post = matchPostForSearchPage(page, posts);\n  if (status === "loading") return <span className="muted">게시물 연결 확인 중…</span>;\n  if (post)\n    return (\n      <div className="post-title">\n        <strong>{post.title}</strong>\n        <small>{href || page}</small>\n        <div className="row-actions">\n          <Button asChild variant="outline" size="sm">\n            <a href={`/ghost/#/editor/post/${post.id}`} target="_blank" rel="noreferrer">편집 ↗</a>\n          </Button>\n          {href && (\n            <Button asChild variant="ghost" size="sm">\n              <a href={href} target="_blank" rel="noreferrer">보기 ↗</a>\n            </Button>\n          )}\n        </div>\n      </div>\n    );\n  return (\n    <div className="post-title">\n      <span>{href || page}</span>\n      <small>{status === "error" ? "게시물 연결을 확인하지 못했습니다." : "Ghost 게시물과 자동 연결되지 않음"}</small>\n      {href && (\n        <a href={href} target="_blank" rel="noreferrer">페이지 보기 ↗</a>\n      )}\n    </div>\n  );\n}\n\nexport function SearchPanel({\n  state,\n  posts: suppliedPosts,\n}: {\n  state: SearchReport;\n  posts?: Post[];\n}) {\n  const queryPages = state.status === "connected" ? state.queryPages || [] : [];\n  const opportunities =\n    state.status === "connected"\n      ? rankSeoOpportunities(queryPages.length ? queryPages : state.queries)\n      : [];\n  const [loadedPosts, setLoadedPosts] = useState<Post[]>([]);\n  const [postStatus, setPostStatus] = useState<"idle" | "loading" | "done" | "error">(\n    suppliedPosts ? "done" : "idle",\n  );\n  const revision = state.status === "connected" ? state.updatedAt : "";\n  useEffect(() => {\n    if (suppliedPosts) {\n      setPostStatus("done");\n      return;\n    }\n    if (!revision || !queryPages.length) {\n      setLoadedPosts([]);\n      setPostStatus("idle");\n      return;\n    }\n    let active = true;\n    setPostStatus("loading");\n    getPosts()\n      .then((value) => {\n        if (!active) return;\n        setLoadedPosts(value);\n        setPostStatus("done");\n      })\n      .catch(() => {\n        if (active) setPostStatus("error");\n      });\n    return () => {\n      active = false;\n    };\n  }, [revision, queryPages.length, suppliedPosts]);\n  const posts = suppliedPosts || loadedPosts;\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''          <p className="muted small">\n            노출·평균 순위·클릭률을 내부 기준으로 조합해 먼저 손볼 검색어를\n            고릅니다. 현재 API는 검색어 집계만 제공하므로 수정할 게시물은 Search\n            Console의 연결 페이지를 확인해 결정하세요.\n          </p>\n''',
    '''          <p className="muted small">\n            노출·평균 순위·클릭률을 내부 기준으로 조합해 먼저 손볼 검색어를\n            고릅니다. 검색어와 실제 노출 페이지를 함께 조회해 Ghost 게시물까지\n            연결하며, 순위 개선을 보장하는 점수는 아닙니다.\n          </p>\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''                    <th>검색어</th>\n                    <th>추천 작업</th>\n''',
    '''                    <th>검색어</th>\n                    <th>연결 페이지</th>\n                    <th>추천 작업</th>\n''',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '''                      <td><strong>{row.query}</strong><br /><span className="muted small">{row.reason}</span></td>\n                      <td>{row.action}</td>\n''',
    '''                      <td><strong>{row.query}</strong><br /><span className="muted small">{row.reason}</span></td>\n                      <td>\n                        <SearchLandingCell page={row.page} posts={posts} status={postStatus} />\n                      </td>\n                      <td>{row.action}</td>\n''',
)

replace(
    "admin/src/components/GoogleReports.test.tsx",
    '''          queries: [\n            { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n        }}\n      />\n''',
    '''          queries: [\n            { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n          queryPages: [\n            { query: "storybook 협업", page: "https://blog.dohyeon.kr/storybook/", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n        }}\n        posts={[{\n          id: "post-1",\n          title: "Storybook으로 협업하기",\n          slug: "storybook",\n          status: "published",\n          url: "https://blog.dohyeon.kr/storybook/",\n          published_at: "2026-09-01T00:00:00Z",\n          updated_at: "2026-09-01T00:00:00Z",\n        }]}\n      />\n''',
)

replace(
    "admin/src/components/GoogleReports.test.tsx",
    '''    expect(html).toContain("본문·내부링크 보강");\n    expect(html).toContain("내부 기준");\n''',
    '''    expect(html).toContain("본문·내부링크 보강");\n    expect(html).toContain("Storybook으로 협업하기");\n    expect(html).toContain("/ghost/#/editor/post/post-1");\n    expect(html).toContain("실제 노출 페이지");\n''',
)
