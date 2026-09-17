import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('storyboard strict rejection batches all Aurora findings into one cheap GPT-4.x repair PR', async () => {
  const workflow = await fs.readFile(path.join(repoRoot, '.github', 'workflows', 'storyboard-shorts.yml'), 'utf8');

  assert.match(workflow, /permissions:[\s\S]*contents:\s*write[\s\S]*pull-requests:\s*write/);
  assert.match(workflow, /SHORTS_STRICT_REPAIR_MODEL:[^\n]*gpt-4\.1-mini/);
  assert.equal((workflow.match(/node shorts\/scripts\/repair-strict-storyboard\.mjs/g) || []).length, 1,
    'strict findings should be sent through one repair invocation');
  assert.match(workflow, /peter-evans\/create-pull-request@/);
  assert.match(workflow, /automation\/aurora-strict-repair-/);
});
