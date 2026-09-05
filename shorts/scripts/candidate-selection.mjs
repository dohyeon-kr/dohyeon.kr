import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const START = '<!-- shorts-selection:start -->';
export const END = '<!-- shorts-selection:end -->';
export const candidatePath = /^shorts\/content\/[^/\\\r\n`]+\/candidate-\d+\.json$/;

export function selectedCandidates(body = '') {
  if (!body.includes(START) && !body.includes(END)) return [];
  if (body.split(START).length !== 2 || body.split(END).length !== 2 || body.indexOf(END) < body.indexOf(START)) {
    throw new Error('Invalid shorts selection block.');
  }
  const block = body.slice(body.indexOf(START) + START.length, body.indexOf(END));
  const selected = [];
  for (const line of block.split('\n')) {
    if (!/^\s*- \[[xX]\]/.test(line)) continue;
    const match = line.match(/^\s*- \[[xX]\] `([^`]+)`\s*$/);
    if (!match || !candidatePath.test(match[1]) || match[1].split('/').some(p => p === '.' || p === '..')) {
      throw new Error(`Invalid selected candidate: ${line}`);
    }
    selected.push(match[1]);
  }
  return [...new Set(selected)].sort();
}

export async function validateSelection(selected, root = process.cwd()) {
  if (!selected.length) return selected;
  const contentRoot = await fs.realpath(path.join(root, 'shorts/content'));
  for (const name of selected) {
    const resolved = await fs.realpath(path.join(root, name));
    if (!resolved.startsWith(contentRoot + path.sep)) throw new Error(`Candidate escapes content directory: ${name}`);
    const manifest = JSON.parse(await fs.readFile(resolved, 'utf8'));
    if (!Array.isArray(manifest.scenes) || !manifest.scenes.length) throw new Error(`Invalid candidate: ${name}`);
  }
  return selected;
}

export async function reviewBody(directory, postUrl = '') {
  if (!candidatePath.test(`${directory}/candidate-01.json`) || directory.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid candidate directory');
  const names = (await fs.readdir(directory)).filter(n => /^candidate-\d+\.json$/.test(n)).sort();
  const repo = process.env.GITHUB_REPOSITORY || 'dohyeon-kr/dohyeon.kr';
  const branch = process.env.CANDIDATE_BRANCH || `automation/shorts-${process.env.GITHUB_RUN_ID}`;
  const index = `https://github.com/${repo}/blob/${branch}/${directory}/README.md`;
  return `Generated from ${postUrl}.\n\n[후보별 대본·스토리보드 읽기](${index})\n\n## 사용할 후보 선택\n\n진행할 후보만 체크하세요. 선택하지 않은 후보도 파일로 보관됩니다.\n체크를 변경하면 선택한 후보의 무음 미리보기와 장면 이미지를 Actions에서 생성합니다.\n아무것도 체크하지 않으면 후보 렌더링을 건너뜁니다.\n\n${START}\n${names.map(n => `- [ ] \`${directory}/${n}\``).join('\n')}\n${END}\n\n병합하면 체크된 후보만 검토용 스토리보드 Draft Release로 생성합니다.\n최종 영상은 스토리보드 검토 후 Render blog shorts에서 해당 JSON 경로와 승인 체크로 실행하세요.\nJSON 수정 후에는 다음 명령으로 검토 문서를 갱신하세요:\n\`node shorts/scripts/describe-candidates.mjs "${directory}"\`\n`;
}

async function main() {
  if (process.argv[2] === 'body') {
    await fs.writeFile(process.argv[4], await reviewBody(process.argv[3], process.env.POST_URL));
    return;
  }
  const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const selected = await validateSelection(selectedCandidates(event.pull_request?.body));
  const listFile = path.join(process.env.RUNNER_TEMP, 'shorts-selected-candidates.txt');
  await fs.writeFile(listFile, selected.length ? selected.join('\n') + '\n' : '');
  await fs.appendFile(process.env.GITHUB_OUTPUT, `list_file=${listFile}\ncount=${selected.length}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## 선택한 후보\n\n${selected.length ? selected.map(n => `- \`${n}\``).join('\n') : '선택한 후보가 없어 렌더링을 건너뜁니다. PR 본문에서 후보를 체크하세요.'}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
