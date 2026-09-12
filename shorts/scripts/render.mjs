import {resolveTemplate} from '../src/templates/registry.ts';
import {createStoryboardRenderer, previewScale} from './storyboard-renderer.mjs';
import {cachedSpeech, cachedTranscription} from './audio-cache.mjs';
import {renderPrompt} from './shorts-prompts.mjs';
import {alignPresenter} from './align-presenter.mjs';
import {withBlogCta} from './blog-cta.mjs';
import {loadVideoCatalog, validateVideoSelection, acquireVideo, prepareVideo} from './video-assets.mjs';
import {videoFrameCount} from '../src/video/schema.ts';
import {normalizeWordTiming} from '../src/presenter/word-timing.ts';
import {alignBeatTimings, captionsFromBeatTimings} from './caption-alignment.mjs';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';
import OpenAI from './shorts-openai.mjs';
import {mixBgm} from './bgm.mjs';
import {validateDiagramLayout} from '../src/visuals/physics.ts';
import {validateSceneMotion} from '../src/motion/validate.ts';
import {validatePresenterOverlay} from '../src/presenter/overlay.ts';
import {validateScenePresenter} from '../src/presenter/schema.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(shortsRoot, 'public');
const generatedRoot = path.join(publicRoot, 'generated');
const outputRoot = path.join(shortsRoot, 'out');
const tempRoot = path.join(shortsRoot, '.tmp');
const FPS = 30;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const SCENE_TAIL_SECONDS = 0.28;
const MIN_CAPTION_CHARS = 4;
const TARGET_CAPTION_CHARS = 12;
const MAX_CAPTION_CHARS = 16;
const HARD_MAX_CAPTION_CHARS = 22;
const TTS_RATE = Number(process.env.SHORTS_TTS_RATE || '1.5');
const STORYBOARD_FLAG = '--storyboard';
const DEFAULT_PRESENTER_OVERLAY = Object.freeze({
  position: 'bottom-right',
  hideOnCommonCta: true,
  lipSync: 'word-timestamps',
  nod: 'speech',
});
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

const applySpeechRate = async (rawFile, outputFile, rate) => {
  if (rate === 1) {
    await fs.rename(rawFile, outputFile);
    return;
  }
  await run('ffmpeg', [
    '-y',
    '-i', rawFile,
    '-filter:a', `atempo=${rate}`,
    '-vn',
    '-codec:a', 'libmp3lame',
    '-q:a', '2',
    outputFile,
  ]);
  await fs.rm(rawFile, {force: true});
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
        signal: AbortSignal.timeout(20000),
        headers: {'user-agent': 'dohyeon.kr-shorts/2.0 (+https://dohyeon.kr)'},
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

const legacyVisual = (scene) => {
  if (scene.visual) return scene.visual;
  if ((scene.kind === 'photo' || scene.kind === 'hero') && (scene.image || scene.imageQuery)) {
    return {type: 'photo', motif: null, query: scene.imageQuery ?? scene.image?.query ?? null, value: null, xLabel: null, yLabel: null};
  }
  if (scene.kind === 'compare') {
    return {type: 'diagram', motif: 'compare', query: null, value: null, xLabel: null, yLabel: null};
  }
  return {type: 'none', motif: null, query: null, value: null, xLabel: null, yLabel: null};
};

const legacyLayout = (scene) => {
  if (scene.layout) return scene.layout;
  if (scene.kind === 'compare') return 'compare-columns';
  if (scene.kind === 'outro') return 'outro-minimal';
  if (scene.kind === 'photo' || scene.kind === 'hero') return 'photo-top-right';
  return 'statement-offset';
};

const normalizeScene = (scene) => ({
  ...scene,
  layout: legacyLayout(scene),
  visual: legacyVisual(scene),
});

const compactLength = (value) => value.replace(/\s/g, '').length;
const endsWithSoftBreak = (value) => /[,，;；:]$/.test(value.trim());

const rebalanceCaptionChunks = (chunks) => {
  const balanced = [...chunks];

  for (let index = balanced.length - 1; index > 0; index -= 1) {
    if (compactLength(balanced[index]) >= MIN_CAPTION_CHARS) continue;
    const merged = `${balanced[index - 1]} ${balanced[index]}`.trim();
    balanced.splice(index - 1, 2, merged);
  }

  for (let index = 0; index < balanced.length - 1; index += 1) {
    if (compactLength(balanced[index]) >= MIN_CAPTION_CHARS) continue;
    const merged = `${balanced[index]} ${balanced[index + 1]}`.trim();
    balanced.splice(index, 2, merged);
    index -= 1;
  }

  return balanced;
};

const splitCaptionSentence = (text) => {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  if (compactLength(text) <= HARD_MAX_CAPTION_CHARS) return [text.trim()];

  const chunks = [];
  let current = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = current ? `${current} ${token}` : token;
    const nextLength = compactLength(next);
    const remaining = tokens.slice(index + 1).join(' ');
    const remainingLength = compactLength(remaining);

    const canBreakAtPunctuation =
      current &&
      endsWithSoftBreak(current) &&
      compactLength(current) >= TARGET_CAPTION_CHARS &&
      remainingLength >= MIN_CAPTION_CHARS;

    if (canBreakAtPunctuation) {
      chunks.push(current);
      current = token;
      continue;
    }

    if (
      current &&
      nextLength > MAX_CAPTION_CHARS &&
      compactLength(current) >= MIN_CAPTION_CHARS &&
      remainingLength + compactLength(token) >= MIN_CAPTION_CHARS
    ) {
      chunks.push(current);
      current = token;
      continue;
    }

    current = next;

    if (compactLength(current) >= HARD_MAX_CAPTION_CHARS && remainingLength >= MIN_CAPTION_CHARS) {
      chunks.push(current);
      current = '';
    }
  }

  if (current) chunks.push(current);
  return rebalanceCaptionChunks(chunks);
};

