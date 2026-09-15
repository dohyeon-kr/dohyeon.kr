import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {loadPublishedStoryboard, parseStoryboardSource, readReviewOriginal, selectStoryboardRelease} from '../scripts/load-storyboard.mjs';

const repository = 'dohyeon-kr/dohyeon.kr';
const manifestPath = 'shorts/content/post/candidate-01.json';
const sourceCommit = 'a'.repeat(40);
const imageCommit = 'b'.repeat(40);
const sourceUrl = `https://raw.githubusercontent.com/${repository}/${sourceCommit}/${manifestPath}`;
const names = ['post-candidate-01-scene-01.png', 'post-candidate-01-scene-02.png'];
const frameUrl = name => `https://raw.githubusercontent.com/${repository}/${imageCommit}/${name}`;
const manifest = {id:'candidate-01', source:{url:'https://blog.dohyeon.kr/post/'}, candidate:{title:'제목'}, style:{theme:'monochrome-editorial-dark'}, scenes:[{kind:'statement',headline:'한 장면',subline:null,narration:'한 장면',imageQuery:null,comparisonLeft:null,comparisonRight:null,image:null}]};

async function fixture(t, {inline=false}={}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'load-storyboard-'));
  const reportDir = path.join(root, 'shorts/out/review');
  await fs.mkdir(path.join(root, path.dirname(manifestPath)), {recursive:true});
  await fs.writeFile(path.join(root, manifestPath), JSON.stringify(manifest));
  const images = names.map(name=>`![${name}](${frameUrl(name)})`).join('\n');
  const document = `[원본](${sourceUrl})\n${images}`;
  const docUrl = `https://raw.githubusercontent.com/${repository}/${imageCommit}/post-candidate-01-STORYBOARD.md`;
  const release = {id: 1, tag_name: 'shorts-storyboard-123', html_url: `https://github.com/${repository}/releases/tag/untagged-alias`,
    body: `[원본](${sourceUrl})\n${inline ? images : `[스토리보드](${docUrl})`}`};
  const fetchImpl = async url => {
    if (url === sourceUrl) return new Response(JSON.stringify(manifest), {status:200,headers:{'content-type':'application/json'}});
    if (url === docUrl) return new Response(document, {status:200,headers:{'content-type':'text/markdown'}});
    if (names.some(name=>url===frameUrl(name))) return new Response(Buffer.from('89504e470d0a1a0a','hex'), {status:200,headers:{'content-type':'image/png'}});
    return new Response('missing',{status:404});
  };
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  return {root,reportDir,release,fetchImpl,repository,manifestPath};
}

test('accepts explicit tags and draft URLs but refuses foreign sources and mutable refs', () => {
  assert.deepEqual(parseStoryboardSource('shorts-storyboard-123', repository), {tag: 'shorts-storyboard-123'});
  assert.equal(parseStoryboardSource(`https://github.com/${repository}/releases/tag/untagged-alias`, repository).tag, 'untagged-alias');
  assert.throws(()=>parseStoryboardSource('https://github.com/other/repo/releases/tag/nope',repository),/repository/);
  assert.throws(()=>parseStoryboardSource(`https://github.com/${repository}/blob/main/foo`,repository),/release URL/);
});

test('loads original JSON and every photo/diagram/video frame from pinned Markdown', async t => {
  const args = await fixture(t);
  await loadPublishedStoryboard(args);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(args.reportDir,'before.json'),'utf8')), manifest);
  for (const name of names) assert.equal((await fs.readFile(path.join(args.reportDir,'before',name))).toString('hex'),'89504e470d0a1a0a');
});

test('loads original JSON and every photo/diagram/video frame from legacy inline links', async t => {
  const args = await fixture(t,{inline:true});
  await loadPublishedStoryboard(args);
  for (const name of names) assert.equal((await fs.readFile(path.join(args.reportDir,'before',name))).toString('hex'),'89504e470d0a1a0a');
});

test('refuses a stale storyboard before downloading frames or overwriting newer candidate edits', async t => {
  const args = await fixture(t);
  let frames=0; const fetchImpl=async url=>{if(names.some(name=>url===frameUrl(name))) frames++;return args.fetchImpl(url);};
  await fs.writeFile(path.join(args.root,manifestPath),JSON.stringify({...manifest,changed:true}));
  await assert.rejects(loadPublishedStoryboard({...args,fetchImpl}),/does not match/);
  assert.equal(frames,0);
});

test('fails without render fallback on missing frames', async t => {
  const args = await fixture(t);
  await assert.rejects(loadPublishedStoryboard({...args,fetchImpl:async url=>url===frameUrl(names[1])?new Response('missing',{status:404}):args.fetchImpl(url)}),/Failed to download/);
});

test('fails without render fallback on corrupt frames', async t => {
  const args = await fixture(t);
  await assert.rejects(loadPublishedStoryboard({...args,fetchImpl:async url=>url===frameUrl(names[1])?new Response('not-png',{status:200,headers:{'content-type':'image/png'}}):args.fetchImpl(url)}),/Invalid PNG/);
});

