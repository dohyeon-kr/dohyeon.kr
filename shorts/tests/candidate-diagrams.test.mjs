import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateDiagram, diagramState} from '../src/visuals/diagram-spec.ts';
const files = fs.readdirSync(new URL('../content/', import.meta.url)).filter(n => n === 'about-seamless-works' || n.startsWith('joheun-'));
for (const folder of files) test(`${folder}: semantic scenes stay inside the canvas`, () => {
  const dir = new URL(`../content/${folder}/`, import.meta.url);
  const file = fs.readdirSync(dir).find(n => n.endsWith('.json'));
  const manifest = JSON.parse(fs.readFileSync(new URL(file, dir), 'utf8'));
  for (const scene of manifest.scenes.filter(s => s.diagramSpec)) {
    assert.ok(scene.visualStory?.invariant);
    const spec = validateDiagram(scene.diagramSpec);
    for (let frame = 0; frame <= 100; frame++) for (const n of diagramState(spec, frame / 100)) {
      if (n.opacity === 0 || n.shape === 'line') continue;
      assert.ok(n.x - n.width * n.scale / 2 >= 0 && n.x + n.width * n.scale / 2 <= 800, `${n.id}: horizontal overflow`);
      assert.ok(n.y - n.height * n.scale / 2 >= 0 && n.y + n.height * n.scale / 2 <= 560, `${n.id}: vertical overflow`);
    }
  }
});
