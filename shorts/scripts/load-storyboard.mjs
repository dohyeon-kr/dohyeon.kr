import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify, isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {candidatePath, validateSelection} from './candidate-selection.mjs';

const exec = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safeName = value => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
const repoRoot = path.resolve(import.meta.dirname, '../..');
export function parseStoryboardSource(value, repository) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('Invalid GitHub repository');
  const input = value?.trim();
  if (!input) throw new Error('Storyboard release URL or tag is required');
  if (/^[\w.-]+$/.test(input)) return {tag: input};
  const url = new URL(input);
  const prefix = `/${repository}/releases/tag/`;
  if (url.origin !== 'https://github.com' || !url.pathname.startsWith(prefix) || url.search || url.hash) throw new Error('Use a storyboard release URL from this repository');
  const tag = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!/^[\w.-]+$/.test(tag)) throw new Error('Invalid storyboard tag');
  return {tag, url: url.href};
}
export function pinnedLinks(markdown, repository) {
  const links = [];
  for (const match of markdown.matchAll(/https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/[^\s<>"\)]+/g)) {
    const url = new URL(match[0]);
    if (url.search || url.hash) continue;
    const parts = url.pathname.slice(1).split('/').map(decodeURIComponent);
    if (parts.slice(0, 2).join('/') !== repository) continue;
    const offset = url.hostname === 'github.com' && parts[2] === 'blob' ? 3 : url.hostname === 'raw.githubusercontent.com' ? 2 : -1;
    if (offset < 0 || !/^[a-f0-9]{40}$/.test(parts[offset])) continue;
    const file = parts.slice(offset + 1).join('/');
    if (!file || file.split('/').some(p => !p || p === '.' || p === '..' || p.includes('\\'))) continue;
    links.push({commit: parts[offset], file, url: url.href});
  }
  return links;
}
function uniqueLink(links, filename) {
  const matches = links.filter(l => l.file === filename);
  const unique = [...new Map(matches.map(l => [`${l.commit}/${l.file}`, l])).values()];
  if (unique.length !== 1) throw new Error(`Expected one immutable link for ${filename}; found ${unique.length}. Select a complete published storyboard.`);
  return unique[0];
}
export function storyboardFrames(manifest, manifestPath) {
  const prefix = `${safeName(path.basename(path.dirname(manifestPath)))}-${safeName(manifest.id || path.basename(manifestPath, '.json'))}`;
  const names = manifest.scenes.flatMap((scene, i) => {
    const stem = `${prefix}-scene-${String(i + 1).padStart(2, '0')}`;
    return (scene.diagramSpec || scene.backgroundVideo ? ['-initial', '-change', ''] : ['']).map(phase => `${stem}${phase}.png`);
  });
  return {prefix, names};
}
export function githubReader(repository) {
  const api = async args => (await exec('gh', ['api', ...args], {encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, timeout: 60000})).stdout;
  return {
    async release(selector) {
      // Get-release-by-tag excludes drafts. Match the explicit selection in the
      // authenticated release list, including GitHub's untagged draft URL alias.
      for (let page = 1; page <= 100; page++) {
        const releases = JSON.parse(await api([`repos/${repository}/releases?per_page=100&page=${page}`]));
        const found = releases.find(r => selector.url ? r.html_url === selector.url || r.tag_name === selector.tag : r.tag_name === selector.tag);
        if (found) return found;
        if (releases.length < 100) break;
      }
      throw new Error('Selected storyboard release was not found or is not accessible');
    },
    async file({commit, file}) {
      let data = JSON.parse(await api([`repos/${repository}/contents/${file.split('/').map(encodeURIComponent).join('/')}?ref=${commit}`]));
      if (data.type !== 'file' || data.size > 20 * 1024 * 1024) throw new Error(`Unsupported storyboard file: ${file}`);
      // The Contents API omits base64 for files above 1 MiB; read their pinned blob.
      if (data.encoding !== 'base64') {
        if (!/^[a-f0-9]{40}$/.test(data.sha)) throw new Error(`Invalid file blob: ${file}`);
        data = JSON.parse(await api([`repos/${repository}/git/blobs/${data.sha}`]));
      }
      if (data.encoding !== 'base64' || typeof data.content !== 'string') throw new Error(`Missing storyboard file content: ${file}`);
      const bytes = Buffer.from(data.content, 'base64');
      if (bytes.length !== data.size) throw new Error(`Incomplete storyboard file: ${file}`);
      return bytes;
    },
  };
}
export async function loadPublishedStoryboard({repository, source, manifestPath, reportDir, root = repoRoot, github = githubReader(repository)}) {
  const selector = parseStoryboardSource(source, repository);
  if (!candidatePath.test(manifestPath || '') || manifestPath.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid candidate path');
  if (!reportDir) throw new Error('REVIEW_OUTPUT_DIR is required');
  await validateSelection([manifestPath], root);
  const release = await github.release(selector);
  const releaseLinks = pinnedLinks(release.body || '', repository);
  const sourceLink = uniqueLink(releaseLinks, manifestPath);
  const originalBytes = await github.file(sourceLink);
  const original = JSON.parse(originalBytes);
  if (!Array.isArray(original.scenes) || !original.scenes.length || original.scenes.length > 100) throw new Error('Invalid storyboard source scenes');
  const current = JSON.parse(await fs.readFile(path.join(root, manifestPath), 'utf8'));
  if (!isDeepStrictEqual(current, original)) throw new Error('Current candidate differs from the published storyboard JSON. Select a matching branch/storyboard; refusing to overwrite newer edits.');
  const {prefix, names} = storyboardFrames(original, manifestPath);
  const documentName = `${prefix}-STORYBOARD.md`;
  const documentLinks = releaseLinks.filter(l => l.file === documentName);
  let document = release.body;
  let documentLink = null;
  if (documentLinks.length) {
    documentLink = uniqueLink(documentLinks, documentName);
    document = (await github.file(documentLink)).toString('utf8');
    const linkedSource = uniqueLink(pinnedLinks(document, repository), manifestPath);
    if (linkedSource.commit !== sourceLink.commit) throw new Error('Storyboard Markdown and release refer to different source JSON commits');
  }
  // Older releases may embed all pinned PNGs directly without a pinned Markdown.
  const frameLinks = pinnedLinks(document || '', repository);
  const selected = names.map(name => uniqueLink(frameLinks, name));
  if (new Set(selected.map(l => l.commit)).size !== 1) throw new Error('Storyboard frames refer to mixed commits');
  await fs.mkdir(reportDir, {recursive: true});
  for (const name of ['before', 'before.json', 'review-source.json']) {
    try {await fs.access(path.join(reportDir, name));} catch (error) {if (error.code === 'ENOENT') continue; throw error;}
    throw new Error(`Review source destination already exists: ${name}`);
  }
  const temporary = await fs.mkdtemp(path.join(reportDir, '.source-'));
  const provenance = {version: 1, repository, manifestPath, releaseTag: release.tag_name, releaseId: release.id,
    releaseUrl: release.html_url, sourceCommit: sourceLink.commit, documentCommit: documentLink?.commit ?? null,
    releaseBodySha256: sha256(release.body || ''), manifestSha256: sha256(originalBytes), frames: []};
  try {
    const framesDir = path.join(temporary, 'before', prefix);
    await fs.mkdir(framesDir, {recursive: true});
    for (const link of selected) {
      const bytes = await github.file(link);
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.readUInt32BE(16) === 0 || bytes.readUInt32BE(20) === 0) throw new Error(`Invalid storyboard PNG: ${link.file}`);
      await fs.writeFile(path.join(framesDir, link.file), bytes);
      provenance.frames.push({name: link.file, commit: link.commit, sha256: sha256(bytes), bytes: bytes.length});
    }
    await fs.writeFile(path.join(framesDir, documentName), document);
    await fs.writeFile(path.join(temporary, 'before.json'), originalBytes);
    await fs.writeFile(path.join(temporary, 'review-source.json'), JSON.stringify(provenance, null, 2) + '\n');
    await fs.rename(path.join(temporary, 'before'), path.join(reportDir, 'before'));
    await fs.rename(path.join(temporary, 'before.json'), path.join(reportDir, 'before.json'));
    await fs.rename(path.join(temporary, 'review-source.json'), path.join(reportDir, 'review-source.json'));
    return provenance;
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export async function readReviewOriginal(manifestPath, reportDir, root = repoRoot) {
  const provenance = JSON.parse(await fs.readFile(path.join(reportDir, 'review-source.json'), 'utf8'));
  const bytes = await fs.readFile(path.join(reportDir, 'before.json'));
  if (provenance.manifestPath !== manifestPath || provenance.manifestSha256 !== sha256(bytes)) throw new Error('Stored review source does not match the selected candidate');
  const original = JSON.parse(bytes);
  const current = JSON.parse(await fs.readFile(path.join(root, manifestPath), 'utf8'));
  if (!isDeepStrictEqual(current, original)) throw new Error('Candidate changed after loading the storyboard');
  const {prefix, names} = storyboardFrames(original, manifestPath);
  if (provenance.frames.length !== names.length) throw new Error('Stored storyboard frame list is incomplete');
  for (const name of names) {
    const expected = provenance.frames.find(f => f.name === name);
    const frame = await fs.readFile(path.join(reportDir, 'before', prefix, name));
    if (!expected || expected.sha256 !== sha256(frame)) throw new Error(`Stored storyboard frame changed: ${name}`);
  }
  return {original, provenance};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const provenance = await loadPublishedStoryboard({repository: process.env.GITHUB_REPOSITORY, source: process.env.STORYBOARD_SOURCE,
    manifestPath: process.argv[2], reportDir: process.env.REVIEW_OUTPUT_DIR});
  console.log(`Loaded ${provenance.frames.length} published frames from ${provenance.releaseTag}; source JSON ${provenance.sourceCommit}. No original render performed.`);
}
