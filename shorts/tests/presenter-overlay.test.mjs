import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePresenterOverlay} from '../src/presenter/overlay.ts';
import {withBlogCta} from '../scripts/blog-cta.mjs';
import {describeCandidate} from '../scripts/describe-candidates.mjs';
import {CandidateSchema} from '../scripts/generate-candidates.mjs';
import {validateScenePresenter} from '../src/presenter/schema.ts';
import {validateSceneMotion} from '../src/motion/validate.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {validateDiagramLayout} from '../src/visuals/physics.ts';
const manifest=JSON.parse(fs.readFileSync(new URL('../content/jinjeonghan-yimiyi-peuropesyeoneol/candidate-01.json',import.meta.url)));
test('overlay is opt-in, rejects unsupported positions and duplicate scene presenters',()=>{
  assert.doesNotThrow(()=>validatePresenterOverlay({scenes:[{presenter:{}}]}));
  assert.doesNotThrow(()=>validatePresenterOverlay(manifest));
  for (const presenterOverlay of [{position:'center'},{position:'bottom-right',x:1}]) assert.throws(()=>validatePresenterOverlay({...manifest,presenterOverlay}));
  assert.throws(()=>validatePresenterOverlay({...manifest,scenes:[{presenter:{}}]}));
});
test('common CTA regeneration keeps one CTA and the persistent overlay',()=>{
  const result=withBlogCta(withBlogCta(manifest));
  assert.equal(result.scenes.length,15);
  assert.deepEqual(result.presenterOverlay,{position:'bottom-right',hideOnCommonCta:true,lipSync:'word-timestamps',nod:'speech'});
  assert.equal(result.scenes.filter(s=>s.commonPage).length,1);
  assert.equal((describeCandidate(result,'candidate-01.json').match(/우측 하단 원형 바스트 상시 표시/g)||[]).length,14);
});
test('merged candidate validates authored beats, scene schemas and intermediate diagram states',()=>{
  const scenes=manifest.scenes.filter(s=>!s.commonPage);
  CandidateSchema.parse({...manifest.candidate,scenes});
  for(const [i,scene] of manifest.scenes.entries()) {
    validateScenePresenter(scene);
    validateSceneMotion(scene,manifest.scenes[i-1]);
    assert.equal(scene.beats.map(b=>b.text).join(' '),scene.narration);
    assert.doesNotMatch(scene.narration,/저는|픽셀|살펴볼까요/);
    if(scene.diagramSpec) validateDiagramLayout(validateDiagram(scene.diagramSpec));
    if(scene.visual.type==='photo') for(const key of ['originalUrl','creator','sourcePage','license','licenseUrl']) assert.ok(scene.image[key]);
  }
});