const splitCaptionText = (narration) => {
  const normalized = narration.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?。！？])\s+|\s*(?=[—–])\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  for (const sentence of sentences.length ? sentences : [normalized]) {
    chunks.push(...splitCaptionSentence(sentence));
  }

  return rebalanceCaptionChunks(chunks.filter(Boolean));
};

const buildEstimatedCaptionCues = (chunks, durationSeconds) => {
  const weights = chunks.map((chunk) => Math.max(1, compactLength(chunk)));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const usableDuration = Math.max(0.6, durationSeconds - 0.08);
  let cursor = 0;

  return chunks.map((text, index) => {
    const proportional = (usableDuration * weights[index]) / totalWeight;
    const end = index === chunks.length - 1 ? usableDuration : Math.min(usableDuration, cursor + proportional);
    const cue = {
      startSeconds: Number(cursor.toFixed(3)),
      endSeconds: Number(Math.max(cursor + 0.12, end).toFixed(3)),
      text,
    };
    cursor = end;
    return cue;
  });
};

const buildAlignedCaptionCues = (chunks, words) => {
  const alignedWords = (words ?? []).filter(
    (word) => typeof word?.word === 'string' && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start,
  );
  if (!chunks.length || alignedWords.length < chunks.length) return null;

  const chunkWeights = chunks.map((chunk) => Math.max(1, compactLength(chunk)));
  const wordWeights = alignedWords.map((word) => Math.max(1, compactLength(word.word)));
  const totalChunkWeight = chunkWeights.reduce((sum, value) => sum + value, 0);
  const totalWordWeight = wordWeights.reduce((sum, value) => sum + value, 0);
  const wordPrefix = [];
  let wordSum = 0;
  for (const weight of wordWeights) {
    wordSum += weight;
    wordPrefix.push(wordSum);
  }

  let chunkSum = 0;
  let nextWordIndex = 0;
  const cues = chunks.map((text, index) => {
    const startIndex = nextWordIndex;
    chunkSum += chunkWeights[index];
    const remainingChunks = chunks.length - index - 1;
    const maxEndIndex = alignedWords.length - remainingChunks - 1;
    const targetWeight = totalWordWeight * (chunkSum / totalChunkWeight);
    let endIndex = startIndex;
    while (endIndex < maxEndIndex && wordPrefix[endIndex] < targetWeight) endIndex += 1;
    if (index === chunks.length - 1) endIndex = alignedWords.length - 1;
    nextWordIndex = endIndex + 1;
    return {
      text,
      startSeconds: Number(alignedWords[startIndex].start.toFixed(3)),
      endSeconds: Number(alignedWords[endIndex].end.toFixed(3)),
    };
  });

  for (let index = 0; index < cues.length - 1; index += 1) {
    cues[index].endSeconds = Math.max(cues[index].endSeconds, cues[index + 1].startSeconds);
  }
  return cues;
};

