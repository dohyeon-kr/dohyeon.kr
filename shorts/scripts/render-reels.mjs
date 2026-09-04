import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(shortsRoot, 'out');

const safeName = (value) => value.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/^-+|-+$/g, '');

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'inherit', ...options});
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const main = async () => {
  const manifestArg = process.argv[2];
  if (!manifestArg) throw new Error('Usage: node render-reels.mjs <shorts/content/.../candidate-XX.json>');

  const manifestPath = path.resolve(repoRoot, manifestArg);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const slug = safeName(path.basename(path.dirname(manifestPath)));
  const candidateId = safeName(manifest.id || path.basename(manifestPath, '.json'));
  const base = path.join(outputRoot, `${slug}-${candidateId}`);

  await run(process.execPath, [path.join(shortsRoot, 'scripts', 'render.mjs'), manifestArg], {
    cwd: repoRoot,
    env: process.env,
  });

  const hashtags = Array.isArray(manifest.candidate?.hashtags)
    ? manifest.candidate.hashtags.join(' ')
    : '';
  const reelsBody = [
    manifest.candidate?.suggestedCaption?.trim() || manifest.candidate?.title || '',
    '',
    hashtags,
    '',
    `원문: ${manifest.source.url}`,
  ].join('\n').trim() + '\n';

  const narrationScript = manifest.scenes
    .map((scene, index) => `${index + 1}. ${scene.narration}`)
    .join('\n\n') + '\n';

  await fs.writeFile(`${base}-REELS.txt`, reelsBody, 'utf8');
  await fs.writeFile(`${base}-SCRIPT.txt`, narrationScript, 'utf8');

  console.log(`Prepared Reels copy assets at ${path.relative(repoRoot, base)}-*.`);
};

await main();
