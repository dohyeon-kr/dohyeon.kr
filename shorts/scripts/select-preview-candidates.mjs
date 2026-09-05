import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function selectPreviewCandidates(base, head, cwd = process.cwd()) {
  if (![base, head].every(sha => /^[a-f0-9]{40}$/i.test(sha ?? ''))) {
    throw new Error('BASE_SHA and HEAD_SHA must be full Git commit SHAs.');
  }
  // The merge base excludes changes that only landed on the target branch.
  // NUL delimiters preserve spaces and non-ASCII post slugs.
  const changed = execFileSync('git', [
    'diff', '--name-only', '-z', '--diff-filter=AMR', `${base}...${head}`,
    '--', 'shorts/content/',
  ], {cwd, encoding: 'utf8'}).split('\0').filter(Boolean);
  return [...new Set(changed.filter(name => /^shorts\/content\/[^/\r\n]+\/candidate-\d+\.json$/.test(name)))].sort();
}

async function main() {
  const candidates = selectPreviewCandidates(process.env.BASE_SHA, process.env.HEAD_SHA);
  const listFile = path.join(process.env.RUNNER_TEMP, 'shorts-preview-candidates.txt');
  await fs.writeFile(listFile, candidates.length ? `${candidates.join('\n')}\n` : '');
  await fs.appendFile(process.env.GITHUB_OUTPUT, `list_file=${listFile}\ncount=${candidates.length}\n`);
  console.log(candidates.length ? candidates.join('\n') : 'No candidate JSON changes; skipping candidate preview.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
