import OpenAI from 'openai';

export function imageGenerationGuard(fetchImplementation = globalThis.fetch) {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (/\/images\/(generations|edits|variations)\/?$/.test(url.pathname)) throw new Error('Image generation is disabled in shorts workflows');
    let body = init?.body;
    if (body == null && input instanceof Request && !['GET', 'HEAD'].includes(input.method)) body = await input.clone().text();
    if (typeof body === 'string') {
      let payload;
      try {payload = JSON.parse(body);} catch { /* Multipart audio uploads are not JSON. */ }
      if (payload?.tools?.some(tool => tool.type === 'image_generation')) throw new Error('Image generation is disabled in shorts workflows');
    }
    return fetchImplementation(input, init);
  };
}
export default class ShortsOpenAI extends OpenAI {
  constructor(options = {}) {
    if (process.env.SHORTS_IMAGE_GENERATION && process.env.SHORTS_IMAGE_GENERATION !== 'disabled') throw new Error('Shorts only supports SHORTS_IMAGE_GENERATION=disabled');
    super({...options, fetch: imageGenerationGuard(options.fetch)});
  }
}
