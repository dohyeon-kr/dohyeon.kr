import fs from 'node:fs/promises';
import path from 'node:path';
import {describeCandidate} from './describe-candidates.mjs';

const safeName = (value) => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');
const segment = (value) => encodeURIComponent(value);
const [listFile, notesFile] = process.argv.slice(2);
if (!listFile || !notesFile) throw new Error('Usage: node storyboard-release-notes.mjs <manifest-list> <notes-file>');
const {GITHUB_REPOSITORY: repository, GITHUB_SHA: sha, TAG_NAME: tag} = process.env;
if (!repository || !sha || !tag) throw new Error('GITHUB_REPOSITORY, GITHUB_SHA and TAG_NAME are required');
const base = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repository}`;
const reviewUrl = `${base}/actions/workflows/review-storyboard.yml`;
const renderUrl = `${base}/actions/workflows/render-shorts.yml`;
if (!process.env.STORYBOARD_ASSET_URLS) throw new Error('Verified storyboard asset URLs are required');
const assetUrls = JSON.parse(await fs.readFile(process.env.STORYBOARD_ASSET_URLS, 'utf8'));
const assetUrl = name => {
  const url = assetUrls[name];
  if (!url || !url.startsWith('https://') || url.includes('/releases/download/')) throw new Error(`Missing stable asset URL: ${name}`);
  return url;
};
const manifests = [...new Set((await fs.readFile(listFile, 'utf8')).split(/\r?\n/).filter(Boolean))];
if (!manifests.length) throw new Error('No manifests to describe');
const notes = [
  '# 작업 중인 숏츠 스토리보드',
  '',
  '> 이 Draft Release는 현재 작업 중인 릴스의 프리뷰 1개만 유지합니다. 새 스토리보드나 리뷰 결과가 나오면 본문과 Assets를 현재 작업분으로 교체합니다.',
  '',
  `**[AI 리뷰·개선 PR 만들기](${reviewUrl})**`,
  '',
  '수정이 필요하면 위 페이지에서 아래 JSON 경로를 manifest에 넣으세요. storyboard_source를 비우면 이 작업용 프리뷰를 사용합니다. 과거 릴리즈를 명시적으로 검토해야 할 때만 URL 또는 태그를 입력하세요.',
  '',
  `**[최종 렌더 실행 페이지 열기](${renderUrl})**`,
  '',
  '스토리보드를 확인한 뒤 위 페이지에서 **Run workflow**를 누르세요. 아래 후보의 JSON 경로를 `manifest`에 붙여넣고, `storyboard_approved`를 체크한 뒤 실행합니다. 최종 렌더는 이 프리뷰 릴리즈와 분리되어 각 릴스별 고정 Release를 갱신합니다.',
  '',
  `검토한 원본: [${sha.slice(0, 7)}](${base}/commit/${sha})`,
  '',
  `작업용 프리뷰 태그: \`${tag}\``,
  '',
  '렌더할 브랜치에 아래 JSON이 있는지 확인하세요. 검토 후 JSON이 바뀌었다면 스토리보드도 다시 확인해야 합니다.',
  '',
  '아래에는 장면별 스토리보드가 표시되며, 전체 Markdown·장면 PNG·모아보기 JPG·PDF도 Assets에 첨부됩니다. 본문 이미지는 생성 시 검증한 고정 주소로 표시됩니다.',
  '',
];
const details = [];
for (const manifestPath of manifests) {
  if (!/^shorts\/content\/[^/]+\/[^/]+\.json$/.test(manifestPath) || manifestPath.includes('..')) throw new Error(`Invalid manifest path: ${manifestPath}`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const slug = safeName(path.basename(path.dirname(manifestPath)));
  const candidate = safeName(manifest.id || path.basename(manifestPath, '.json'));
  const prefix = `${slug}-${candidate}`;
  const directory = path.join('shorts/out/storyboards', prefix);
  const sourceUrl = `${base}/blob/${sha}/${manifestPath.split('/').map(segment).join('/')}`;
  let description = describeCandidate(manifest, path.basename(manifestPath));
  description = description.replace(`(${encodeURIComponent(path.basename(manifestPath))})`, `(${sourceUrl})`);
  for (let i = 0; i < manifest.scenes.length; i++) {
    const name = `${prefix}-scene-${String(i + 1).padStart(2, '0')}.png`;
    await fs.access(path.join(directory, name));
    const heading = new RegExp(`(^## ${i + 1}\\. [^\\n]*\\n)`, 'm');
    const stem = name.replace(/\.png$/, '');
    let review = `![장면 ${i + 1}](${assetUrl(name)})`;
    if (manifest.scenes[i].diagramSpec || manifest.scenes[i].backgroundVideo || manifest.scenes[i].presenter != null) {
      for (const phase of ['initial', 'change']) await fs.access(path.join(directory, `${stem}-${phase}.png`));
      review = `| 시작 | 변화 | 결과 |\n| --- | --- | --- |\n| ![시작](${assetUrl(`${stem}-initial.png`)}) | ![변화](${assetUrl(`${stem}-change.png`)}) | ![결과](${assetUrl(name)}) |`;
    }
    description = description.replace(heading, `$1\n${review}\n\n[장면 이미지 열기](${assetUrl(name)})\n`);
  }
  const markdownName = `${prefix}-STORYBOARD.md`;
  await fs.writeFile(path.join(directory, markdownName), description);
  notes.push(
    `## ${prefix}`,
    '',
    '복사할 JSON 경로:',
    '',
    '```text',
    manifestPath,
    '```',
    '',
    `[렌더 실행 페이지](${renderUrl}) · [검토한 JSON](${sourceUrl}) · [전체 스토리보드 Markdown](${assetUrl(markdownName)})`,
    '',
    `[모아보기 JPG](${assetUrl(`${prefix}-contact-sheet.jpg`)}) · [장면별 PDF](${assetUrl(`${prefix}-storyboard.pdf`)})`,
    '',
  );
  if (manifest.scenes.some(scene => scene.diagramSpec || scene.backgroundVideo || scene.presenter != null)) {
    notes.push(`[시작 → 변화 → 결과 모아보기](${assetUrl(`${prefix}-motion-contact-sheet.jpg`)})`, '');
  }
  details.push(description);
}
for (const description of details) {
  const block = `\n---\n\n${description}`;
  if (Buffer.byteLength(notes.join('\n') + block, 'utf8') <= 60000) notes.push(block);
  else notes.push('', '상세 스토리보드는 위의 전체 스토리보드 Markdown 첨부파일에서 확인하세요.', '');
}
await fs.writeFile(notesFile, `${notes.join('\n')}\n`);
