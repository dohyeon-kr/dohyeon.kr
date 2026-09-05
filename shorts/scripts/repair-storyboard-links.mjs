import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const requestedTag = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || (requestedTag && !/^shorts-storyboard-\d+$/.test(requestedTag))) throw new Error('Repository and shorts-storyboard-<run-id> tag required');
const gh = (args) => execFileSync('gh', args, {encoding: 'utf8'});
// Draft releases are not returned by the releases/tags endpoint. Resolve their ID
// from the authenticated collection, including older pages when a tag is supplied.
const releases = JSON.parse(gh(['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`])).flat();
const release = releases.find(item => requestedTag ? item.tag_name === requestedTag : item.draft && /^shorts-storyboard-\d+$/.test(item.tag_name));
if (!release) throw new Error(`Storyboard release not found: ${requestedTag ?? 'latest draft'}`);
const tag = release.tag_name;
const assets = new Map(release.assets.map(asset => [asset.name, asset.browser_download_url]));
if (!assets.size) throw new Error('Storyboard release has no assets');
const root = `https://github.com/${repo}/releases/download/`;
function repair(text) {
  // Replace both planned tag URLs and older untagged URLs using uploaded asset names.
  return text.replace(/https:\/\/github\.com\/[^\s)<>]+\/releases\/download\/[^\s)<>]+/g, url => {
    if (!url.startsWith(root)) return url;
    const name = decodeURIComponent(url.split('/').at(-1));
    const actual = assets.get(name);
    if (!actual) throw new Error(`Release attachment missing: ${name}`);
    return actual;
  });
}
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'storyboard-links-'));
try {
  const documents = release.assets.filter(asset => asset.name.endsWith('-STORYBOARD.md'));
  for (const asset of documents) {
    const filename = path.join(directory, asset.name);
    await fs.writeFile(filename, gh(['api', '-H', 'Accept: application/octet-stream', `repos/${repo}/releases/assets/${asset.id}`]));
    await fs.writeFile(filename, repair(await fs.readFile(filename, 'utf8')));
    gh(['release', 'upload', tag, filename, '--repo', repo, '--clobber']);
  }
  const notes = path.join(directory, 'notes.md');
  const body = repair(release.body ?? '');
  await fs.writeFile(notes, `${body}\n\nDraft 첨부파일은 GitHub 로그인이 필요할 수 있습니다. 본문 미리보기가 표시되지 않으면 ‘장면 이미지 열기’ 또는 Assets의 파일을 눌러 확인하세요.\n`);
  // Patch only the body by ID. `gh release edit <tag>` resubmits tag_name,
  // which can rotate GitHub's temporary draft URLs and invalidate repaired links.
  gh(['api', '--method', 'PATCH', `repos/${repo}/releases/${release.id}`, '-F', `body=@${notes}`]);
  console.log(`Updated actual attachment URLs for ${tag}`);
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
