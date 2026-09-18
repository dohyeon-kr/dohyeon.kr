import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {repairStrictStoryboard} from '../scripts/repair-strict-storyboard.mjs';
import {collectAuroraStrictIssues} from '../scripts/aurora-strict-layout.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const findArchitectureFlowScene = (manifest) => {
  const entries = (manifest.scenes ?? [])
    .map((scene, index) => ({scene, index}))
    .filter(({scene}) => !scene.commonPage);
  const bodyIndex = entries.findIndex(({scene}) => {
    const ids = new Set((scene.diagramSpec?.nodes ?? []).map((node) => node.id));
    return ['browser', 'usecase', 'engine', 'repository', 'persist-flow'].every((id) => ids.has(id));
  });
  assert.notEqual(bodyIndex, -1, 'architecture flow fixture scene must exist');
  return {
    sceneIndex: entries[bodyIndex].index,
    sceneNumber: bodyIndex + 1,
    scene: entries[bodyIndex].scene,
  };
};

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

test('render workflow stops after one automatic strict-repair rerender', async () => {
  const workflow = await fs.readFile(path.join(repoRoot, '.github', 'workflows', 'render-shorts.yml'), 'utf8');
  assert.match(workflow, /repair_pass:/);
  assert.match(workflow, /--field repair_pass=1/);
  assert.match(workflow, /inputs\.repair_pass != '1'/);
  assert.match(workflow, /already attempted once; refusing to open another repair PR/);
});

test('strict repair applies scene-numbered diagram patches without regenerating the scene list', async (t) => {
  const source = path.join(repoRoot, 'shorts', 'content', 'usecase-domain-repository-seolgyebuteo-dongsiseongggaji', 'candidate-01.json');
  const original = JSON.parse(await fs.readFile(source, 'utf8'));
  const {sceneIndex, sceneNumber, scene: architectureScene} = findArchitectureFlowScene(original);
  const fixtureDir = path.join(repoRoot, 'shorts', 'content', `.strict-repair-${process.pid}-${Date.now()}`);
  const fixture = path.join(fixtureDir, 'candidate-01.json');
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.writeFile(fixture, `${JSON.stringify(original, null, 2)}\n`, 'utf8');
  t.after(() => fs.rm(fixtureDir, {recursive: true, force: true}));

  const repairedDiagram = structuredClone(architectureScene.diagramSpec);
  const positions = new Map([
    ['browser', 121],
    ['usecase', 314],
    ['engine', 494],
    ['repository', 674],
  ]);
  for (const node of repairedDiagram.nodes) {
    if (positions.has(node.id)) node.x = positions.get(node.id);
  }

  let apiCalls = 0;
  const client = {
    responses: {
      parse: async () => {
        apiCalls += 1;
        return {output_parsed: {repairs: [{sceneNumber, diagramSpec: repairedDiagram}]}};
      },
    },
  };

  const relative = path.relative(repoRoot, fixture).split(path.sep).join('/');
  const result = await repairStrictStoryboard({
    filename: relative,
    validationReport: {
      failures: [{scope: `Scene ${sceneNumber} / Aurora node-gap`, message: '[aurora:node-gap] browser,usecase'}],
      auroraIssues: [{scene: sceneNumber, rule: 'node-gap', ids: ['browser', 'usecase'], progress: 0, measured: 0, detail: 'gap'}],
    },
    client,
    model: 'gpt-4.1-mini',
  });

  const repaired = JSON.parse(await fs.readFile(fixture, 'utf8'));
  assert.equal(apiCalls, 1);
  assert.equal(result.changed, true);
  assert.equal(repaired.scenes.length, original.scenes.length);
  for (const [index, scene] of repaired.scenes.entries()) {
    if (index === sceneIndex) continue;
    assert.deepEqual(scene, original.scenes[index], `scene ${index + 1} must remain byte-for-byte equivalent data`);
  }
  assert.equal(repaired.scenes[sceneIndex].narration, architectureScene.narration);
  assert.deepEqual(repaired.scenes[sceneIndex].beats, architectureScene.beats);
  assert.deepEqual(repaired.scenes[sceneIndex].diagramSpec, repairedDiagram);
});


