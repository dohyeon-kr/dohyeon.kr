import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {upsertDraftRelease} from './github-release.mjs';

const [assetDir, manifestPath] = process.argv.slice(2);
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const sourceRunId = process.env.SOURCE_RUN_ID;
const sourceSha = process.env.SOURCE_SHA;
if (!assetDir || !manifestPath) throw new Error('Usage: node publish-video-release.mjs <asset-directory> <manifest>');
if (!repository || !token || !/^\d+$/.test(sourceRunId ?? '') || !/^[a-f0-9]{40}$/.test(sourceSha ?? '')) {
  throw new Error('GITHUB_REPOSITORY, GH_TOKEN, SOURCE_RUN_ID and SOURCE_SHA are required');
}
if (!/^shorts\/content\/[^/]+\/[^/]+\.json$/.test(manifestPath) || manifestPath.includes('..')) throw new Error('Invalid manifest path');

const safeName = value => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const slug = safeName(path.basename(path.dirname(manifestPath)));
const candidate = safeName(manifest.id || path.basename(manifestPath, '.json'));
if (!slug || !candidate) throw new Error('Unable to derive reel identity');
const prefix = `${slug}-${candidate}`;
const digest = createHash('sha256').update(`${manifestPath}\0${manifest.id || ''}`).digest('hex').slice(0, 12);
const rawTag = `shorts-reel-${prefix}`;
const tag = rawTag.length <= 180 ? rawTag : `shorts-reel-${slug.slice(0, 120)}-${digest}`;

const allowed = new Set([
  `${prefix}.mp4`,
  `${prefix}.srt`,
  `${prefix}-MEDIA.md`,
  `${prefix}-BGM.md`,
  `${prefix}-REELS.txt`,
  `${prefix}-SCRIPT.txt`,
]);
const entries = await fs.readdir(assetDir, {withFileTypes: true});
const assets = entries
  .filter(entry => entry.isFile() && allowed.has(entry.name))
  .map(entry => path.join(assetDir, entry.name))
  .sort();
if (!assets.some(filename => filename.endsWith(`${prefix}.mp4`))) throw new Error(`No rendered MP4 found for ${prefix}`);

let releaseCopy = '';
try {
  releaseCopy = execFileSync(process.execPath, [path.join(import.meta.dirname, 'reels-release-copy.mjs'), assetDir], {encoding: 'utf8'}).trim();
} catch (error) {
  throw new Error(`Failed to build release copy: ${error.message}`);
}
const base = process.env.GITHUB_SERVER_URL || 'https://github.com';
const body = [
  '# 완성된 숏츠',
  '',
  `이 Release는 **${prefix}** 릴스의 최종본을 유지합니다. 같은 manifest를 다시 렌더하면 새 Release를 만들지 않고 이 Assets를 교체합니다.`,
  '',
  'MP4와 SRT, 대본, 게시 문구, 미디어/BGM 출처 파일을 아래 Assets에서 개별 다운로드할 수 있습니다.',
  '',
  `[원본 렌더 실행](${base}/${repository}/actions/runs/${sourceRunId}) · [원본 커밋](${base}/${repository}/commit/${sourceSha})`,
  '',
  releaseCopy,
  '',
].join('\n');

const release = await upsertDraftRelease({
  repository,
  token,
  tag,
  target: sourceSha,
  title: `Shorts final · ${prefix}`,
  body,
  assets,
});

if (process.env.GITHUB_STEP_SUMMARY) {
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `\n## 완성된 숏츠\n\n[릴스별 고정 Release에서 다운로드](${release.html_url})\n`);
}
console.log(`Updated final reel release ${release.html_url} (${tag}) with ${assets.length} assets`);
