import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const toRepoPath = (repoRoot, absolutePath) =>
  path.relative(repoRoot, absolutePath).split(path.sep).join('/');

export async function resolveManifestInput(input, {repoRoot = defaultRepoRoot} = {}) {
  const raw = String(input ?? '').trim().replace(/\/+$/, '');
  if (!raw) throw new Error('Manifest input is required.');

  const contentRoot = path.resolve(repoRoot, 'shorts', 'content');
  const absoluteInput = path.resolve(repoRoot, raw);
  const relativeToContent = path.relative(contentRoot, absoluteInput);
  const outsideContent =
    relativeToContent === '..' ||
    relativeToContent.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToContent);

  if (outsideContent || !relativeToContent) {
    throw new Error('Manifest must be a JSON file or post directory directly under shorts/content/.');
  }

  const segments = relativeToContent.split(path.sep).filter(Boolean);
  let stat;
  try {
    stat = await fs.stat(absoluteInput);
  } catch {
    throw new Error(`Manifest input does not exist: ${raw}`);
  }

  if (stat.isFile()) {
    if (segments.length !== 2 || path.extname(absoluteInput) !== '.json') {
      throw new Error('Manifest must be a JSON file directly under shorts/content/<post>/.');
    }
    return {manifest: toRepoPath(repoRoot, absoluteInput), recovered: false, reason: null};
  }

  if (!stat.isDirectory() || segments.length !== 1) {
    throw new Error('Manifest directory must be directly under shorts/content/.');
  }

  const entries = await fs.readdir(absoluteInput, {withFileTypes: true});
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  let selected = jsonFiles.includes('candidate-01.json') ? 'candidate-01.json' : null;
  let reason = selected ? 'directory-default-candidate-01' : null;

  if (!selected && jsonFiles.length === 1) {
    selected = jsonFiles[0];
    reason = 'directory-single-json';
  }

  if (!selected && jsonFiles.length === 0) {
    throw new Error(`Manifest directory contains no JSON candidates: ${raw}`);
  }

  if (!selected) {
    throw new Error(
      `Manifest directory is ambiguous (${jsonFiles.join(', ')}). Pass an explicit candidate JSON path.`,
    );
  }

  return {
    manifest: toRepoPath(repoRoot, path.join(absoluteInput, selected)),
    recovered: true,
    reason,
  };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  try {
    const result = await resolveManifestInput(process.argv[2]);
    if (result.recovered) {
      console.error(
        `::notice title=Manifest input auto-recovered::Resolved ${process.argv[2]} to ${result.manifest} (${result.reason}).`,
      );
    }
    process.stdout.write(result.manifest);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
