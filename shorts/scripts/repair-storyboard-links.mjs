import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const tag = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !/^shorts-storyboard-\d+$/.test(tag ?? '')) throw new Error('Repository and shorts-storyboard-<run-id> tag required');
const gh = (args) => execFileSync('gh', args, {encoding: 'utf8'});
const release = JSON.parse(gh(['api', `repos/${repo}/releases/tags/${tag}`]));
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
  gh(['release', 'edit', tag, '--repo', repo, '--notes-file', notes]);
  console.log(`Updated actual attachment URLs for ${tag}`);
} finally {
  await fs.rm(directory, {recursive: true, force: true});
}
