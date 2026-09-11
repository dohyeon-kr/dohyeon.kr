import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {upsertDraftRelease} from './github-release.mjs';

const [listFile, notesFile] = process.argv.slice(2);
const repo = process.env.GITHUB_REPOSITORY;
const source = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const run = process.env.GITHUB_RUN_ID || 'local';
const tag = 'shorts-storyboard-preview';
const token = process.env.GH_TOKEN;
if (!listFile || !notesFile || !repo || !/^[a-f0-9]{40}$/.test(source ?? '') || !token) throw new Error('Missing storyboard publishing inputs');
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

  // Keep one mutable branch for the current working storyboard. Each commit is
  // still immutable, so release-body image URLs remain stable during review.
  const branch = 'shorts-storyboard-preview-assets';
  const refs = JSON.parse(gh(['api', `repos/${repo}/git/matching-refs/heads/${branch}`]));
  let previous = refs.find(ref => ref.ref === `refs/heads/${branch}`)?.object.sha;
  async function snapshot(entries, baseTree) {
    const tree = [];
    for (const [name, filename] of entries) {
      const blob = await api('git/blobs', {content: (await fs.readFile(filename)).toString('base64'), encoding: 'base64'});
      tree.push({path: name, mode: '100644', type: 'blob', sha: blob.sha});
    }
    const result = await api('git/trees', {...(baseTree ? {base_tree: baseTree} : {}), tree});
    const commit = await api('git/commits', {message: `chore: update working storyboard preview (${run})`, tree: result.sha, parents: previous ? [previous] : []});
    if (previous) await api(`git/refs/heads/${branch}`, {sha: commit.sha, force: false}, 'PATCH');
    else await api('git/refs', {ref: `refs/heads/${branch}`, sha: commit.sha});
    previous = commit.sha;
    return {sha: commit.sha, tree: result.sha};
  }

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

  for (const item of markdown) urls[item.name] = `https://github.com/${repo}/blob/${branch}/${encodeURIComponent(item.name)}`;
  const urlFile = path.join(temporary, 'asset-urls.json');
  const generate = async () => {
    await fs.writeFile(urlFile, JSON.stringify(urls));
    execFileSync(process.execPath, ['shorts/scripts/storyboard-release-notes.mjs', listFile, notesFile], {
      stdio: 'inherit',
      env: {...process.env, STORYBOARD_ASSET_URLS: urlFile, TAG_NAME: tag, GITHUB_SHA: source},
    });
  };
  await generate();
  const documents = new Map(markdown.map(item => [item.name, path.join(item.directory, item.name)]));
  const docs = await snapshot(documents, media.tree);
  for (const item of markdown) urls[item.name] = `https://github.com/${repo}/blob/${docs.sha}/${encodeURIComponent(item.name)}`;
  await generate();

  const body = await fs.readFile(notesFile, 'utf8');
  if (body.includes('/releases/download/')) throw new Error('Release body must not depend on draft downloads');
  const release = await upsertDraftRelease({
    repository: repo,
    token,
    tag,
    target: source,
    title: 'Shorts storyboard preview · working',
    body,
    assets: [...files.values(), ...documents.values()],
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## Working storyboard updated\n\n[Open current storyboard preview](${release.html_url})\n`);
  }
  console.log(`Updated working storyboard ${release.html_url} with ${files.size} verified assets`);
} finally {
  await fs.rm(temporary, {recursive: true, force: true});
}