test('strict repair deterministically polishes a still-invalid AI geometry patch without a second API call', async (t) => {
  const source = path.join(repoRoot, 'shorts', 'content', 'usecase-domain-repository-seolgyebuteo-dongsiseongggaji', 'candidate-01.json');
  const original = JSON.parse(await fs.readFile(source, 'utf8'));
  const {sceneIndex, sceneNumber, scene: architectureScene} = findArchitectureFlowScene(original);
  const fixtureDir = path.join(repoRoot, 'shorts', 'content', `.strict-polish-${process.pid}-${Date.now()}`);
  const fixture = path.join(fixtureDir, 'candidate-01.json');
  await fs.mkdir(fixtureDir, {recursive: true});
  await fs.writeFile(fixture, `${JSON.stringify(original, null, 2)}\n`, 'utf8');
  t.after(() => fs.rm(fixtureDir, {recursive: true, force: true}));

  const invalidDiagram = structuredClone(architectureScene.diagramSpec);
  const positions = new Map([
    ['browser', 125],
    ['usecase', 305],
    ['engine', 491],
    ['repository', 671],
  ]);
  for (const node of invalidDiagram.nodes) {
    if (positions.has(node.id)) node.x = positions.get(node.id);
  }

  const invalidManifest = structuredClone(original);
  invalidManifest.scenes[sceneIndex].diagramSpec = invalidDiagram;
  const beforeIssues = collectAuroraStrictIssues(invalidManifest);
  assert.ok(beforeIssues.some((issue) => issue.rule === 'node-gap' && issue.ids.includes('browser') && issue.ids.includes('usecase')));

  let apiCalls = 0;
  const client = {
    responses: {
      parse: async () => {
        apiCalls += 1;
        return {output_parsed: {repairs: [{sceneNumber, diagramSpec: invalidDiagram}]}};
      },
    },
  };

  const relative = path.relative(repoRoot, fixture).split(path.sep).join('/');
  const result = await repairStrictStoryboard({
    filename: relative,
    validationReport: {
      failures: [{scope: `Scene ${sceneNumber} / Aurora node-gap`, message: '[aurora:node-gap] browser,usecase'}],
      auroraIssues: [{scene: sceneNumber, rule: 'node-gap', ids: ['browser', 'usecase'], progress: 0, measured: 0, detail: 'gap'}],
    },
    client,
    model: 'gpt-4.1-mini',
  });

  const repaired = JSON.parse(await fs.readFile(fixture, 'utf8'));
  assert.equal(apiCalls, 1, 'deterministic polish must not trigger a second paid repair call');
  assert.equal(result.changed, true);
  assert.deepEqual(collectAuroraStrictIssues(repaired), []);
  assert.notDeepEqual(repaired.scenes[sceneIndex].diagramSpec, invalidDiagram, 'invalid AI geometry should be deterministically adjusted');
  assert.equal(repaired.scenes[sceneIndex].narration, architectureScene.narration);
  assert.deepEqual(repaired.scenes[sceneIndex].beats, architectureScene.beats);
});


test('strict repair cannot claim success by changing renderer-owned connector width', async (t) => {
  const source = path.join(repoRoot, 'shorts', 'content', 'usecase-domain-repository-seolgyebuteo-dongsiseongggaji', 'candidate-01.json');
  const original = JSON.parse(await fs.readFile(source, 'utf8'));
  const {sceneIndex, sceneNumber, scene: architectureScene} = findArchitectureFlowScene(original);
  const fixtureDir = path.join(repoRoot, 'shorts', 'content', `.strict-line-dot-${process.pid}-${Date.now()}`);
  const fixture = path.join(fixtureDir, 'candidate-01.json');
  await fs.mkdir(fixtureDir, {recursive: true});
  t.after(() => fs.rm(fixtureDir, {recursive: true, force: true}));

  const invalid = structuredClone(original);
  const positions = new Map([
    ['browser', 120],
    ['usecase', 313],
    ['engine', 493],
    ['repository', 667],
  ]);
  for (const node of invalid.scenes[sceneIndex].diagramSpec.nodes) {
    if (positions.has(node.id)) node.x = positions.get(node.id);
  }
  await fs.writeFile(fixture, `${JSON.stringify(invalid, null, 2)}\n`, 'utf8');

  const connectorOnlyPatch = structuredClone(invalid.scenes[sceneIndex].diagramSpec);
  connectorOnlyPatch.nodes.find((node) => node.id === 'persist-flow').width = 400;

  let apiCalls = 0;
  const client = {
    responses: {
      parse: async () => {
        apiCalls += 1;
        return {output_parsed: {repairs: [{sceneNumber, diagramSpec: connectorOnlyPatch}]}};
      },
    },
  };

  const relative = path.relative(repoRoot, fixture).split(path.sep).join('/');
  await assert.rejects(
    () => repairStrictStoryboard({
      filename: relative,
      validationReport: {
        failures: [{scope: `Scene ${sceneNumber} / diagram layout`, message: '[layout:line-dot] persist-flow'}],
        auroraIssues: [],
      },
      client,
      model: 'gpt-4.1-mini',
    }),
    /line-dot/,
  );
  assert.equal(apiCalls, 1);

  const after = JSON.parse(await fs.readFile(fixture, 'utf8'));
  assert.equal(
    after.scenes[sceneIndex].diagramSpec.nodes.find((node) => node.id === 'persist-flow').width,
    invalid.scenes[sceneIndex].diagramSpec.nodes.find((node) => node.id === 'persist-flow').width,
    'failed repair must not rewrite the candidate',
  );
});
