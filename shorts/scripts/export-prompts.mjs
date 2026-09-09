import {getTemplate, resolveTemplate} from '../src/templates/registry.ts';
import fs from 'node:fs/promises';
import path from 'node:path';
import {buildPromptBundle} from './shorts-prompts.mjs';

const [output, manifestPath] = process.argv.slice(2);
const template = manifestPath ? resolveTemplate(JSON.parse(await fs.readFile(manifestPath, 'utf8'))) : getTemplate(process.env.SHORTS_TEMPLATE || undefined);
const bundle = JSON.stringify(buildPromptBundle(template.instructions), null, 2) + '\n';
if (output) {
  await fs.mkdir(path.dirname(path.resolve(output)), {recursive: true});
  await fs.writeFile(output, bundle);
  console.log(`Resolved shared shorts prompts: ${output}`);
} else process.stdout.write(bundle);
