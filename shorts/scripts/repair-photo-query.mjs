import {renderPrompt} from './shorts-prompts.mjs';
import {z} from 'zod/v4';
import {zodTextFormat} from 'openai/helpers/zod';

export const PhotoQueryRepairSchema = z.object({
  alternatives: z.array(z.object({query: z.string().min(1).max(100), rationale: z.string()})).min(1).max(3),
});
export function createPhotoQueryRepair(client, {model, maxCalls = 21, deadline = Date.now() + 40 * 60_000} = {}) {
  let calls = 0;
  return async ({scene, sceneNumber, title, history}) => {
    if (calls >= maxCalls || Date.now() >= deadline) throw new Error('Photo query repair budget exhausted');
    calls++;
    const response = await client.responses.parse({
      model, store: false,
      instructions: renderPrompt('photo-query-repair'),
      input: JSON.stringify({scene, sceneNumber, title, failedSearches: history}),
      text: {format: zodTextFormat(PhotoQueryRepairSchema, 'photo_query_repair')},
    }, {timeout: Math.max(1, Math.min(120000, deadline - Date.now())), maxRetries: 2});
    if (!response.output_parsed) throw new Error('Photo query repair refused or incomplete');
    return PhotoQueryRepairSchema.parse(response.output_parsed).alternatives;
  };
}
