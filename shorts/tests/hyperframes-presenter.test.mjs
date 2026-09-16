import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {presenterDefinitions, presenterMarkup, presenterTimeline} from '../scripts/hyperframes-presenter.mjs';

const options = {lipSync:'word-timestamps', nod:'none', hideOnCommonCta:true};
const scene = {narration:'아, 오.', audioPath:'speech.mp3', overlayPresenter:{version:1, mouths:[
  {start:.2,end:.5,shape:'A',intensity:.7},
  {start:.5,end:.6,shape:'M',intensity:0},
  {start:1,end:1.4,shape:'O',intensity:.7},
], actions:[]}};
const compile = (overrides = {}) => presenterTimeline({scene, options, id:'scene-02', start:4, duration:2, ...overrides});
function setsAt(statements, time) {
  const calls = [];
  vm.runInNewContext(statements.join('\n'), {tl:{set:(target, vars, at) => calls.push({target,vars,at})}});
  return Object.assign({}, ...calls.filter(call => call.at <= time).sort((a,b) => a.at-b.at).map(call => call.vars));
}

test('measured overlayPresenter mouth cues drive scene-offset SVG states and silent gaps', () => {
  const statements = compile();
  assert.ok(statements.length > 0);
  for (const [time, shape] of [[4.1,'rest'],[4.3,'a'],[4.5,'m'],[4.8,'rest'],[5.2,'o'],[5.6,'rest'],[6,'rest']]) {
    const state = setsAt(statements,time);
    assert.equal(state[`--ml-mouth-${shape}`],1,`t=${time}: ${shape}`);
    assert.equal(['rest','a','i','o','m'].reduce((sum,key)=>sum+state[`--ml-mouth-${key}`],0),1);
  }
  assert.deepEqual(Object.keys(setsAt(statements,3.9)),[]);
  assert.doesNotMatch(statements.join('\n'),/onUpdate|onStart|setInterval|requestAnimationFrame|\.call\(/);
});

test('disabled lip sync and common CTA never schedule mouth animation', () => {
  assert.deepEqual(compile({options:{...options,lipSync:'none'}}),[]);
  assert.deepEqual(compile({options:null}),[]);
  assert.deepEqual(compile({scene:{...scene,commonPage:'blog-cta-v1'}}),[]);
});

test('silent preview keeps the resting mouth rather than inventing speech timings', () => {
  assert.deepEqual(compile({scene:{narration:'아'}}),[]);
});

test('voiced render fails clearly when measured mouth tracks are missing', () => {
  for (const tracks of [null,{}, {mouths:[]}]) {
    assert.throws(()=>compile({scene:{...scene,overlayPresenter:tracks}}),/mouth tracks missing/);
  }
  // Scene-specific presenter data must not be confused with persistent overlay tracks.
  assert.throws(()=>compile({scene:{...scene,presenter:scene.overlayPresenter,overlayPresenter:null}}),/mouth tracks missing/);
});

test('malformed or overlapping measured cues fail rather than silently freezing', () => {
  for (const mouths of [
    [{start:0,end:1,shape:'unknown'}], [{start:-1,end:1,shape:'A'}],
    [{start:0,end:Infinity,shape:'A'}], [{start:1,end:1,shape:'A'}],
    [{start:0,end:3,shape:'A'}], [{start:0,end:1,shape:'A'},{start:.5,end:1.5,shape:'O'}],
  ]) assert.throws(()=>compile({scene:{...scene,overlayPresenter:{mouths}}}),/mouth cue/);
});

test('symbol is defined once; each overlay inherits independent mouth state without duplicating portrait paths', () => {
  const svg = '<svg viewBox="0 0 1254 1254">\n  <path d="M1 2"/>\n</svg>';
  assert.equal(presenterDefinitions(svg).split('\n').length, 1, 'shared SVG must not inflate composition line limits');
  const definitions = presenterDefinitions(svg);
  assert.match(definitions,/<symbol id="ml-presenter-art"/);
  assert.match(definitions,/viewBox="0 0 1254 1254"/);
  assert.match(definitions,/<path d="M1 2"\/>/);
  const markup = presenterMarkup();
  assert.match(markup,/<use href="#ml-presenter-art"/);
  assert.match(markup,/background-image:none/);
  assert.doesNotMatch(markup,/<path/);
});

test('lottery candidate enables measured lip sync and bridges action to reciprocal encounters', async () => {
  const {readFile} = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../content/insaengyeogjeoneul-baraneun-dangsin-roddoneun-sassnayo/candidate-01.json', import.meta.url), 'utf8'));
  assert.equal(manifest.presenterOverlay.lipSync, 'word-timestamps');
  assert.equal(manifest.presenterOverlay.nod, 'none');
  assert.match(manifest.scenes[4].narration, /보장하지는 않습니다/);
  assert.match(manifest.scenes[4].narration, /새로운 사람을 만나는 일/);
  assert.doesNotMatch(manifest.scenes[5].narration, /사람을 기회로|얻어내/);
  assert.match(manifest.scenes[5].narration, /나 역시.*나누며/);
  for (const scene of manifest.scenes) {
    assert.equal(scene.beats.map(beat => beat.text).join(' '), scene.narration);
    for (const beat of scene.beats) assert.ok(!beat.keyword || beat.text.includes(beat.keyword));
  }
  assert.deepEqual(manifest.scenes.flatMap((s,i) => s.backgroundVideo ? [i+1] : []), [6,9]);
  assert.equal(manifest.scenes.filter(s => s.commonPage).length, 1);
  assert.match(manifest.scenes[0].image.originalUrl, /8266775/);
});
