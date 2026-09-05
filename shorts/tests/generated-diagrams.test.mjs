import test from 'node:test';
import assert from 'node:assert/strict';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';
import {GeneratedDiagramEventSchema} from '../scripts/generated-diagram-schema.mjs';
import {enrichVisuals} from '../scripts/resolve-visuals.mjs';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';

const event = {target: 'node', property: 'scale', from: 1, to: 2, start: .2, end: .8};
const scene = () => ({
  kind: 'statement', layout: 'diagram-centered', headline: '핵심 문구', narration: '그대로 유지할 내레이션',
  subline: null, visual: {type: 'diagram', query: null}, visualIntent: {strategy: {type: 'spatial-diagram'}},
  camera: {motion: 'static', startProgress: 0, endProgress: 1}, beats: [{text: '그대로 유지할 내레이션', emphasis: 'high'}],
  diagramSpec: {version: 1, renderer: 'auto', description: '도식', nodes: [{id: 'node', shape: 'rect', label: '입력', x: 100, y: 100, width: 100, height: 100, fill: 'white'}], events: [{...event}]},
});

test('structured output advertises property-specific scale, opacity and dimension bounds', () => {
  const format = zodTextFormat(z.object({events: z.array(GeneratedDiagramEventSchema)}), 'events');
  const variants = format.schema.properties.events.items.anyOf;
  const scale = variants.find(v => v.properties.property.const === 'scale');
  assert.equal(scale.properties.from.minimum, .01);
  assert.equal(scale.properties.to.maximum, 4);
  for (const [property, invalid] of [['scale', 0], ['scale', -1], ['scale', 5], ['opacity', 2], ['width', 0], ['height', 561]]) {
    assert.equal(GeneratedDiagramEventSchema.safeParse({...event, property, to: invalid}).success, false);
  }
  assert.ok(GeneratedDiagramEventSchema.safeParse({...event, from: .01, to: 4}).success);
});

test('invalid generated diagrams fail instead of bypassing the gate with text fallback', async () => {
  for (const mutate of [
    s => {s.diagramSpec.events[0].from = 0;},
    s => {s.diagramSpec.events[0].to = 5;},
    s => {s.diagramSpec.events[0].target = 'missing';},
    s => {s.diagramSpec.events.push({...event});},
    s => {s.diagramSpec = null;},
  ]) {
    const invalid = scene(); mutate(invalid);
    const valid = scene();
    await assert.rejects(enrichVisuals({title: '후보', scenes: [invalid, valid]}, {warn: () => {}}), /Invalid diagram.*scene 1/);
    assert.equal(invalid.headline, '핵심 문구');
  }
});

test('renderer continues rejecting invalid scale values', () => {
  const invalid = scene(); invalid.diagramSpec.events[0].from = 0;
  assert.throws(() => validateDiagram(invalid.diagramSpec), /Scale must be/);
});


test('valid generated geometry passes while layout violations stop generation', async () => {
  const valid = scene(); valid.diagramSpec.nodes[0].x = 300; valid.diagramSpec.nodes[0].y = 250;
  assert.equal((await enrichVisuals({title: '후보', scenes: [valid]})).scenes[0].visual.type, 'diagram');
  const bad = scene();
  await assert.rejects(enrichVisuals({title: '후보', scenes: [bad]}), /layout:safe-area/);
});
