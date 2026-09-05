import test from 'node:test';
import assert from 'node:assert/strict';
import {templatePreviewProps, previewDuration, previewSceneFrames} from '../src/template-preview.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
test('integrated preview exercises graph, physics, flow and semantic captions', () => {
  const scenes = templatePreviewProps.scenes;
  assert.equal(scenes.length, 6);
  assert.ok(scenes.some(s => s.visual?.motif === 'roi-curve'));
  assert.ok(scenes.some(s => s.diagramSpec?.physics));
  assert.ok(scenes.some(s => s.diagramSpec && !s.diagramSpec.physics));
  for (const s of scenes) {
    if (s.diagramSpec) validateDiagram(s.diagramSpec);
    if (s.kind !== 'outro') {
      assert.ok(s.narration && s.beats.length >= 2);
      assert.equal(s.narration, s.beats.map(b => b.text).join(' '));
      assert.ok(s.beats.some(b => b.emphasis === 'high'));
    }
    assert.notEqual(s.visual?.type, 'photo', 'no empty photo placeholders');
  }
  assert.equal(previewDuration(templatePreviewProps), scenes.map(previewSceneFrames).reduce((a, b) => a + b));
});
