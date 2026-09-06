import fs from 'node:fs/promises';
import {z} from 'zod/v4';
import {PresenterSchema} from '../src/presenter/schema.ts';
await fs.writeFile(new URL('../docs/presenter.schema.json',import.meta.url),`${JSON.stringify(z.toJSONSchema(PresenterSchema),null,2)}\n`);
