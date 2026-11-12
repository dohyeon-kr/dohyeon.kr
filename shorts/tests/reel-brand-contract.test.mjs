import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REEL_PROFILES, REEL_TOKENS, reelProfileOf, ditherModeOf, validateReelManifest,
} from '../scripts/reel-brand-contract.mjs';

const makeStyle = reelProfile => ({
  template: 'monoliquid-v2', theme: 'monoliquid-v2', colorScheme: 'dark', reelProfile,
});

test('account profiles share the same measurable visual identity', () => {
  assert.deepEqual(Object.keys(REEL_PROFILES).sort(), ['dev_dohyeon', 'uncommon_sight']);
  assert.equal(REEL_TOKENS.koreanFont, 'Pretendard');
  assert.equal(REEL_TOKENS.captionPx, 45);
  assert.deepEqual(REEL_TOKENS.size, {width: 1080, height: 1920, fps: 30});
  for (const name of Object.keys(REEL_PROFILES)) {
    assert.equal(reelProfileOf(makeStyle(name)).id, name);
  }
});

test('invalid reel profiles, themes and light schemes fail closed', () => {
  assert.equal(reelProfileOf({template: 'monoliquid-v2'}), null, 'legacy videos are preserved');
  assert.throws(() => reelProfileOf(makeStyle('unknown')), /Unknown style.reelProfile/);
  assert.throws(() => reelProfileOf({...makeStyle('dev_dohyeon'), template:'aurora-explain', theme:'aurora-explain'}), /requires monoliquid-v2/);
  assert.throws(() => reelProfileOf({...makeStyle('dev_dohyeon'), colorScheme:'light'}), /requires dark/);
});

test('concrete photograph, relationship diagram, and object keep different visual responsibilities', () => {
  assert.equal(ditherModeOf({visual:{type:'photo'}, kind:'photo'}), 'photo');
  assert.equal(ditherModeOf({visual:{type:'diagram'}}), 'diagram');
  assert.equal(ditherModeOf({visual:{type:'symbol', motif:'ring'}}), 'object');
  assert.equal(ditherModeOf({visual:{type:'symbol', motif:'unknown'}}), 'none');
  assert.equal(ditherModeOf({visual:{type:'photo'}, backgroundVideo:{assetId:'x'}}), 'none');
  assert.equal(ditherModeOf({visual:{type:'photo'}, commonPage:'blog-cta-v1'}), 'none');
});

test('photo dithering requires an actual source or query, never an unsourced fallback', () => {
  const manifest = {style: makeStyle('uncommon_sight'), scenes:[{kind:'photo', visual:{type:'photo'}}]};
  assert.throws(() => validateReelManifest(manifest), /requires a sourced image/);
  manifest.scenes[0].visual.query = 'vintage CRT television';
  assert.equal(validateReelManifest(manifest).id, 'uncommon_sight');
  manifest.scenes[0].diagramSpec = {nodes:[]};
  assert.throws(() => validateReelManifest(manifest), /photo and diagram/);
});