test('fails without render fallback on network frames', async t => {
  const args = await fixture(t);
  await assert.rejects(loadPublishedStoryboard({...args,fetchImpl:async url=>url===frameUrl(names[1])?Promise.reject(new Error('offline')):args.fetchImpl(url)}),/offline/);
});

test('rejects ambiguous JSON versions and candidate edits after loading', async t => {
  const args = await fixture(t);
  args.release.body += `\n[other](${sourceUrl.replace(sourceCommit, 'd'.repeat(40))})`;
  await assert.rejects(loadPublishedStoryboard(args), /found 2/);
  args.release.body = args.release.body.split('\n[other]')[0];
  await loadPublishedStoryboard(args);
  await fs.writeFile(path.join(args.root, manifestPath), JSON.stringify({...manifest, changed: true}));
  await assert.rejects(readReviewOriginal(manifestPath, args.reportDir, args.root), /changed after loading/);
});
test('review workflow only renders the improved storyboard', async () => {
  const workflow = await fs.readFile(new URL('../../.github/workflows/review-storyboard.yml', import.meta.url), 'utf8');
  assert.match(workflow, /storyboard_source:[\s\S]*?required: false/);
  assert.match(workflow, /Load (?:current working|published) storyboard and original JSON/);
  assert.equal((workflow.match(/node shorts\/scripts\/render\.mjs/g) || []).length, 1);
  assert.ok(workflow.indexOf('load-storyboard.mjs') < workflow.indexOf('review-storyboard.mjs improve'));
  assert.ok(workflow.indexOf('review-storyboard.mjs improve') < workflow.indexOf('render.mjs'));
  assert.doesNotMatch(workflow, /Render original storyboard/);
});
test('rejects mixed image commits and changed stored JSON', async t => {
  const args = await fixture(t, {inline: true});
  const originalBody = args.release.body;
  args.release.body = originalBody.replace(frameUrl(names[0]), frameUrl(names[0]).replace(imageCommit, 'd'.repeat(40)));
  await assert.rejects(loadPublishedStoryboard(args), /mixed commits/);
  args.release.body = originalBody;
  await loadPublishedStoryboard(args);
  await fs.writeFile(path.join(args.reportDir, 'before.json'), JSON.stringify({...manifest, changed: true}));
  await assert.rejects(readReviewOriginal(manifestPath, args.reportDir, args.root), /Stored review source/);
});
test('automatic selection skips unrelated and changed JSON and chooses newest matching draft', async t => {
  const args = await fixture(t);
  const staleCommit = 'd'.repeat(40);
  const stale = {...args.release, id: 4, updated_at: '2026-09-06T04:00:00Z', body: args.release.body.replaceAll(sourceCommit, staleCommit)};
  const unrelated = {...args.release, id: 5, updated_at: '2026-09-06T05:00:00Z', body: args.release.body.replaceAll('candidate-01','candidate-02')};
  const oldMatch = {...args.release, id: 6, updated_at: '2026-09-06T06:00:00Z'};
  const newMatch = {...args.release, id: 7, updated_at: '2026-09-06T07:00:00Z'};
  const fetchImpl=async url=>url===sourceUrl?new Response(JSON.stringify(manifest),{status:200,headers:{'content-type':'application/json'}}):url.includes(staleCommit)?new Response(JSON.stringify({...manifest,changed:true}),{status:200,headers:{'content-type':'application/json'}}):args.fetchImpl(url);
  assert.equal((await selectStoryboardRelease({releases:[unrelated,stale,oldMatch,newMatch],repository,manifestPath,root:args.root,fetchImpl})).id,7);
});
test('automatic selection does not render or overwrite when no JSON matches', async t => {
  const args = await fixture(t); const staleCommit='d'.repeat(40);
  const stale={...args.release,body:args.release.body.replaceAll(sourceCommit,staleCommit)};
  const fetchImpl=async url=>url.includes(staleCommit)?new Response(JSON.stringify({...manifest,changed:true}),{status:200,headers:{'content-type':'application/json'}}):args.fetchImpl(url);
  assert.equal(await selectStoryboardRelease({releases:[stale],repository,manifestPath,root:args.root,fetchImpl}),null);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(args.root,manifestPath),'utf8')),manifest);
});
test('explicit source overrides automatic order and newest missing images never fall back to old release', async t => {
  const args=await fixture(t); const explicit={...args.release,id:10,tag_name:'chosen'};
  assert.equal((await selectStoryboardRelease({releases:[args.release,explicit],repository,manifestPath,root:args.root,fetchImpl:args.fetchImpl,source:{tag:'chosen'}})).id,10);
  const newer={...args.release,id:11,updated_at:'2026-09-06T08:00:00Z'};
  const older={...args.release,id:9,updated_at:'2026-09-06T07:00:00Z'};
  const fetchImpl=async url=>url===frameUrl(names[1])?new Response('missing',{status:404}):args.fetchImpl(url);
  await assert.rejects(loadPublishedStoryboard({...args,release:newer,fetchImpl}),/Failed to download/);
  assert.equal((await selectStoryboardRelease({releases:[older,newer],repository,manifestPath,root:args.root,fetchImpl:args.fetchImpl})).id,11);
});
