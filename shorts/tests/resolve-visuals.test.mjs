import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoSearch, enrichVisuals} from '../scripts/resolve-visuals.mjs';
import {describeCandidate} from '../scripts/describe-candidates.mjs';

const photoScene = (query) => ({
  kind: 'photo', layout: 'photo-full-bleed',
  visual: {type: 'photo', query},
  visualIntent: {concept: '위치', relation: {type: 'literal'}, strategy: {type: 'photo'}},
  headline: '모든 길을 알 필요는 없다', subline: null, narration: '지금 필요한 길부터 찾는다.',
  camera: {motion: 'push-in', target: 'detail', intensity: 'subtle', startProgress: 0, endProgress: 1},
  choreography: ['show-visual', 'camera-focus'],
  beats: [{text: '지금 필요한 길부터 찾는다.', emphasis: 'high', visualCue: '지도 확대'}],
});
const quiet = () => {};

test('an unresolved map photo preserves the candidate and later scenes without a placeholder', async () => {
  const source = {title: '후보', scenes: [photoScene('low resolution map with marked location'), photoScene('coding')]};
  const original = structuredClone(source);
  const warnings = [];
  const result = await enrichVisuals(source, {search: async () => null, warn: message => warnings.push(message)});
  const scene = result.scenes[0];
  assert.equal(result.scenes.length, 2);
  assert.equal(scene.visual.type, 'none');
  assert.equal(scene.kind, 'statement');
  assert.equal(scene.layout, 'statement-offset');
  assert.equal(scene.image, null);
  assert.equal(scene.imageQuery, null);
  assert.equal(scene.visual.query, null);
  assert.equal(scene.camera.motion, 'static');
  assert.equal(scene.visualIntent.strategy.type, 'minimal');
  assert.equal(scene.diagramSpec, null);
  assert.equal(scene.headline, source.scenes[0].headline);
  assert.equal(scene.narration, source.scenes[0].narration);
  assert.equal(scene.beats[0].text, source.scenes[0].beats[0].text);
  assert.equal(scene.beats[0].emphasis, 'high');
  assert.equal(scene.beats[0].visualCue, null);
  assert.equal(result.scenes[1].image.license, 'pexels');
  assert.equal(result.scenes[1].visual.type, 'photo');
  assert.equal(warnings.length, 1);
  assert.match(describeCandidate(result, 'candidate-01.json'), /시각 연출 검토 필요.*low resolution map with marked location/);
  assert.deepEqual(source, original);
});

test('missing photo queries fall back without searching; non-photo scenes remain intact', async () => {
  const diagram = {...photoScene(null), visual: {type: 'diagram', query: null}, diagramSpec: {version: 1, renderer: 'auto', description: '도식', nodes: [{id: 'node', shape: 'rect', label: '입력', x: 100, y: 100, width: 100, height: 100, fill: 'white'}], events: []}};
  for (const query of [null, '', '   ']) {
    const result = await enrichVisuals({scenes: [photoScene(query), diagram]}, {
      search: async () => assert.fail('must not search'), warn: quiet,
    });
    assert.equal(result.scenes[0].visual.type, 'none');
    assert.equal(result.scenes[1].diagramSpec, diagram.diagramSpec);
    assert.equal(result.scenes[1].visual.type, 'diagram');
  }
});

test('successful search keeps photo layout and license attribution and caches the result', async () => {
  let calls = 0;
  const search = createPhotoSearch({fetchImpl: async (url, options) => {
    calls++;
    assert.equal(new URL(url).searchParams.get('license'), 'cc0');
    assert.ok(options.signal instanceof AbortSignal);
    return {ok: true, json: async () => ({results: [{url: 'https://example.com/photo.jpg', width: 1200, height: 900, license: 'cc0', creator: 'Creator', foreign_landing_url: 'https://example.com/source'}]})};
  }});
  const result = await enrichVisuals({scenes: [photoScene('forest'), photoScene('forest')]}, {search, warn: quiet});
  assert.equal(calls, 1);
  assert.equal(result.scenes[0].layout, 'photo-full-bleed');
  assert.equal(result.scenes[0].image.creator, 'Creator');
  assert.equal(result.scenes[0].image.sourcePage, 'https://example.com/source');
  assert.equal(result.scenes[0].visualResolution, undefined);
});

