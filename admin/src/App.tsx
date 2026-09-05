import {
  GA4Panel,
  SearchPanel,
  useGoogleReport,
  connectionLabel,
  type GA4,
  type SearchReport,
} from "@/components/GoogleReports";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { Trend } from "@/components/Trend";
import {
  auditDocument,
  auditSitemap,
  auditPost,
  change,
  getComments,
  getPosts,
  number,
  range,
  request,
  safePostUrl,
  sum,
  today,
  type Comment,
  type Post,
  type Stats,
} from "@/lib/data";
const sections = [
  ["overview", "개요", "01"],
  ["posts", "콘텐츠", "02"],
  ["comments", "댓글", "03"],
  ["seo", "SEO", "04"],
  ["settings", "설정", "05"],
] as const;
type Section = (typeof sections)[number][0];
const descriptions = {
  overview: "블로그의 흐름을 살피고, 다음 할 일을 정하세요.",
  posts: "글마다 쌓이는 관심을 확인하세요.",
  comments: "독자의 이야기를 한곳에서 관리하세요.",
  seo: "검색에 잘 전달되는 글을 만드세요.",
  settings: "데이터의 출처와 수집 상태를 확인하세요.",
};
const dateLabel = (s: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(s));
export default function App() {
  const [section, setSection] = useState<Section>(() =>
    sections.some((s) => s[0] === location.hash.slice(1))
      ? (location.hash.slice(1) as Section)
      : "overview",
  );
  const [period, setPeriod] = useState(range(30));
  const [draft, setDraft] = useState(period);
  const [preset, setPreset] = useState("30");
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState("");
  const [postError, setPostError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [metric, setMetric] = useState<"visits" | "views">("visits");
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<{
    ids: string[];
    kind: "hide" | "restore" | "delete";
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<Post | null>(null);
  const [inspection, setInspection] = useState<{
    slug: string;
    text: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const sync = () => {
      const key = location.hash.slice(1);
      if (sections.some((s) => s[0] === key)) {
        setSection(key as Section);
        setSearch("");
        setSelected([]);
      }
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setPostError("");
    setCommentError("");
    setStats(null);
    setPosts([]);
    setComments([]);
    setSelected([]);
    (async () => {
      try {
        const result = await request<Stats>(
          `/ghost/api/dashboard?start=${period.start}&end=${period.end}`,
        );
        if (!active) return;
        setStats(result);
        await Promise.all([
          getPosts()
            .then((p) => {
              if (active) setPosts(p);
            })
            .catch((e) => {
              if (active) setPostError(e.message);
            }),
          getComments()
            .then((c) => {
              if (active) setComments(c);
            })
            .catch((e) => {
              if (active) setCommentError(e.message);
            }),
        ]);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [period, revision]);
  const ga4 = useGoogleReport<GA4>(
    "ga4",
    period.start,
    period.end,
    revision,
    !!stats,
  );
  const searchReport = useGoogleReport<SearchReport>(
    "searchConsole",
    period.start,
    period.end,
    revision,
    !!stats,
  );
  const navigate = (key: Section) => {
    location.hash = key;
    setSection(key);
    setSearch("");
    setSelected([]);
  };
  const published = useMemo(
    () => new Map(posts.map((p) => [p.slug, p])),
    [posts],
  );
  const rows = useMemo(() => {
    const bySlug = new Map(stats?.posts.map((p) => [p.slug, p]) || []);
    const all = new Set([...published.keys(), ...bySlug.keys()]);
    return [...all]
      .map((slug) => ({
        slug,
        title: published.get(slug)?.title || slug,
        lifetime: bySlug.get(slug)?.lifetime ?? 0,
        views:
          bySlug.get(slug)?.views ??
          (stats && stats.end >= stats.coverage.postDailySince.slice(0, 10)
            ? 0
            : null),
        previous: bySlug.get(slug)?.previous ?? null,
        post: published.get(slug),
      }))
      .sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
  }, [stats, published]);
  const visibleComments = comments.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      `${c.body} ${c.displayName} ${published.get(c.postSlug)?.title || c.postSlug}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const postColumns = [
    {
      accessorKey: "title",
      header: "게시물",
      cell: ({ row }: any) => (
        <div className="post-title">
          <button
            onClick={() =>
              row.original.post
                ? setDetail(row.original.post)
                : window.open(
                    "/" + encodeURIComponent(row.original.slug) + "/",
                    "_blank",
                    "noopener",
                  )
            }
          >
            {row.original.title}
          </button>
          <small>/{row.original.slug}/</small>
        </div>
      ),
    },
    {
      accessorKey: "views",
      header: "기간 조회",
      cell: ({ getValue }: any) => number(getValue()),
    },
    {
      accessorKey: "previous",
      header: "변화",
      cell: ({ row }: any) => (
        <span className="muted">
          {change(row.original.views, row.original.previous)}
        </span>
      ),
    },
    {
      accessorKey: "lifetime",
      header: "누적 조회",
      cell: ({ getValue }: any) => number(getValue()),
    },
  ];
  async function moderate() {
    if (!action) return;
    setSaving(true);
    setNotice("");
    const failed: string[] = [];
    for (const id of action.ids) {
      try {
        await request(
          `/ghost/api/comments-admin/${id}`,
          action.kind === "delete"
            ? { method: "DELETE" }
            : {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: action.kind }),
              },
        );
      } catch {
        failed.push(id);
      }
    }
    setSaving(false);
    setAction(null);
    setNotice(
      failed.length
        ? `${action.ids.length - failed.length}개 처리됨. ${failed.length}개는 처리하지 못했습니다. 상태를 확인 후 다시 시도하세요.`
        : `${action.ids.length}개 댓글을 처리했습니다.`,
    );
    setRevision((v) => v + 1);
  }
  async function inspect(post: Post) {
    setChecking(true);
    setInspection(null);
    try {
      const response = await fetch(safePostUrl(post), { credentials: "omit" });
      if (!response.ok) throw new Error("페이지를 불러오지 못했습니다.");
      const issues = auditDocument(
        new DOMParser().parseFromString(await response.text(), "text/html"),
      );
      if (/noindex/i.test(response.headers.get("x-robots-tag") || ""))
        issues.push("HTTP 헤더에서 색인 차단 중");
      const sitemapIssue = await auditSitemap(safePostUrl(post));
      if (sitemapIssue) issues.push(sitemapIssue);
      setInspection({
        slug: post.slug,
        text: issues.length
          ? issues.join(" · ")
          : "title, 검색 설명, canonical, robots, H1, sitemap 기본 점검을 통과했습니다. 검색 색인 여부는 Search Console에서 확인하세요.",
      });
    } catch (e) {
      setInspection({ slug: post.slug, text: (e as Error).message });
    } finally {
      setChecking(false);
    }
  }
  const complete = (key: "visits" | "views") =>
    stats &&
    stats.previous.every((p) => p[key] !== null) &&
    stats.daily.every((p) => p[key] !== null) &&
    (key !== "views" ||
      stats.previous[0].day > stats.coverage.postDailySince.slice(0, 10));
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <a className="brand" href="/">
          D<span>LOG</span>
          <i>.</i>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">D</span>
          <div>
            <strong>dohyeon.kr</strong>
            <small>블로그 관리</small>
          </div>
          <span className="live-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="관리자 메뉴">
          {sections.map(([key, label, index]) => (
            <a
              href={"#" + key}
              key={key}
              aria-current={section === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <span className="nav-index">{index}</span>
              {label}
              {key === "comments" && stats && (
                <span className="nav-count">
                  {number(stats.comments.visible)}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/ghost/">Ghost에서 글 쓰기 ↗</a>
          <a href="/">블로그 보기 ↗</a>
          <small>조금씩, 꾸준히 쌓이는 기록.</small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            WORKSPACE <b>/</b> {sections.find((s) => s[0] === section)?.[1]}
          </span>
          <a href="/ghost/" className="admin-account">
            Ghost 관리자 ↗
          </a>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">YOUR BLOG, AT A GLANCE</p>
              <h1>
                {sections.find((s) => s[0] === section)?.[1] === "개요"
                  ? "블로그 대시보드"
                  : sections.find((s) => s[0] === section)?.[1]}
              </h1>
              <p className="muted">{descriptions[section]}</p>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRevision((v) => v + 1)}
            >
              {busy ? "불러오는 중…" : "새로고침 ↻"}
            </Button>
          </div>
          <div className="period-bar">
            <div className="period-controls">
              <label className="sr-only" htmlFor="period">
                조회 기간
              </label>
              <select
                id="period"
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  if (e.target.value !== "custom") {
                    const next = range(Number(e.target.value));
                    setPeriod(next);
                    setDraft(next);
                  }
                }}
              >
                <option value="7">최근 7일</option>
                <option value="30">최근 30일</option>
                <option value="90">최근 90일</option>
                <option value="custom">직접 지정</option>
              </select>
              {preset === "custom" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      draft.start &&
                      draft.end &&
                      draft.start <= draft.end &&
                      (Date.parse(draft.end) - Date.parse(draft.start)) /
                        86400000 <=
                        365
                    ) {
                      setPeriod({ ...draft });
                      setNotice("");
                    } else
                      setNotice(
                        "시작일과 종료일을 확인하세요. 최대 366일까지 선택할 수 있습니다.",
                      );
                  }}
                >
                  <input
                    aria-label="시작일"
                    type="date"
                    required
                    value={draft.start}
                    max={draft.end}
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                  />
                  <span>—</span>
                  <input
                    aria-label="종료일"
                    type="date"
                    required
                    value={draft.end}
                    min={draft.start}
                    max={today()}
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                  />
                  <Button size="sm" variant="outline">
                    적용
                  </Button>
                </form>
              ) : (
                <span className="date-range">
                  {period.start.replaceAll("-", ".")} —{" "}
                  {period.end.replaceAll("-", ".")}
                </span>
              )}
            </div>
            <span className="muted small">KST 기준 · 오늘 데이터 집계 중</span>
          </div>
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          {error && (
            <Card className="empty-state">
              <h2>관리자 연결을 확인해 주세요</h2>
              <p role="alert">{error}</p>
              <Button asChild>
                <a href="/ghost/">Ghost 로그인</a>
              </Button>
            </Card>
          )}
          {busy && !stats && (
            <div className="loading" role="status">
              대시보드 데이터를 불러오고 있습니다…
            </div>
          )}
          {stats && (
            <>
              {section === "overview" && (
                <>
                  <div className="metrics">
                    <Metric
                      title="방문 횟수"
                      value={number(sum(stats.daily, "visits"))}
                      note={
                        complete("visits")
                          ? `${change(sum(stats.daily, "visits"), sum(stats.previous, "visits"))} · 이전 기간 대비`
                          : "일부 기간 미수집 · 수집분 합계"
                      }
                      footer="동일 브라우저 30분 간격 집계"
                    />
                    <Metric
                      title="게시물 조회"
                      value={number(sum(stats.daily, "views"))}
                      note={
                        complete("views")
                          ? `${change(sum(stats.daily, "views"), sum(stats.previous, "views"))} · 이전 기간 대비`
                          : "일별 기록 수집 중 · 수집분 합계"
                      }
                      footer="누적 조회수와 별도 집계"
                    />
                    <Metric
                      title="공개 댓글"
                      value={
                        commentError ? "—" : number(stats.comments.visible)
                      }
                      note={`숨김 ${number(stats.comments.hidden)}개`}
                      footer="전체 기간 · 관리 가능한 댓글"
                    />
                    <Metric
                      title="검색 클릭"
                      value={number(
                        searchReport.status === "connected"
                          ? searchReport.summary?.clicks
                          : null,
                      )}
                      note={connectionLabel(searchReport)}
                      footer="Google 검색 성과"
                    />
                  </div>
                  <GA4Panel state={ga4} />
                  <Card>
                    <div className="panel-heading">
                      <div>
                        <h2>관심의 흐름</h2>
                        <p className="muted small">
                          실선은 선택 기간, 점선은 이전 기간입니다.
                        </p>
                      </div>
                      <div className="segmented">
                        <button
                          aria-pressed={metric === "visits"}
                          onClick={() => setMetric("visits")}
                        >
                          방문 횟수
                        </button>
                        <button
                          aria-pressed={metric === "views"}
                          onClick={() => setMetric("views")}
                        >
                          게시물 조회
                        </button>
                      </div>
                    </div>
                    <Trend
                      points={stats.daily}
                      previous={stats.previous}
                      metric={metric}
                    />
                  </Card>
                  <div className="bottom-grid">
                    <Card>
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">CONTENT</p>
                          <h2>많이 읽힌 글</h2>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("posts")}
                        >
                          전체 보기 →
                        </Button>
                      </div>
                      {postError && (
                        <p className="inline-error">
                          {postError} 게시물 제목 대신 주소를 표시합니다.
                        </p>
                      )}
                      <DataTable
                        data={rows.slice(0, 5)}
                        columns={postColumns.filter(
                          (c) => c.accessorKey !== "previous",
                        )}
                        label="인기 게시물"
                      />
                    </Card>
                    <Card>
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">NEXT UP</p>
                          <h2>다음 할 일</h2>
                        </div>
                        <span className="tag">운영 메모</span>
                      </div>
                      <button
                        className="task-row"
                        onClick={() => navigate("comments")}
                      >
                        <span className="task-number">01</span>
                        <span>
                          <strong>댓글 살펴보기</strong>
                          <small>
                            {number(stats.comments.visible)}개 공개 ·{" "}
                            {number(stats.comments.hidden)}개 숨김
                          </small>
                        </span>
                        <span>↗</span>
                      </button>
                      <button
                        className="task-row"
                        onClick={() => navigate("seo")}
                      >
                        <span className="task-number">02</span>
                        <span>
                          <strong>검색 기본 설정 점검</strong>
                          <small>
                            {busy
                              ? "점검 데이터를 불러오는 중…"
                              : postError
                                ? "게시물 연결 확인 필요"
                                : `${posts.filter((p) => auditPost(p).length).length}개 게시물 확인 필요`}
                          </small>
                        </span>
                        <span>↗</span>
                      </button>
                      <button
                        className="task-row"
                        onClick={() => navigate("settings")}
                      >
                        <span className="task-number">03</span>
                        <span>
                          <strong>데이터 수집 상태 확인</strong>
                          <small>조회 추이는 새 기록부터 시작합니다</small>
                        </span>
                        <span>↗</span>
                      </button>
                    </Card>
                  </div>
                </>
              )}
              {section === "posts" && (
                <Card>
                  <div className="panel-heading">
                    <div>
                      <h2>게시물 성과</h2>
                      <p className="muted small">
                        제목을 누르면 글의 일별 조회 추이를 확인할 수 있습니다.
                      </p>
                    </div>
                    <input
                      type="search"
                      placeholder="게시물 검색"
                      aria-label="게시물 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {postError && (
                    <p role="alert" className="inline-error">
                      {postError}
                    </p>
                  )}
                  <p className="coverage-note">
                    조회 추이 수집 시작:{" "}
                    {dateLabel(stats.coverage.postDailySince)}. 그 이전 데이터는
                    제공되지 않으며, 시작일은 일부 시간만 포함합니다.
                  </p>
                  <DataTable
                    data={rows.filter(
                      (r) =>
                        r.title.toLowerCase().includes(search.toLowerCase()) ||
                        r.slug.includes(search),
                    )}
                    columns={postColumns}
                    label="게시물별 조회수"
                  />
                </Card>
              )}
              {section === "comments" && (
                <Card>
                  <div className="panel-heading">
                    <div>
                      <h2>독자의 이야기</h2>
                      <p className="muted small">
                        숨긴 댓글은 복구할 수 있습니다. 영구 삭제는 본문을
                        제거합니다.
                      </p>
                    </div>
                    <input
                      type="search"
                      placeholder="내용, 작성자, 게시물 검색"
                      aria-label="댓글 검색"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSelected([]);
                      }}
                    />
                  </div>
                  <div className="comment-toolbar">
                    <select
                      aria-label="댓글 상태"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setSelected([]);
                      }}
                    >
                      <option value="all">모든 댓글</option>
                      <option value="visible">공개</option>
                      <option value="hidden">숨김</option>
                      <option value="deleted">삭제됨</option>
                    </select>
                    <span className="muted small">
                      {selected.length}개 선택
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!selected.length}
                      onClick={() => setAction({ ids: selected, kind: "hide" })}
                    >
                      선택 숨김
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!selected.length}
                      onClick={() =>
                        setAction({ ids: selected, kind: "restore" })
                      }
                    >
                      선택 복구
                    </Button>
                  </div>
                  {commentError ? (
                    <p role="alert" className="inline-error">
                      {commentError}
                    </p>
                  ) : (
                    <DataTable
                      data={visibleComments}
                      label="댓글 목록"
                      columns={[
                        {
                          id: "select",
                          header: () => {
                            const ids = visibleComments
                              .filter((c) => c.status !== "deleted")
                              .map((c) => c.id);
                            return (
                              <input
                                type="checkbox"
                                aria-label="검색된 댓글 전체 선택"
                                checked={
                                  ids.length > 0 &&
                                  ids.every((id) => selected.includes(id))
                                }
                                onChange={(e) =>
                                  setSelected(e.target.checked ? ids : [])
                                }
                              />
                            );
                          },
                          cell: ({ row }: any) => (
                            <input
                              type="checkbox"
                              aria-label={`${row.original.displayName || "삭제된"} 댓글 선택`}
                              disabled={row.original.status === "deleted"}
                              checked={selected.includes(row.original.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, row.original.id]
                                    : selected.filter(
                                        (id) => id !== row.original.id,
                                      ),
                                )
                              }
                            />
                          ),
                        },
                        {
                          accessorKey: "body",
                          header: "댓글",
                          cell: ({ row }: any) => (
                            <div className="comment-body">
                              <strong>
                                {row.original.displayName || "삭제된 댓글"}
                              </strong>
                              <p>
                                {row.original.status === "deleted"
                                  ? "본문이 영구 삭제되었습니다."
                                  : row.original.body}
                              </p>
                              <a
                                href={
                                  "/" +
                                  encodeURIComponent(row.original.postSlug) +
                                  "/"
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                {published.get(row.original.postSlug)?.title ||
                                  row.original.postSlug}{" "}
                                ↗
                              </a>
                            </div>
                          ),
                        },
                        {
                          accessorKey: "status",
                          header: "상태",
                          cell: ({ getValue }: any) => (
                            <span className={"tag " + getValue()}>
                              {
                                (
                                  {
                                    visible: "공개",
                                    hidden: "숨김",
                                    deleted: "삭제됨",
                                  } as any
                                )[getValue()]
                              }
                            </span>
                          ),
                        },
                        {
                          accessorKey: "createdAt",
                          header: "작성일",
                          cell: ({ getValue }: any) => dateLabel(getValue()),
                        },
                        {
                          id: "actions",
                          header: "관리",
                          cell: ({ row }: any) =>
                            row.original.status !== "deleted" && (
                              <div className="row-actions">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setAction({
                                      ids: [row.original.id],
                                      kind:
                                        row.original.status === "hidden"
                                          ? "restore"
                                          : "hide",
                                    })
                                  }
                                >
                                  {row.original.status === "hidden"
                                    ? "복구"
                                    : "숨김"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setAction({
                                      ids: [row.original.id],
                                      kind: "delete",
                                    })
                                  }
                                >
                                  영구 삭제
                                </Button>
                              </div>
                            ),
                        },
                      ]}
                    />
                  )}
                </Card>
              )}
              {section === "seo" && (
                <>
                  <SearchPanel state={searchReport} />
                  <Card>
                    <div className="panel-heading">
                      <div>
                        <h2>게시물 기본 SEO 점검</h2>
                        <p className="muted small">
                          공개된 글의 메타데이터와 본문을 확인합니다. 점검
                          결과는 검색 순위를 보장하지 않습니다.
                        </p>
                      </div>
                    </div>
                    {postError ? (
                      <p role="alert" className="inline-error">
                        {postError}
                      </p>
                    ) : (
                      <DataTable
                        data={posts
                          .map((p) => ({ ...p, issues: auditPost(p) }))
                          .sort((a, b) => b.issues.length - a.issues.length)}
                        label="SEO 점검"
                        columns={[
                          {
                            accessorKey: "title",
                            header: "게시물",
                            cell: ({ row }: any) => (
                              <div className="post-title">
                                <a
                                  href={`/ghost/#/editor/post/${row.original.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {row.original.title} ↗
                                </a>
                              </div>
                            ),
                          },
                          {
                            id: "issues",
                            header: "확인할 항목",
                            cell: ({ row }: any) => (
                              <div className="seo-issues">
                                {row.original.issues.length ? (
                                  row.original.issues.map((s: string) => (
                                    <p key={s}>{s}</p>
                                  ))
                                ) : (
                                  <span className="muted">
                                    메타데이터·본문 기본 점검 통과
                                  </span>
                                )}
                                {inspection?.slug === row.original.slug && (
                                  <p role="status" className="inspection">
                                    {inspection?.text}
                                  </p>
                                )}
                              </div>
                            ),
                          },
                          {
                            id: "inspect",
                            header: "실제 페이지",
                            cell: ({ row }: any) => (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={checking}
                                onClick={() => inspect(row.original)}
                              >
                                페이지 점검
                              </Button>
                            ),
                          },
                        ]}
                      />
                    )}
                  </Card>
                </>
              )}
              {section === "settings" && (
                <>
                  <Card>
                    <div className="panel-heading">
                      <h2>데이터 연결</h2>
                      <span className="tag visible">자체 집계 사용 중</span>
                    </div>
                    <dl className="settings-list">
                      <div>
                        <dt>방문 횟수</dt>
                        <dd>
                          기존 자체 카운터 · 동일 브라우저에서 30분 간격 집계.
                          순 방문자 수가 아닙니다. 브라우저 저장소 차단이나 자동
                          요청으로 실제 방문과 차이가 날 수 있습니다.
                        </dd>
                      </div>
                      <div>
                        <dt>게시물 조회 추이</dt>
                        <dd>
                          {dateLabel(stats.coverage.postDailySince)}부터 기록.
                          누적 조회수는 기존 값을 유지합니다. 주소가 바뀌면 서로
                          다른 게시물로 집계됩니다.
                        </dd>
                      </div>
                      <div>
                        <dt>순 방문자 · 유입 경로</dt>
                        <dd>
                          <span className="tag">
                            GA4 {connectionLabel(ga4)}
                          </span>{" "}
                          {ga4.status === "error"
                            ? ga4.message
                            : "전체 사용자·세션·유입 경로는 개요에서 확인할 수 있습니다."}
                        </dd>
                      </div>
                      <div>
                        <dt>검색어 · 검색 클릭</dt>
                        <dd>
                          <span className="tag">
                            Search Console {connectionLabel(searchReport)}
                          </span>{" "}
                          {searchReport.status === "error"
                            ? searchReport.message
                            : "검색어·클릭·노출·클릭률·평균 순위는 SEO에서 확인할 수 있습니다."}
                        </dd>
                      </div>
                      <div>
                        <dt>관리자 권한</dt>
                        <dd>
                          Ghost Owner / Administrator 세션으로 보호됩니다. 권한
                          관리는{" "}
                          <a href="/ghost/#/settings/staff">Ghost에서 설정</a>
                          합니다.
                        </dd>
                      </div>
                      <div>
                        <dt>마지막 조회</dt>
                        <dd>
                          {new Date(stats.updatedAt).toLocaleString("ko-KR", {
                            timeZone: "Asia/Seoul",
                          })}{" "}
                          · {stats.timezone}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                  <Card className="note-panel">
                    <h2>수치를 읽는 기준</h2>
                    <p>
                      ‘—’는 데이터 없음, ‘0’은 수집 가능한 기간의 기록이 0건임을
                      뜻합니다. 이전 기간이 모두 수집된 경우에만 증감률을
                      표시합니다. 당일 수치는 집계 중이며, 기간 비교에도 당일이
                      포함됩니다.
                    </p>
                    <p>
                      현재 댓글 시스템은 작성 즉시 공개됩니다. 승인 대기·스팸
                      분류·관리자 답글은 별도 데이터 구조와 공개 화면 변경이
                      필요한 후속 기능입니다.
                    </p>
                  </Card>
                </>
              )}
              <footer className="page-footer">
                <span>dohyeon.kr · 작은 기록의 흐름</span>
                <span>
                  마지막 조회{" "}
                  {new Date(stats.updatedAt).toLocaleTimeString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  KST
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <Dialog
        open={!!action}
        onOpenChange={(v) => {
          if (!v && !saving) setAction(null);
        }}
        title={
          action?.kind === "delete"
            ? "댓글을 영구 삭제할까요?"
            : action?.kind === "restore"
              ? "댓글을 다시 공개할까요?"
              : "댓글을 숨길까요?"
        }
        description={
          action?.kind === "delete"
            ? "작성자 이름과 본문을 지우며 복구할 수 없습니다."
            : `${action?.ids.length || 0}개 댓글에 적용합니다. 숨긴 댓글은 관리자 화면에서 복구할 수 있습니다.`
        }
      >
        <div className="dialog-actions">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => setAction(null)}
          >
            취소
          </Button>
          <Button
            variant={action?.kind === "delete" ? "destructive" : "default"}
            disabled={saving}
            onClick={moderate}
          >
            {saving ? "처리 중…" : "확인"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
        title={detail?.title || "게시물"}
        description="선택한 기간의 일별 조회 추이입니다."
      >
        {detail && stats && <PostDetail post={detail} stats={stats} />}
      </Dialog>
    </div>
  );
}
function Metric({
  title,
  value,
  note,
  footer,
}: {
  title: string;
  value: string;
  note: string;
  footer: string;
}) {
  return (
    <Card className="metric">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{note}</span>
      <small>{footer}</small>
    </Card>
  );
}
function PostDetail({ post, stats }: { post: Post; stats: Stats }) {
  const [data, setData] = useState<{
    daily: Stats["daily"];
    previous: Stats["previous"];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    request<{ daily: Stats["daily"]; previous: Stats["previous"] }>(
      `/ghost/api/dashboard/post?slug=${encodeURIComponent(post.slug)}&start=${stats.start}&end=${stats.end}`,
    )
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [post.slug, stats.start, stats.end]);
  return (
    <>
      {error ? (
        <p role="alert">{error}</p>
      ) : data ? (
        <Trend points={data.daily} previous={data.previous} metric="views" />
      ) : (
        <p role="status">조회 추이를 불러오는 중…</p>
      )}
      <div className="dialog-actions">
        <Button asChild variant="outline">
          <a href={safePostUrl(post)} target="_blank" rel="noreferrer">
            게시물 보기 ↗
          </a>
        </Button>
        <Button asChild>
          <a
            href={`/ghost/#/editor/post/${post.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Ghost에서 수정 ↗
          </a>
        </Button>
      </div>
    </>
  );
}
