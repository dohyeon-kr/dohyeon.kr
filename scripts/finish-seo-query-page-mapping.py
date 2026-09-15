from pathlib import Path

path = Path("admin/src/components/GoogleReports.test.tsx")
text = path.read_text()
old = '''          queries: [\n            { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n        }}\n      />,\n'''
new = '''          queries: [\n            { query: "storybook 협업", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n          queryPages: [\n            { query: "storybook 협업", page: "https://blog.dohyeon.kr/storybook/", clicks: 10, impressions: 300, ctr: 0.033, position: 8 },\n          ],\n        }}\n        posts={[{\n          id: "post-1",\n          title: "Storybook으로 협업하기",\n          slug: "storybook",\n          status: "published",\n          url: "https://blog.dohyeon.kr/storybook/",\n          published_at: "2026-09-01T00:00:00Z",\n          updated_at: "2026-09-01T00:00:00Z",\n        }]}\n      />,\n'''
if old not in text:
    raise SystemExit("expected SearchPanel fixture block not found")
text = text.replace(old, new, 1)
old = '''    expect(html).toContain("본문·내부링크 보강");\n    expect(html).toContain("내부 기준");\n'''
new = '''    expect(html).toContain("본문·내부링크 보강");\n    expect(html).toContain("Storybook으로 협업하기");\n    expect(html).toContain("/ghost/#/editor/post/post-1");\n    expect(html).toContain("실제 노출 페이지");\n'''
if old not in text:
    raise SystemExit("expected SearchPanel assertions not found")
path.write_text(text.replace(old, new, 1))
