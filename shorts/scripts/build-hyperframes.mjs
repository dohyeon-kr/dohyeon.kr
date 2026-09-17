import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {getHyperframesTheme} from './hyperframes-themes.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.join(repoRoot, 'shorts');
const manifestArg = process.argv.slice(2).find(arg => !arg.startsWith('--'));
if (!manifestArg) throw new Error('Usage: node shorts/scripts/build-hyperframes.mjs <shorts/content/.../candidate.json> [--prepared=shorts/.tmp/...json] [--output=dir]');

const manifestPath = path.resolve(repoRoot, manifestArg);
const contentRoot = path.resolve(shortsRoot, 'content') + path.sep;
if (!manifestPath.startsWith(contentRoot) || path.extname(manifestPath) !== '.json') {
  throw new Error('Manifest must be a JSON file under shorts/content/.');
}
const candidate = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const themeId = candidate.style?.template ?? candidate.style?.theme;
const theme = getHyperframesTheme(themeId);
await import(new URL(theme.builder, import.meta.url));
