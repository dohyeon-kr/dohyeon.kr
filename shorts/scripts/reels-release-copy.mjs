import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export async function reelsReleaseCopy(assetDir) {
  const files = await fs.readdir(assetDir, {withFileTypes: true});
  const videos = files.filter(file => file.isFile() && file.name.endsWith('.mp4')).map(file => file.name).sort();
  const sections = ['## 릴스 게시 문구', '', '아래 문구를 복사해 릴스 게시 본문에 붙여 넣으세요.', ''];
  for (const video of videos) {
    const label = video.replace(/([\\`*_[\]<>])/g, '\\$1');
    sections.push(`### ${label}`, '');
    let copy;
    try {
      copy = await fs.readFile(path.join(assetDir, video.replace(/\.mp4$/, '-REELS.txt')), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (copy?.trim()) {
      // A fence longer than anything in the caption preserves Markdown verbatim.
      const fence = '`'.repeat(Math.max(3, ...[...copy.matchAll(/`+/g)].map(match => match[0].length + 1)));
      sections.push(fence, copy.trimEnd(), fence, '');
    } else {
      sections.push('이 영상에는 저장된 릴스 게시 문구가 없습니다.', '');
    }
  }
  return `${sections.join('\n')}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(await reelsReleaseCopy(process.argv[2]));
}