for (const failure of ['empty', 'http', 'rate-limit', 'network', 'timeout', 'invalid-json']) {
  test(`${failure} search failure still produces a reviewable candidate and caches the miss`, async () => {
    let calls = 0;
    const search = createPhotoSearch({warn: quiet, fetchImpl: async () => {
      calls++;
      if (failure === 'network') throw new TypeError('fetch failed');
      if (failure === 'timeout') throw new DOMException('timed out', 'TimeoutError');
      return {ok: !['http', 'rate-limit'].includes(failure), status: failure === 'rate-limit' ? 429 : 503,
        json: async () => {if (failure === 'invalid-json') throw new SyntaxError('invalid JSON'); return {results: []};}};
    }});
    const result = await enrichVisuals({scenes: [photoScene('map'), photoScene('map'), photoScene('coding')]}, {search, warn: quiet});
    assert.equal(result.scenes[0].visual.type, 'none');
    assert.equal(result.scenes[1].visual.type, 'none');
    assert.equal(result.scenes[2].image.license, 'pexels');
    assert.equal(calls, ['empty', 'http'].includes(failure) ? 4 : 2);
  });
}

const overlappingScene = () => ({...photoScene(null), visual: {type: 'diagram', query: null},
  diagramSpec: {version: 1, renderer: 'auto', description: '한글 겹침', events: [], nodes: ['future-zone', 'req'].map(id =>
    ({id, shape: 'rect', label: '받침 확인', x: 220, y: 200, width: 200, height: 100, fill: 'white'}))}});

test('repairs only the failing diagram and revalidates intermediate motion', async () => {
  const source = {title: '후보', scenes: [overlappingScene(), photoScene('forest')]};
  const original = structuredClone(source);
  const errors = [];
  const result = await enrichVisuals(source, {warn: quiet, search: async () => ({originalUrl: 'photo'}),
    repairDiagram: async ({scene, error, sceneNumber, attempt}) => {
      errors.push(error);
      assert.equal(sceneNumber, 1);
      scene.narration = 'must not propagate';
      scene.diagramSpec.nodes[1].x = 550;
      // First repair clears the still but introduces a collision during motion.
      scene.diagramSpec.events = attempt === 1 ? [{target: 'req', property: 'x', from: 550, to: 220, start: 0.2, end: 0.7, easing: 'linear'}] : [];
      return scene.diagramSpec;
    }});
  assert.equal(errors.length, 2);
  assert.match(errors[0], /layout:text-overlap/);
  assert.match(errors[1], /layout:/);
  assert.equal(result.scenes[0].narration, original.scenes[0].narration);
  assert.deepEqual(result.scenes[0].beats, original.scenes[0].beats);
  assert.equal(result.scenes[1].image.originalUrl, 'photo');
  assert.deepEqual(source, original);
});

test('exhausted repairs fail closed with scene and latest error', async () => {
  let calls = 0;
  await assert.rejects(enrichVisuals({title: '후보', scenes: [overlappingScene()]}, {warn: quiet,
    repairDiagram: async ({scene}) => {calls++; return scene.diagramSpec;}}), /scene 1 after 3 repair attempts:.*layout:text-overlap/);
  assert.equal(calls, 3);
});

test('repair API failures retain scene context and never bypass validation', async () => {
  await assert.rejects(enrichVisuals({title: '후보', scenes: [overlappingScene()]}, {warn: quiet,
    repairDiagram: async () => {throw new Error('API unavailable');}}), /scene 1: repair 1 failed: API unavailable/);
});

test('valid diagrams never call repair and invalid diagrams without repair still fail', async () => {
  const scene = overlappingScene();
  await assert.rejects(enrichVisuals({scenes: [scene]}), /after 0 repair attempts/);
  scene.diagramSpec.nodes[1].x = 550;
  await enrichVisuals({scenes: [scene]}, {repairDiagram: async () => assert.fail('unnecessary repair')});
});
