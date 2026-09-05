import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [listFile, notesFile] = process.argv.slice(2);
const {GITHUB_REPOSITORY: repo, GITHUB_SHA: source, GITHUB_RUN_ID: run, TAG_NAME: tag} = process.env;
if (!listFile || !notesFile || !repo || !source || !/^\d+$/.test(run ?? '') || !tag) throw new Error('Missing storyboard publishing inputs');
const gh = args => execFileSync('gh', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'storyboard-publish-'));
let serial = 0;
async function api(endpoint, data, method = 'POST') {
  const file = path.join(temporary, `request-${serial++}.json`);
  await fs.writeFile(file, JSON.stringify(data));
  return JSON.parse(gh(['api', '--method', method, `repos/${repo}/${endpoint}`, '--input', file]));
}
const safeName = value => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
try {
  const files = new Map();
  const markdown = [];
  for (const manifestPath of [...new Set((await fs.readFile(listFile, 'utf8')).split(/\r?\n/).filter(Boolean))]) {
    if (!/^shorts\/content\/[^/]+\/[^/]+\.json$/.test(manifestPath) || manifestPath.includes('..')) throw new Error('Invalid manifest path');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const prefix = `${safeName(path.basename(path.dirname(manifestPath)))}-${safeName(manifest.id || path.basename(manifestPath, '.json'))}`;
    const directory = path.join('shorts/out/storyboards', prefix);
    for (const name of await fs.readdir(directory)) {
      if (!/(-scene-.*\.png|-contact-sheet\.jpg|-storyboard\.pdf)$/.test(name)) continue;
      if (files.has(name)) throw new Error(`Duplicate attachment: ${name}`);
      files.set(name, path.join(directory, name));
    }
    markdown.push({name: `${prefix}-STORYBOARD.md`, directory});
  }
  if (!files.size) throw new Error('No storyboard assets');
  const branch = `shorts-storyboard-assets-${run}`;
  const refs = JSON.parse(gh(['api', `repos/${repo}/git/matching-refs/heads/${branch}`]));
  let previous = refs.find(ref => ref.ref === `refs/heads/${branch}`)?.object.sha;
  async function snapshot(entries, baseTree) {
    const tree = [];
    for (const [name, filename] of entries) {
      const blob = await api('git/blobs', {content: (await fs.readFile(filename)).toString('base64'), encoding: 'base64'});
      tree.push({path: name, mode: '100644', type: 'blob', sha: blob.sha});
    }
    const result = await api('git/trees', {...(baseTree ? {base_tree: baseTree} : {}), tree});
    const commit = await api('git/commits', {message: `chore: store storyboard assets for run ${run}`, tree: result.sha, parents: previous ? [previous] : []});
    if (previous) await api(`git/refs/heads/${branch}`, {sha: commit.sha, force: false}, 'PATCH');
    else await api('git/refs', {ref: `refs/heads/${branch}`, sha: commit.sha});
    previous = commit.sha;
    return {sha: commit.sha, tree: result.sha};
  }
  // Publish and verify local render outputs BEFORE generating any release body.
  const media = await snapshot(files);
  const urls = Object.fromEntries([...files.keys()].map(name => [name, `https://raw.githubusercontent.com/${repo}/${media.sha}/${encodeURIComponent(name)}`]));
  for (const [name, url] of Object.entries(urls)) {
    let ok = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
      const bytes = await response.arrayBuffer();
      const type = response.headers.get('content-type') ?? '';
      ok = response.ok && bytes.byteLength === (await fs.stat(files.get(name))).size
        && (name.endsWith('.pdf') ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-' : type.startsWith('image/'));
      if (ok) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (!ok) throw new Error(`Unreadable storyboard asset: ${name}`);
  }
  // Markdown has no self-reference, so publish it in a second snapshot, then
  // generate the final notes with its immutable URL before creating the release.
  for (const item of markdown) urls[item.name] = `https://github.com/${repo}/blob/${branch}/${encodeURIComponent(item.name)}`;
  const urlFile = path.join(temporary, 'asset-urls.json');
  const generate = async () => {
    await fs.writeFile(urlFile, JSON.stringify(urls));
    execFileSync(process.execPath, ['shorts/scripts/storyboard-release-notes.mjs', listFile, notesFile], {stdio: 'inherit', env: {...process.env, STORYBOARD_ASSET_URLS: urlFile}});
  };
  await generate();
  const documents = new Map(markdown.map(item => [item.name, path.join(item.directory, item.name)]));
  const docs = await snapshot(documents, media.tree);
  for (const item of markdown) urls[item.name] = `https://github.com/${repo}/blob/${docs.sha}/${encodeURIComponent(item.name)}`;
  await generate();
  const body = await fs.readFile(notesFile, 'utf8');
  if (body.includes('/releases/download/')) throw new Error('Release body must not depend on draft downloads');
  const releaseUrl = gh(['release', 'create', tag, ...files.values(), ...documents.values(), '--repo', repo, '--target', source,
    '--title', `Shorts storyboard · ${process.env.GITHUB_RUN_NUMBER || run}`, '--notes-file', notesFile, '--draft']).trim();
  // No post-creation repair, release lookup, or body patch is needed.
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Storyboard ready for approval\n\n[Open storyboard](${releaseUrl})\n`);
  console.log(`Created ${releaseUrl} with ${files.size} verified assets and complete image URLs`);
} finally {
  await fs.rm(temporary, {recursive: true, force: true});
}
