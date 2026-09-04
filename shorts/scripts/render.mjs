import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';
import OpenAI from 'openai';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(shortsRoot, 'public');
const generatedRoot = path.join(publicRoot, 'generated');
const outputRoot = path.join(shortsRoot, 'out');
const tempRoot = path.join(shortsRoot, '.tmp');
const FPS = 30;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const imageExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

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

const runCapture = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'inherit']});
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const audioDuration = async (file) => {
  try {
    const value = await runCapture('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
};

const copyFonts = async () => {
  const fontDir = path.join(publicRoot, 'fonts');
  await fs.mkdir(fontDir, {recursive: true});
  for (const name of ['Pretendard-Bold.woff', 'Pretendard-Regular.woff']) {
    await fs.copyFile(path.join(repoRoot, 'scripts', 'thumbnail-fonts', name), path.join(fontDir, name));
  }
};

const downloadImage = async (scene, destinationBase) => {
  if (!scene.image) return null;
  const urls = [scene.image.originalUrl, scene.image.thumbnailUrl].filter(Boolean);
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {'user-agent': 'dohyeon.kr-shorts/1.0 (+https://dohyeon.kr)'},
      });
      if (!response.ok) continue;

      const rawType = response.headers.get('content-type') || '';
      const type = rawType.split(';', 1)[0].trim().toLowerCase();
      const ext = imageExtensions.get(type);
      if (!ext) continue;

      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > MAX_IMAGE_BYTES) continue;

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) continue;

      const target = `${destinationBase}${ext}`;
      await fs.writeFile(target, bytes);
      return target;
    } catch (error) {
      console.warn(`Image download failed: ${url}`, error.message);
    }
  }
  return null;
};

const relativeStaticPath = (absolutePath) => path.relative(publicRoot, absolutePath).split(path.sep).join('/');

const main = async () => {
  const manifestArg = process.argv[2];
  if (!manifestArg) throw new Error('Usage: node render.mjs <shorts/content/.../candidate-XX.json>');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');

  const manifestPath = path.resolve(repoRoot, manifestArg);
  const contentRoot = path.join(shortsRoot, 'content') + path.sep;
  if (!manifestPath.startsWith(contentRoot) || path.extname(manifestPath) !== '.json') {
    throw new Error('Manifest must be a JSON file under shorts/content/.');
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const slug = safeName(path.basename(path.dirname(manifestPath)));
  const candidateId = safeName(manifest.id || path.basename(manifestPath, '.json'));
  const assetDir = path.join(generatedRoot, slug, candidateId);
  await Promise.all([
    fs.mkdir(assetDir, {recursive: true}),
    fs.mkdir(outputRoot, {recursive: true}),
    fs.mkdir(tempRoot, {recursive: true}),
  ]);
  await copyFonts();

  const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const renderScenes = [];

  for (const [index, scene] of manifest.scenes.entries()) {
    const prefix = `scene-${String(index + 1).padStart(2, '0')}`;
    const imageFile = await downloadImage(scene, path.join(assetDir, prefix));

    let audioPath = null;
    let audioDurationSeconds = null;
    if (scene.narration?.trim()) {
      const audioFile = path.join(assetDir, `${prefix}.mp3`);
      const speech = await client.audio.speech.create({
        model: process.env.SHORTS_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: process.env.SHORTS_TTS_VOICE || 'alloy',
        input: scene.narration,
        instructions:
          '한국어로 차분하고 또렷하게 말한다. 프레젠테이션 숏폼 내레이션처럼 군더더기 없이, 자연스러운 속도와 낮은 과장도로 읽는다.',
        response_format: 'mp3',
      });
      await fs.writeFile(audioFile, Buffer.from(await speech.arrayBuffer()));
      audioPath = relativeStaticPath(audioFile);
      audioDurationSeconds =
        (await audioDuration(audioFile)) ?? Math.max(2.2, scene.narration.replace(/\s/g, '').length / 6.5);
    }

    renderScenes.push({
      ...scene,
      imagePath: imageFile ? relativeStaticPath(imageFile) : null,
      audioPath,
      audioDurationSeconds,
    });
  }

  const renderManifest = {...manifest, scenes: renderScenes};
  const propsFile = path.join(tempRoot, `${slug}-${candidateId}.json`);
  await fs.writeFile(propsFile, `${JSON.stringify(renderManifest, null, 2)}\n`, 'utf8');

  const totalSeconds = renderScenes.reduce(
    (sum, scene) => sum + Math.max(2.2, (scene.audioDurationSeconds ?? 3.6) + 0.28),
    0,
  );
  const durationFrames = Math.ceil(totalSeconds * FPS);
  const outputFile = path.join(outputRoot, `${slug}-${candidateId}.mp4`);

  await run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    [
      'remotion',
      'render',
      'src/index.tsx',
      'ShortVideo',
      outputFile,
      `--props=${propsFile}`,
      '--public-dir=public',
      `--duration=${durationFrames}`,
      '--codec=h264',
      '--crf=18',
      '--concurrency=50%',
    ],
    {cwd: shortsRoot, env: process.env},
  );

  const attributionLines = [
    `# Media sources — ${manifest.candidate?.title ?? candidateId}`,
    '',
    `Blog source: ${manifest.source.url}`,
    '',
    'Image discovery powered by Openverse. Openverse aggregates license metadata; verify the source page before publishing.',
    '',
  ];

  for (const [index, scene] of manifest.scenes.entries()) {
    if (!scene.image) continue;
    attributionLines.push(
      `## Scene ${index + 1}`,
      '',
      `- Query: ${scene.image.query}`,
      `- Work: ${scene.image.title ?? 'Untitled'}`,
      `- Creator: ${scene.image.creator ?? 'Unknown'}`,
      `- License: ${scene.image.license}${scene.image.licenseVersion ? ` ${scene.image.licenseVersion}` : ''}`,
      `- License URL: ${scene.image.licenseUrl ?? 'N/A'}`,
      `- Source page: ${scene.image.sourcePage ?? 'N/A'}`,
      '',
    );
  }

  await fs.writeFile(
    path.join(outputRoot, `${slug}-${candidateId}-MEDIA.md`),
    `${attributionLines.join('\n')}\n`,
    'utf8',
  );

  console.log(`Rendered ${path.relative(repoRoot, outputFile)}`);
};

await main();
