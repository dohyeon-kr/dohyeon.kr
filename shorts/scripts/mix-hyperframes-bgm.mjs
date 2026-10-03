import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {mixBgm} from './bgm.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const [videoArg, projectArg] = process.argv.slice(2);
if (!videoArg || !projectArg) throw new Error('Usage: node shorts/scripts/mix-hyperframes-bgm.mjs <video.mp4> <project-dir>');
const video = path.resolve(repoRoot, videoArg);
const project = path.resolve(repoRoot, projectArg);
const manifest = JSON.parse(await fs.readFile(path.join(project, 'manifest.json'), 'utf8'));
if (manifest.audioAlreadyMixed === true && manifest.scenes?.[0]?.visual?.motif === 'signup-phone-number-input-v2') {
  console.log('Retained recovered release audio; skipped duplicate BGM/SFX mixing.');
} else {
  await mixBgm(video, manifest.scenes);
  console.log(`Mixed repository BGM/SFX into ${path.relative(repoRoot, video)}.`);
}
