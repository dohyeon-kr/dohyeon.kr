from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"expected source block not found: {path}")
    file.write_text(text.replace(old, new, 1))


replace(
    "admin/src/App.tsx",
    '<SearchPanel state={searchReport} />',
    '<SearchPanel state={searchReport} posts={posts} />',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '  if (status === "loading") return <span className="muted">게시물 연결 확인 중…</span>;',
    '  if (status === "loading" || status === "idle") return <span className="muted">게시물 연결 확인 중…</span>;',
)

replace(
    "admin/src/components/GoogleReports.tsx",
    '<tr key={row.query} title={row.reason}>',
    '<tr key={`${row.query}|${row.page || ""}`} title={row.reason}>',
)
