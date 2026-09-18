import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {repairStrictStoryboard} from '../scripts/repair-strict-storyboard.mjs';
import {collectAuroraStrictIssues} from '../scripts/aurora-strict-layout.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

for (const workflowName of ['storyboard-shorts.yml', 'render-shorts.yml']) {
  test(`${workflowName} batches rejected Aurora strict findings into one cheap GPT-4.x repair PR`, async () => {
    const workflow = await fs.readFile(path.join(repoRoot, '.github', 'workflows', workflowName), 'utf8');

    assert.match(workflow, /permissions:[\s\S]*contents:\s*write[\s\S]*pull-requests:\s*write/);
    assert.match(workflow, /SHORTS_STRICT_REPAIR_MODEL:[^\n]*gpt-4\.1-mini/);
    assert.equal((workflow.match(/node shorts\/scripts\/repair-strict-storyboard\.mjs/g) || []).length, 1,
      'all strict findings available in a run should be sent through one repair invocation');
    assert.match(workflow, /peter-evans\/create-pull-request@/);
    assert.match(workflow, /automation\/aurora-strict-repair-/);
  });
}

test('strict repair applies scene-numbered diagram patches without regenerating the scene list', async (t) => {
  const source = path.join(repoRoot, 'shorts', 'content', 'usecase-domain-repository-seolgyebuteo-dongsiseongggaji', 'candidate-01.json');
  const original = JSON.parse(await fs.readFile(source, 'utf8'));
  const fixtureDir = path.join(repoRoot, 'shorts', 'content', `.strict-repair-${process.pid}-${Date.now()}`);
  const fixture = path.join(fixtureDir, 'candidate-01.json');
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.writeFile(fixture, `${JSON.stringify(original, null, 2)}\n`, 'utf8');
  t.after(() => fs.rm(fixtureDir, {recursive: true, force: true}));

  const repairedDiagram = structuredClone(original.scenes[0].diagramSpec);
  const positions = new Map([
    ['browser', 100],
    ['usecase', 310],
    ['engine', 500],
    ['repository', 690],
  ]);
  for (const node of repairedDiagram.nodes) {
    if (positions.has(node.id)) node.x = positions.get(node.id);
  }

  let apiCalls = 0;
  const client = {
    responses: {
      parse: async () => {
        apiCalls += 1;
        return {output_parsed: {repairs: [{sceneNumber: 1, diagramSpec: repairedDiagram}]}};
      },
    },
  };

  const relative = path.relative(repoRoot, fixture).split(path.sep).join('/');
  const result = await repairStrictStoryboard({
    filename: relative,
    validationReport: {
      failures: [{scope: 'Scene 1 / Aurora node-gap', message: '[aurora:node-gap] browser,usecase'}],
      auroraIssues: [{scene: 1, rule: 'node-gap', ids: ['browser', 'usecase'], progress: 0, measured: 0, detail: 'gap'}],
    },
    client,
    model: 'gpt-4.1-mini',
  });

  const repaired = JSON.parse(await fs.readFile(fixture, 'utf8'));
  assert.equal(apiCalls, 1);
  assert.equal(result.changed, true);
  assert.equal(repaired.scenes.length, original.scenes.length);
  assert.deepEqual(repaired.scenes.slice(1), original.scenes.slice(1), 'unpatched scenes must be byte-for-byte equivalent data');
  assert.equal(repaired.scenes[0].narration, original.scenes[0].narration);
  assert.deepEqual(repaired.scenes[0].beats, original.scenes[0].beats);
  assert.deepEqual(repaired.scenes[0].diagramSpec, repairedDiagram);
});


test('strict repair deterministically polishes a still-invalid AI geometry patch without a second API call', async (t) => {
  const source = path.join(repoRoot, 'shorts', 'content', 'usecase-domain-repository-seolgyebuteo-dongsiseongggaji', 'candidate-01.json');
  const original = JSON.parse(await fs.readFile(source, 'utf8'));
  const fixtureDir = path.join(repoRoot, 'shorts', 'content', `.strict-polish-${process.pid}-${Date.now()}`);
  const fixture = path.join(fixtureDir, 'candidate-01.json');
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.writeFile(fixture, `${JSON.stringify(original, null, 2)}\n`, 'utf8');
  t.after(() => fs.rm(fixtureDir, {recursive: true, force: true}));

  const invalidDiagram = structuredClone(original.scenes[0].diagramSpec);
  const positions = new Map([
    ['browser', 70],
    ['usecase', 255],
    ['engine', 475],
    ['repository', 665],
  ]);
  for (const node of invalidDiagram.nodes) {
    if (positions.has(node.id)) node.x = positions.get(node.id);
  }

  const invalidManifest = structuredClone(original);
  invalidManifest.scenes[0].diagramSpec = invalidDiagram;
  const beforeIssues = collectAuroraStrictIssues(invalidManifest);
  assert.ok(beforeIssues.some((issue) => issue.rule === 'safe-area' && issue.ids.includes('browser')));
  assert.ok(beforeIssues.some((issue) => issue.rule === 'node-gap' && issue.ids.includes('browser') && issue.ids.includes('usecase')));

  let apiCalls = 0;
  const client = {
    responses: {
      parse: async () => {
        apiCalls += 1;
        return {output_parsed: {repairs: [{sceneNumber: 1, diagramSpec: invalidDiagram}]}};
      },
    },
  };

  const relative = path.relative(repoRoot, fixture).split(path.sep).join('/');
  const result = await repairStrictStoryboard({
    filename: relative,
    validationReport: {
      failures: [{scope: 'Scene 1 / Aurora node-gap', message: '[aurora:node-gap] browser,usecase'}],
      auroraIssues: [{scene: 1, rule: 'node-gap', ids: ['browser', 'usecase'], progress: 0, measured: 0, detail: 'gap'}],
    },
    client,
    model: 'gpt-4.1-mini',
  });

  const repaired = JSON.parse(await fs.readFile(fixture, 'utf8'));
  assert.equal(apiCalls, 1, 'deterministic polish must not trigger a second paid repair call');
  assert.equal(result.changed, true);
  assert.deepEqual(collectAuroraStrictIssues(repaired), []);
  assert.notDeepEqual(repaired.scenes[0].diagramSpec, invalidDiagram, 'invalid AI geometry should be deterministically adjusted');
  assert.equal(repaired.scenes[0].narration, original.scenes[0].narration);
  assert.deepEqual(repaired.scenes[0].beats, original.scenes[0].beats);
});
