import fs from 'node:fs/promises';
import path from 'node:path';

const apiBase = 'https://api.github.com';
const uploadBase = 'https://uploads.github.com';

const contentType = filename => {
  const ext = path.extname(filename).toLowerCase();
  return ({
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.srt': 'application/x-subrip',
  })[ext] || 'application/octet-stream';
};

function headers(token, extra = {}) {
  if (!token) throw new Error('GH_TOKEN is required');
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...extra,
  };
}

async function requestJson(url, {token, method = 'GET', body} = {}) {
  const response = await fetch(url, {
    method,
    headers: headers(token, body == null ? {} : {'Content-Type': 'application/json'}),
    ...(body == null ? {} : {body: JSON.stringify(body)}),
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GitHub API ${method} ${url} failed (${response.status}): ${text.slice(0, 1000)}`);
  return text ? JSON.parse(text) : null;
}

async function findRelease(repository, tag, token) {
  for (let page = 1; page <= 100; page++) {
    const releases = await requestJson(`${apiBase}/repos/${repository}/releases?per_page=100&page=${page}`, {token});
    const found = releases.find(release => release.tag_name === tag);
    if (found) return found;
    if (releases.length < 100) return null;
  }
  throw new Error('Too many releases to scan');
}

async function deleteAssets(repository, release, token) {
  for (const asset of release.assets || []) {
    await requestJson(`${apiBase}/repos/${repository}/releases/assets/${asset.id}`, {token, method: 'DELETE'});
  }
}

async function uploadAsset(repository, releaseId, filename, token) {
  const name = path.basename(filename);
  const bytes = await fs.readFile(filename);
  const response = await fetch(`${uploadBase}/repos/${repository}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: headers(token, {'Content-Type': contentType(name), 'Content-Length': String(bytes.length)}),
    body: bytes,
    signal: AbortSignal.timeout(120000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Release asset upload failed for ${name} (${response.status}): ${text.slice(0, 1000)}`);
  return JSON.parse(text);
}

export async function upsertDraftRelease({repository, token, tag, target, title, body, assets}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('Invalid GitHub repository');
  if (!/^[\w.-]+$/.test(tag || '')) throw new Error('Invalid release tag');
  if (!/^[a-f0-9]{40}$/.test(target || '')) throw new Error('Invalid target commit SHA');
  const uniqueAssets = [...new Set(assets || [])];
  if (!uniqueAssets.length) throw new Error('At least one release asset is required');
  for (const filename of uniqueAssets) await fs.access(filename);

  let release = await findRelease(repository, tag, token);
  const payload = {
    tag_name: tag,
    target_commitish: target,
    name: title,
    body,
    draft: true,
    prerelease: false,
  };
  if (release) {
    await deleteAssets(repository, release, token);
    release = await requestJson(`${apiBase}/repos/${repository}/releases/${release.id}`, {token, method: 'PATCH', body: payload});
  } else {
    release = await requestJson(`${apiBase}/repos/${repository}/releases`, {token, method: 'POST', body: payload});
  }

  for (const filename of uniqueAssets) await uploadAsset(repository, release.id, filename, token);
  return release;
}
