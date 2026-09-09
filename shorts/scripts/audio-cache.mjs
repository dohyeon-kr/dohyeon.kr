import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

export const AUDIO_CACHE_DIR = process.env.SHORTS_AUDIO_CACHE_DIR || path.resolve(import.meta.dirname, '../.cache/audio');
const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
export const speechCacheKey = request => hash(canonical({version: 1, ...request}));
async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {await fs.writeFile(temporary, content); await fs.rename(temporary, file);}
  finally {await fs.rm(temporary, {force: true});}
}

export async function cachedSpeech({client, request, cacheDir = AUDIO_CACHE_DIR}) {
  const key = speechCacheKey(request);
  const file = path.join(cacheDir, `${key}.mp3`);
  const metadataFile = path.join(cacheDir, `${key}.json`);
  try {
    const [bytes, metadata] = await Promise.all([fs.readFile(file), fs.readFile(metadataFile, 'utf8').then(JSON.parse)]);
    if (bytes.length && metadata.key === key && metadata.sha256 === hash(bytes)) {
      console.log(`TTS cache hit: ${key.slice(0, 12)}`);
      return bytes;
    }
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  if (process.env.SHORTS_AUDIO_CACHE_ONLY === 'true') throw new Error('TTS cache miss; run audio preparation before rendering');
  // Persist the provider's raw audio before atempo, alignment or video rendering.
  const response = await client.audio.speech.create(request, {maxRetries: 0});
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('TTS returned empty audio');
  await atomicWrite(file, bytes);
  await atomicWrite(metadataFile, JSON.stringify({key, sha256: hash(bytes), request}, null, 2));
  console.log(`TTS cached: ${key.slice(0, 12)}`);
  return bytes;
}

export async function cachedTranscription({client, audioFile, narration, attempt, cacheDir = AUDIO_CACHE_DIR, createFile}) {
  const key = hash(JSON.stringify({version: 1, audio: hash(await fs.readFile(audioFile)), narration,
    model: 'whisper-1', language: 'ko', response_format: 'verbose_json', timestamp_granularities: ['word'], attempt}));
  const file = path.join(cacheDir, `${key}-transcription.json`);
  try {return JSON.parse(await fs.readFile(file, 'utf8'));}
  catch (error) {if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;}
  if (process.env.SHORTS_AUDIO_CACHE_ONLY === 'true') throw new Error('Alignment cache miss; run audio preparation before rendering');
  const result = await client.audio.transcriptions.create({file: createFile(audioFile), model: 'whisper-1', language: 'ko',
    response_format: 'verbose_json', timestamp_granularities: ['word'], prompt: narration}, {maxRetries: 0});
  await atomicWrite(file, JSON.stringify(result));
  return result;
}
