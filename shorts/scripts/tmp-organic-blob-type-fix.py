from pathlib import Path
p = Path('shorts/src/visuals/layout-guard.ts')
s = p.read_text()
old = "type State = DiagramSpec['nodes'][number] & {rotation: number; scale: number; opacity: number};"
new = "type State = DiagramSpec['nodes'][number] & {rotation: number; scale: number; opacity: number; noiseAmount: number};"
if old not in s:
    raise SystemExit('missing State type anchor')
p.write_text(s.replace(old, new, 1))