const buildCaptionCues = (narration, durationSeconds, words = null) => {
  if (!narration?.trim() || !durationSeconds) return [];
  const chunks = splitCaptionText(narration);
  if (!chunks.length) return [];
  return buildAlignedCaptionCues(chunks, words) ?? buildEstimatedCaptionCues(chunks, durationSeconds);
};

const srtTimestamp = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

const sceneDurationSeconds = (scene) =>
  Math.max(
    Math.round(2.2 * FPS),
    Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS),
  ) / FPS;

const buildSrt = (scenes) => {
  const entries = [];
  let sceneCursor = 0;
  let index = 1;
  for (const scene of scenes) {
    for (const cue of scene.captions ?? []) {
      entries.push(
        `${index}\n${srtTimestamp(sceneCursor + cue.startSeconds)} --> ${srtTimestamp(sceneCursor + cue.endSeconds)}\n${cue.text}\n`,
      );
      index += 1;
    }
    sceneCursor += sceneDurationSeconds(scene);
  }
  return `${entries.join('\n')}\n`;
};

const main = async () => {
  const storyboardOnly = process.argv.includes(STORYBOARD_FLAG);
  const silentPreview = process.argv.includes('--silent');
  const prepareAudioOnly = process.argv.includes('--prepare-audio');
  if (prepareAudioOnly && (storyboardOnly || silentPreview)) throw new Error('--prepare-audio cannot be combined with preview flags');
  const scale = storyboardOnly || silentPreview ? previewScale() : 1;
  const manifestArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!manifestArg) throw new Error('Usage: node render.mjs <shorts/content/.../candidate-XX.json> [--storyboard | --silent | --prepare-audio]');
  if (!storyboardOnly && !silentPreview && !process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required.');
  if (!Number.isFinite(TTS_RATE) || TTS_RATE < 0.5 || TTS_RATE > 2) {
    throw new Error(`SHORTS_TTS_RATE must be between 0.5 and 2. Received: ${TTS_RATE}`);
  }

  const manifestPath = path.resolve(repoRoot, manifestArg);
  const contentRoot = path.join(shortsRoot, 'content') + path.sep;
  if (!manifestPath.startsWith(contentRoot) || path.extname(manifestPath) !== '.json') {
    throw new Error('Manifest must be a JSON file under shorts/content/.');
  }

  const manifest = withBlogCta(JSON.parse(await fs.readFile(manifestPath, 'utf8')));
  const hasScenePresenter = manifest.scenes.some((scene) => scene.presenter != null || scene.layout === 'presenter-bust');
  if (manifest.presenterOverlay == null && !hasScenePresenter) manifest.presenterOverlay = {...DEFAULT_PRESENTER_OVERLAY};
  if (manifest.scenes.some(s => s.uiMotion) && resolveTemplate(manifest).id !== 'notebook-grid') throw new Error('uiMotion requires notebook-grid');
  resolveTemplate(manifest);
  validatePresenterOverlay(manifest);
  for (const [index, scene] of manifest.scenes.entries()) {
    validateSceneMotion(scene, manifest.scenes[index - 1]);
    if (!scene.diagramSpec) continue;
    validateDiagramLayout(validateDiagram(scene.diagramSpec));
    if (scene.visual?.type === 'photo') throw new Error('Photo and diagramSpec cannot share a scene');
  }
  const slug = safeName(path.basename(path.dirname(manifestPath)));
  const candidateId = safeName(manifest.id || path.basename(manifestPath, '.json'));
  const assetDir = path.join(generatedRoot, slug, candidateId);
  await Promise.all([
    fs.mkdir(assetDir, {recursive: true}),
    fs.mkdir(outputRoot, {recursive: true}),
    fs.mkdir(tempRoot, {recursive: true}),
  ]);
  await copyFonts();

  const videoCatalog = manifest.scenes.some(s => s.backgroundVideo) ? await loadVideoCatalog() : [];
  const videos = [];
  const images = [];
  for (const [index, scene] of manifest.scenes.entries()) {
    const imageFile = await downloadImage(scene, path.join(assetDir, `scene-${String(index + 1).padStart(2, '0')}`));
    if (scene.visual?.type === 'photo' && !imageFile) throw new Error(`Scene ${index + 1}: photo missing or download failed. Supply a working licensed image before rendering.`);
    images.push(imageFile);
    try {
      const asset = validateVideoSelection(scene, videoCatalog);
      videos.push(asset ? {asset, ...await acquireVideo(asset)} : null);
    } catch (error) {throw new Error(`Scene ${index + 1}: ${error.message}`, {cause: error});}
  }
  const client = storyboardOnly || silentPreview ? null : new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  const renderScenes = [];

  for (const [index, rawScene] of manifest.scenes.entries()) {
    const scene = normalizeScene(rawScene);
    const prefix = `scene-${String(index + 1).padStart(2, '0')}`;
    const imageFile = images[index];

    let overlayPresenter = null;
    let audioPath = null;
    let audioDurationSeconds = null;
    let captionWords = null;
    let beatTimings = null;
    if (client && scene.narration?.trim()) {
      const rawAudioFile = path.join(assetDir, `${prefix}-raw.mp3`);
      const audioFile = path.join(assetDir, `${prefix}.mp3`);
      const speech = await cachedSpeech({client, request: {
        model: process.env.SHORTS_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: process.env.SHORTS_TTS_VOICE || 'alloy',
        input: scene.narration,
        instructions: renderPrompt('tts'),
        response_format: 'mp3',
      }});
      await fs.writeFile(rawAudioFile, speech);
      await applySpeechRate(rawAudioFile, audioFile, TTS_RATE);
      audioPath = relativeStaticPath(audioFile);
      const measuredDuration = await audioDuration(audioFile);
      if (measuredDuration == null) throw new Error(`Scene ${index + 1}: cannot measure final TTS duration for caption/presenter alignment`);
      audioDurationSeconds = measuredDuration;

      let timingError = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const transcription = await cachedTranscription({
            client,
            audioFile,
            narration: scene.narration,
            attempt,
            createFile: createReadStream,
          });
          captionWords = normalizeWordTiming(transcription.words, measuredDuration).words;
          timingError = null;
          break;
        } catch (error) {
          timingError = error;
          if (attempt === 1) console.warn(`Caption alignment retry for ${audioFile}: ${error.message}`);
        }
      }
      if (timingError) throw new Error(`Scene ${index + 1}: caption alignment failed: ${timingError.message}`, {cause: timingError});

      const beatAlignment = alignBeatTimings(scene.beats, captionWords);
      if (beatAlignment) {
        beatTimings = beatAlignment.timings;
        if (beatAlignment.method !== 'exact') {
          console.warn(`Scene ${index + 1}: exact beat/word text match failed; using measured proportional word boundaries`);
        }
      }

      const reportFile = path.join(assetDir, `${prefix}-presenter-alignment.json`);
      overlayPresenter = await alignPresenter({client, audioFile, duration: measuredDuration, narration: scene.narration,
        options: manifest.presenterOverlay, scene, reportFile});
    }

    const speechDuration = storyboardOnly || silentPreview ? 3.6 : audioDurationSeconds;
    const presenterEnd = Math.max(0, ...['actions','expressions','mouths'].flatMap(key => (scene.presenter?.[key] ?? []).map(c=>c.end)));
    const previewDuration = scene.commonPage === 'blog-cta-v1' ? Math.max(6, (speechDuration ?? 3.6) + 1.2) : (storyboardOnly || silentPreview) && scene.presenter != null ? Math.max(speechDuration ?? 3.6,presenterEnd) : speechDuration;
    validateScenePresenter(scene, Math.max(2.2,(previewDuration ?? 3.6)+SCENE_TAIL_SECONDS));
    let videoPath = null;
    if (videos[index]) {
      try {
        videoPath = relativeStaticPath(await prepareVideo(scene, videos[index], path.join(assetDir, `${prefix}-background.mp4`), videoFrameCount(previewDuration ?? 3.6)));
      } catch (error) {throw new Error(`Scene ${index + 1}: ${error.message}`, {cause: error});}
    }
    const measuredBeatCaptions = captionsFromBeatTimings(scene.beats, beatTimings);
    renderScenes.push({
      ...scene,
      videoPath,
      overlayPresenter,
      beatTimings,
      imagePath: imageFile ? relativeStaticPath(imageFile) : null,
      audioPath,
      audioDurationSeconds: previewDuration,
      captions: measuredBeatCaptions ?? buildCaptionCues(scene.narration, speechDuration ?? 3.6, captionWords),
    });
  }

  const renderManifest = {...manifest, scenes: renderScenes};
  const propsFile = path.join(tempRoot, `${slug}-${candidateId}.json`);
  await fs.writeFile(propsFile, `${JSON.stringify(renderManifest, null, 2)}\n`, 'utf8');

  const durationFrames = renderScenes.reduce(
    (sum, scene) => sum + Math.max(66, Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS)),
    0,
  );

  const videoSources = videos.flatMap((video, index) => video ? [
    `## Scene ${index + 1}: ${video.asset.title}`, '',
    `- Source: ${video.asset.sourcePage}`, `- Creator: ${video.asset.creator}`,
    `- License: ${video.asset.license} (${video.asset.licenseUrl})`,
    `- Original: ${video.asset.downloadUrl}`, `- SHA-256: ${video.asset.sha256}`,
    `- Prepared file: ${renderScenes[index].videoPath}`,
    `- Edit: ${JSON.stringify(manifest.scenes[index].backgroundVideo)}`,
    '- Changes: trimmed, speed adjusted, grayscale, cropped to fill, text/overlay composited; original audio removed.',
    '- Loop seams, subject crop and final narration timing require playback review.', '',
  ] : []);
  await fs.writeFile(path.join(outputRoot, `${slug}-${candidateId}-VIDEO.md`), ['# Video sources and edits', '', ...videoSources].join('\n'));

  if (prepareAudioOnly) {
    console.log('Audio and alignment prepared and cached; no video rendered.');
    return;
  }

  if (storyboardOnly) {
    const storyboardDir = path.join(outputRoot, 'storyboards', `${slug}-${candidateId}`);
    await fs.mkdir(storyboardDir, {recursive: true});
    const storyboardLines = [
      `# Storyboard — ${manifest.candidate?.title ?? candidateId}`,
      '',
      `Source: ${manifest.source.url}`,
      '',
      `Preview scale: ${scale}; no TTS. Timing is estimated and requires final playback review.`,
      'Approve these scene snapshots before manually running the final render workflow.',
      ...videoSources,
      '',
    ];
    const renderer = await createStoryboardRenderer(renderManifest, scale);
    try {
      let sceneStartFrame = 0;
      for (const [index, scene] of renderScenes.entries()) {
        const duration = Math.max(
          Math.round(2.2 * FPS),
          Math.ceil(((scene.audioDurationSeconds ?? 3.6) + SCENE_TAIL_SECONDS) * FPS),
        );
        const stem = `${slug}-${candidateId}-scene-${String(index + 1).padStart(2, '0')}`;
        const filename = `${stem}.png`;
        const samples = (scene.uiMotion || scene.diagramSpec || scene.backgroundVideo || scene.presenter != null) ? [['initial', .2], ['change', .5], ['result', .8]] : [['result', .8]];
        const images = [];
        for (const [phase, progress] of samples) {
          const target = phase === 'result' ? filename : `${stem}-${phase}.png`;
          const snapshotFrame = sceneStartFrame + Math.min(duration - 10, Math.round(duration * progress));
          await renderer.render(path.join(storyboardDir, target), snapshotFrame);
          images.push(`![${phase}](${target})`);
        }
        storyboardLines.push(`## Scene ${index + 1}`, '', ...images, '',
          `- Headline: ${scene.headline.replace(/\n/g, ' / ')}`,
          `- Narration: ${scene.narration || '(none)'}`, '');
        if (scene.visualStory) for (const [key, value] of Object.entries(scene.visualStory)) storyboardLines.push(`- ${key}: ${value}`);
        sceneStartFrame += duration;
      }
      await fs.writeFile(path.join(storyboardDir, `${slug}-${candidateId}-STORYBOARD.md`), `${storyboardLines.join('\n')}\n`, 'utf8');
    } finally {await renderer.close();}
    console.log(`Rendered storyboard snapshots to ${path.relative(repoRoot, storyboardDir)}.`);
    return;
  }

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
      ...(silentPreview ? [`--scale=${scale}`] : []),
    ],
    {cwd: shortsRoot, env: process.env},
  );

  await fs.writeFile(path.join(outputRoot, `${slug}-${candidateId}.srt`), buildSrt(renderScenes), 'utf8');
  if (!silentPreview) await mixBgm(outputFile, renderScenes);

  const attributionLines = [
    `# Media sources — ${manifest.candidate?.title ?? candidateId}`,
    '',
    `Blog source: ${manifest.source.url}`,
    '',
    'Image sources and licenses are recorded per scene. Curated photos and Openverse search results retain their original attribution.',
    '',
  ];

  attributionLines.push(...videoSources);
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

  console.log(`Rendered ${path.relative(repoRoot, outputFile)} with ${TTS_RATE}x narration, beat-aligned burned-in captions, and SRT.`);
};

await main();
