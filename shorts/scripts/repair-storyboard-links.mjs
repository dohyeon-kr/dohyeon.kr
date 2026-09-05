import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const requestedTag = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || (requestedTag && !/^(shorts-storyboard-\d+|untagged-[a-f0-9]+)$/.test(requestedTag))) throw new Error('Repository and storyboard release tag required');
const gh = (args, binary = false) => execFileSync('gh', args, {encoding: binary ? undefined : 'utf8', maxBuffer: 64 * 1024 * 1024});
const releases = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`])).flat();
const isStoryboard = item => item.draft && item.name?.startsWith('Shorts storyboard') && item.assets.some(asset => asset.name.endsWith('-STORYBOARD.md'));
const selected = releases.filter(item => isStoryboard(item) && (!requestedTag || item.tag_name === requestedTag));
if (!selected.length) throw new Error(`Storyboard release not found: ${requestedTag ?? 'drafts'}`);

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'storyboard-links-'));
let requestNumber = 0;
async function api(endpoint, data, method = 'POST') {
  const file = path.join(directory, `request-${requestNumber++}.json`);
  await fs.writeFile(file, JSON.stringify(data));
  return JSON.parse(gh(['api', '--method', method, endpoint, '--input', file]));
}
try {
  for (const release of selected) {
    const assets = new Map(release.assets.map(asset => [asset.name, asset.browser_download_url]));
    const images = release.assets.filter(asset => /\.(png|jpe?g)$/i.test(asset.name));
    if (!images.length) throw new Error(`No preview images: ${release.id}`);
    // Draft downloads require authentication, which GitHub's image proxy cannot
    // supply. Store only review images on a dedicated branch; leave the release
    // in Draft and link previews to an immutable commit, never a temporary tag.
    const tree = [];
    for (const asset of images) {
      if (path.basename(asset.name) !== asset.name) throw new Error('Invalid asset name');
      const bytes = gh(['api', '-H', 'Accept: application/octet-stream', `repos/${repo}/releases/assets/${asset.id}`], true);
      if (bytes.length !== asset.size) throw new Error(`Incomplete image: ${asset.name}`);
      const blob = await api(`repos/${repo}/git/blobs`, {content: bytes.toString('base64'), encoding: 'base64'});
      tree.push({path: asset.name, mode: '100644', type: 'blob', sha: blob.sha});
    }
    const branch = `shorts-storyboard-preview-${release.id}`;
    const refs = JSON.parse(gh(['api', `repos/${repo}/git/matching-refs/heads/${branch}`]));
    const previous = refs.find(ref => ref.ref === `refs/heads/${branch}`);
    const snapshot = await api(`repos/${repo}/git/trees`, {tree});
    const commit = await api(`repos/${repo}/git/commits`, {
      message: `chore: preserve storyboard preview images for release ${release.id}`,
      tree: snapshot.sha,
      parents: previous ? [previous.object.sha] : [],
    });
    if (previous) await api(`repos/${repo}/git/refs/heads/${branch}`, {sha: commit.sha, force: false}, 'PATCH');
    else await api(`repos/${repo}/git/refs`, {ref: `refs/heads/${branch}`, sha: commit.sha});
    const previews = new Map(images.map(asset => [asset.name, `https://raw.githubusercontent.com/${repo}/${commit.sha}/${encodeURIComponent(asset.name)}`]));
    // Check every preview without credentials before replacing the review body.
    for (const url of previews.values()) {
      let ok = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await fetch(url);
        ok = response.ok && /^image\//.test(response.headers.get('content-type') ?? '');
        await response.arrayBuffer();
        if (ok) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (!ok) throw new Error(`Preview is not publicly readable: ${url}`);
    }
    const root = `https://github.com/${repo}/releases/download/`;
    function repair(text) {
      return text.replace(/https:\/\/github\.com\/[^\s)<>]+\/releases\/download\/[^\s)<>]+/g, url => {
        if (!url.startsWith(root)) return url;
        const name = decodeURIComponent(url.split('/').at(-1));
        const actual = previews.get(name) ?? assets.get(name);
        if (!actual) throw new Error(`Release attachment missing: ${name}`);
        return actual;
      }).replace(/https:\/\/raw\.githubusercontent\.com\/[^\s)<>]+/g, url => {
        if (!url.startsWith(`https://raw.githubusercontent.com/${repo}/`)) return url;
        return previews.get(decodeURIComponent(url.split('/').at(-1))) ?? url;
      });
    }
    for (const asset of release.assets.filter(asset => asset.name.endsWith('-STORYBOARD.md'))) {
      if (path.basename(asset.name) !== asset.name) throw new Error('Invalid document name');
      const filename = path.join(directory, asset.name);
      const original = gh(['api', '-H', 'Accept: application/octet-stream', `repos/${repo}/releases/assets/${asset.id}`]);
      await fs.writeFile(filename, repair(original));
      gh(['release', 'upload', release.tag_name, filename, '--repo', repo, '--clobber']);
    }
    let body = repair(release.body ?? '');
    body = body.replace('Draft Release에서 이미지가 표시되지 않으면 Assets의 PNG 또는 PDF를 열어 확인하세요.', '본문 이미지는 고정된 커밋의 미리보기로 표시됩니다.');
    body = body.replace(/\n*Draft 첨부파일은 GitHub 로그인이 필요할 수 있습니다\.[^\n]*/g, '');
    await api(`repos/${repo}/releases/${release.id}`, {body: body.trimEnd() + '\n'}, 'PATCH');
    const checked = JSON.parse(gh(['api', `repos/${repo}/releases/${release.id}`]));
    if (!checked.draft || checked.body !== body.trimEnd() + '\n') throw new Error('Release verification failed');
    console.log(`Repaired ${release.html_url}: ${images.length} anonymously verified preview images; release remains draft`);
  }
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
