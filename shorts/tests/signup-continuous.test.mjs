import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {withBlogCta} from '../scripts/blog-cta.mjs';
import {planBeatDeletion, resolveSignupModel, isSignupComposition} from '../scripts/signup-continuous-model.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const candidate=JSON.parse(await fs.readFile(path.join(root,'shorts/content/signup-phone-number-input/candidate-02.json'),'utf8'));
const original=JSON.parse(await fs.readFile(path.join(root,'shorts/content/signup-phone-number-input/candidate-01.json'),'utf8'));
const deletionOnly=structuredClone(original.scenes[0]);deletionOnly.beats.splice(4,1);deletionOnly.narration=deletionOnly.beats.map(b=>b.text).join(' ');
const aligned=scene=>({...structuredClone(scene),audioPath:'generated/test.wav',audioDurationSeconds:scene.beats.length*4,beatTimings:scene.beats.map((_,i)=>({startSeconds:i*4,endSeconds:(i+1)*4-.2}))});

test('routing is opt-in and leaves the original candidate on Aurora',()=>{
  assert.equal(isSignupComposition(original),false);assert.equal(isSignupComposition(candidate),true);
});
test('deletes an exact beat using measured boundaries, not old MP4 timestamps',()=>{
  const source=aligned(original.scenes[0]);const plan=planBeatDeletion(source,deletionOnly);
  assert.deepEqual(plan.cuts,[{start:16,end:20}]);assert.equal(plan.audioDurationSeconds,28);
  assert.equal(plan.beatTimings[4].startSeconds,16);assert.equal(plan.retained.length,7);
});
test('changed speech, reordered speech and stale prepared text fail closed',()=>{
  const source=aligned(original.scenes[0]);const changed=structuredClone(candidate.scenes[0]);
  changed.beats[0].text='새로 작성한 문장입니다.';changed.narration=changed.beats.map(b=>b.text).join(' ');
  assert.throws(()=>planBeatDeletion(source,changed),/exact beat deletions/);
  const reordered=structuredClone(candidate.scenes[0]);reordered.beats.reverse();reordered.narration=reordered.beats.map(b=>b.text).join(' ');
  assert.throws(()=>planBeatDeletion(source,reordered),/exact beat deletions/);
  const stale=withBlogCta(original);stale.scenes=stale.scenes.map(aligned);
  assert.throws(()=>resolveSignupModel(candidate,stale),/does not match candidate text/);
});
test('invalid timings cannot be silently replaced with guesses in a prepared render',()=>{
  const prepared=withBlogCta(candidate);prepared.scenes=prepared.scenes.map(aligned);
  prepared.scenes[0].beatTimings[1].startSeconds=0;
  assert.throws(()=>resolveSignupModel(candidate,prepared),/overlap/);
  delete prepared.scenes[0].beatTimings;
  assert.throws(()=>resolveSignupModel(candidate,prepared),/measured timing/);
});
test('captions and CTA follow candidate and prepared audio at a different duration',()=>{
  const prepared=withBlogCta(candidate);prepared.scenes=prepared.scenes.map(aligned);
  const model=resolveSignupModel(candidate,prepared);
  assert.equal(model.bodyEnd,28.28);assert.equal(model.duration,36.56);
  assert.equal(model.beats[5].startSeconds,20);
  assert.equal(model.captions.map(c=>c[2]).join('').replace(/\s/g,''),candidate.scenes[0].narration.replace(/\s/g,''));
  assert.equal(model.manifest.scenes[1].narration,withBlogCta(candidate).scenes[1].narration);
});
test('the existing builder command creates a signup project and release-compatible sidecars',async t=>{
  const dir=path.join(root,'shorts/.tmp/signup-integration-test');
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const run=spawnSync(process.execPath,['shorts/scripts/build-hyperframes.mjs','shorts/content/signup-phone-number-input/candidate-02.json','--output=shorts/.tmp/signup-integration-test'],{cwd:root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const html=await fs.readFile(path.join(dir,'index.html'),'utf8');
  assert.equal((html.match(/id="phone-control"/g)||[]).length,1);
  assert.match(html,/data-composition-id="aurora-explain"/);
  const timing=JSON.parse(await fs.readFile(path.join(dir,'timing.json'),'utf8'));
  assert.equal(timing.timingSource,'estimated-silent-preview');
  const sceneTimes=JSON.parse(await fs.readFile(path.join(dir,'timings.json'),'utf8'));
  assert.equal(sceneTimes.scenes.length,2);
  assert.equal(sceneTimes.scenes[1].startSeconds,timing.bodyEnd);
  const sidecars=spawnSync(process.execPath,['shorts/scripts/write-hyperframes-release-assets.mjs','shorts/content/signup-phone-number-input/candidate-02.json','shorts/.tmp/signup-integration-test','shorts/.tmp/signup-integration-test/release'],{cwd:root,encoding:'utf8'});
  assert.equal(sidecars.status,0,sidecars.stderr);
  const script=await fs.readFile(path.join(dir,'release/signup-phone-number-input-candidate-02-SCRIPT.txt'),'utf8');
  assert.ok(script.includes(candidate.scenes[0].narration));
  const provenance=await fs.readFile(path.join(dir,'release/signup-phone-number-input-candidate-02-MEDIA.md'),'utf8');
  assert.match(provenance,/Renderer: HyperFrames \/ signup-phone-number-input-v2/);
  const bgm=spawnSync(process.execPath,['shorts/scripts/mix-hyperframes-bgm.mjs','shorts/.tmp/not-present.mp4','shorts/.tmp/signup-integration-test'],{cwd:root,encoding:'utf8'});
  // This silent project is not marked mixed; the ordinary BGM path must still be used.
  assert.notEqual(bgm.status,0);
  const mf=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));mf.audioAlreadyMixed=true;
  await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(mf));
  const reused=spawnSync(process.execPath,['shorts/scripts/mix-hyperframes-bgm.mjs','shorts/.tmp/not-present.mp4','shorts/.tmp/signup-integration-test'],{cwd:root,encoding:'utf8'});
  assert.equal(reused.status,0,reused.stderr);assert.match(reused.stdout,/skipped duplicate/);
});

test('the strengthened script refuses the old speech and spells out responsibility',()=>{
  assert.throws(()=>planBeatDeletion(aligned(original.scenes[0]),candidate.scenes[0]),/exact beat deletions/);
  assert.match(candidate.scenes[0].beats[3].text,/화면의 검사만 믿을 수는 없습니다/);
  assert.match(candidate.scenes[0].beats[4].text,/인증 완료 여부/);
  assert.match(candidate.scenes[0].beats[4].text,/요청 형식/);
});
