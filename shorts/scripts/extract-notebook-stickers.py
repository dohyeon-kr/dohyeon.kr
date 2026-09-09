"""Export existing atlas crops with the exact renderer alpha formula.
Requires Python + Pillow and Node 24; run from any directory. No AI generation.
"""
import json
import subprocess
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
catalog = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import {NOTEBOOK_ASSETS} from './src/visuals/notebook-catalog.ts'; console.log(JSON.stringify(NOTEBOOK_ASSETS));"
], cwd=root))
for name, spec in catalog.items():
    x, y, width, height = spec['crop']
    original = Image.open(root / 'public/notebook' / spec['file']).convert('RGBA')
    image = original.crop((x, y, x + width, y + height))
    image.putalpha(image.getchannel('B').point(lambda b: max(0, min(255, round(6*b - 178.5)))))
    target = root / 'public/notebook' / spec['assetPath']
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, lossless=True)
    print(f'{name}: {target.relative_to(root)} ({width}x{height})')
