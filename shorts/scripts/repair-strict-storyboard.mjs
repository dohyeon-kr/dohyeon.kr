import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {pathToFileURL} from 'node:url';
import OpenAI from './shorts-openai.mjs';
import {zodTextFormat} from 'openai/helpers/zod';
import {z} from 'zod/v4';
import {CandidateSchema, SYSTEM_PROMPT} from './generate-candidates.mjs';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {collectAuroraStrictIssues, formatAuroraStrictIssue, polishAuroraStrictLayout} from './aurora-strict-layout.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const contentRoot = path.join(repoRoot, 'shorts', 'content') + path.sep;
const DEFAULT_MODEL = 'gpt-4.1-mini';
const GeneratedDiagramSpecSchema = CandidateSchema.shape.scenes.element.shape.diagramSpec.unwrap();
export const StrictRepairSchema = z.object({
  repairs: z.array(z.object({
    sceneNumber: z.number().int().min(1).max(40),
    diagramSpec: GeneratedDiagramSpecSchema,
  })).max(40),
});

const readJsonIfPresent = async (filename) => {
  if (!filename) return null;
  try {
    return JSON.parse(await fs.readFile(path.resolve(filename), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const argValue = (args, name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
const bodySceneEntries = (manifest) => (manifest.scenes ?? [])
  .map((scene, index) => ({scene, index}))
  .filter(({scene}) => !scene.commonPage);
const stableString = (value) => `${JSON.stringify(value, null, 2)}\n`;

const assertRepairInvariants = (before, after) => {
  if (after.scenes.length !== before.scenes.length) throw new Error('Strict repair must preserve scene count');
  const beforeBody = bodySceneEntries(before);
  const afterBody = bodySceneEntries(after);
  if (afterBody.length !== beforeBody.length) throw new Error('Strict repair must preserve editorial scene count');
  for (const [index, entry] of afterBody.entries()) {
    const original = beforeBody[index].scene;
    const scene = entry.scene;
    if (scene.narration !== original.narration) throw new Error(`Scene ${index + 1}: strict repair changed narration`);
    if (JSON.stringify(scene.beats) !== JSON.stringify(original.beats)) throw new Error(`Scene ${index + 1}: strict repair changed semantic beats`);
    if (scene.kind !== original.kind) throw new Error(`Scene ${index + 1}: strict repair changed scene kind`);
  }
};

export async function repairStrictStoryboard({filename, validationReport = null, hyperframesReport = null, reportFile = null, client = null, model = null}) {
  const manifestPath = path.resolve(repoRoot, filename);
  if (!manifestPath.startsWith(contentRoot) || path.extname(manifestPath) !== '.json') throw new Error('Strict repair manifest must be JSON under shorts/content/.');
  const original = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const template = original.style?.template ?? original.style?.theme;
  if (template !== 'aurora-explain') throw new Error(`Strict auto-repair only supports aurora-explain; received ${template ?? '(none)'}`);

  const entries = bodySceneEntries(original);
  const originalScenes = entries.map(({scene}) => scene);
  const inputCandidate = CandidateSchema.parse({...original.candidate, scenes: originalScenes});
  const deterministic = validationReport ?? {auroraIssues: collectAuroraStrictIssues(original)};
  const hyperframes = hyperframesReport ?? null;
  const chosenModel = model || process.env.SHORTS_STRICT_REPAIR_MODEL || DEFAULT_MODEL;
  const openai = client ?? new OpenAI({apiKey: process.env.OPENAI_API_KEY, timeout: 180000, maxRetries: 2});

  const diagnostics = {deterministic, hyperframes};
  const instructions = `${SYSTEM_PROMPT}\n\n` +
    'You are repairing a rejected Aurora Explain storyboard after deterministic and HyperFrames strict validation. ' +
    'Apply every supplied finding in one pass. Return only a repairs array; never return or regenerate the full candidate or scenes array. ' +
    'Each repair must contain the existing 1-based sceneNumber and a complete replacement diagramSpec for that scene. ' +
    'Only include scenes whose diagram geometry needs to change. Do not add, delete, reorder, or rewrite scenes, narration, beats, headlines, or scene kinds. ' +
    'Move or resize non-line nodes so every rendered object stays inside the Aurora Shorts stage and every visible pair has at least 24px rendered-box separation across animation. ' +
    'Connectors are renderer-owned center-to-center edges; keep valid source/target node ids and do not attempt to compensate with sourceSide, targetSide, or gap. ' +
    'Prefer minimal geometry fixes. Resolve all diagnostics together rather than fixing only the first error.';

  const response = await openai.responses.parse({
    model: chosenModel,
    store: false,
    instructions,
    input: JSON.stringify({candidate: inputCandidate, strictDiagnostics: diagnostics}),
    text: {format: zodTextFormat(StrictRepairSchema, 'aurora_strict_repair')},
  });
  if (!response.output_parsed) throw new Error('Strict repair refused or returned incomplete structured output');
  const parsed = StrictRepairSchema.parse(response.output_parsed);

  const repairedScenes = structuredClone(original.scenes);
  const repairedSceneNumbers = [];
  const seen = new Set();
  for (const repair of parsed.repairs) {
    if (seen.has(repair.sceneNumber)) throw new Error(`Strict repair returned duplicate scene ${repair.sceneNumber}`);
    seen.add(repair.sceneNumber);
    const entry = entries[repair.sceneNumber - 1];
    if (!entry) throw new Error(`Strict repair returned unknown scene ${repair.sceneNumber}`);
    if (!entry.scene.diagramSpec) throw new Error(`Scene ${repair.sceneNumber}: strict repair cannot add a diagram to a non-diagram scene`);
    const diagramSpec = validateDiagram(repair.diagramSpec);
    repairedScenes[entry.index] = {...repairedScenes[entry.index], diagramSpec};
    repairedSceneNumbers.push(repair.sceneNumber);
  }

  let improved = {
    ...original,
    status: 'candidate',
    style: {...original.style, safeArea: 'shorts-reels'},
    presenterOverlay: null,
    scenes: repairedScenes,
  };
  assertRepairInvariants(original, improved);

  const polished = polishAuroraStrictLayout(improved);
  improved = polished.manifest;
  for (const sceneNumber of polished.adjustedSceneNumbers) {
    const spec = improved.scenes?.[sceneNumber - 1]?.diagramSpec;
    if (spec) validateDiagram(spec);
  }
  assertRepairInvariants(original, improved);

  const remaining = collectAuroraStrictIssues(improved);
  if (remaining.length) {
    const message = remaining.map(formatAuroraStrictIssue).join('\n');
    throw new Error(`AI strict repair still violates deterministic Aurora geometry:\n${message}`);
  }

  const before = stableString(original);
  const after = stableString(improved);
  const changed = before !== after;
  if (changed) await fs.writeFile(manifestPath, after, 'utf8');

  const deterministicFailures = deterministic?.failures ?? [];
  const hfFindings = hyperframes
    ? ['lint', 'runtime', 'layout', 'motion', 'contrast'].flatMap((key) => hyperframes?.[key]?.findings ?? []).flat()
    : [];
  const report = [
    '# Aurora strict 자동 개선',
    '',
    `- 대상: \`${filename}\``,
    `- 모델: \`${chosenModel}\``,
    '- API 호출: 1회 — 모든 strict 진단을 한 요청으로 처리',
    `- AI 패치 장면: ${repairedSceneNumbers.length ? repairedSceneNumbers.join(', ') : '없음'}`,
    `- deterministic polish 장면: ${polished.adjustedSceneNumbers.length ? polished.adjustedSceneNumbers.join(', ') : '없음'}`,
    `- 변경 발생: ${changed ? 'yes' : 'no'}`,
    '',
    '## 수집된 deterministic 진단',
    '',
    ...(deterministicFailures.length
      ? deterministicFailures.map((failure) => `- **${failure.scope}**: ${failure.message}`)
      : ['- 없음']),
    '',
    '## 수집된 HyperFrames strict 진단',
    '',
    ...(hfFindings.length
      ? hfFindings.map((finding) => `- **${finding.severity ?? 'unknown'} / ${finding.code ?? 'unknown'}**: ${finding.message ?? ''}`)
      : ['- 없음 또는 strict check 이전 단계에서 반려']),
    '',
    '## 재검증',
    '',
    '- Aurora deterministic geometry: PASS',
    '- scene count / order / narration / semantic beats / scene kind: 원본 보존',
    '- HyperFrames strict check: PR 검증 단계에서 다시 실행',
    '',
  ];
  if (reportFile) {
    const output = path.resolve(reportFile);
    await fs.mkdir(path.dirname(output), {recursive: true});
    await fs.writeFile(output, `${report.join('\n')}\n`, 'utf8');
  }
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `changed=${changed ? 'true' : 'false'}\nmodel=${chosenModel}\n`, 'utf8');
  }
  return {changed, model: chosenModel, improved, diagnostics, repairedSceneNumbers, polishedSceneNumbers: polished.adjustedSceneNumbers};
}

async function main() {
  const args = process.argv.slice(2);
  const filename = args.find((arg) => !arg.startsWith('--'));
  if (!filename) throw new Error('Usage: repair-strict-storyboard.mjs <candidate.json> [--validation=<report.json>] [--hyperframes=<check.json>] [--report=<report.md>]');
  const validationReport = await readJsonIfPresent(argValue(args, '--validation'));
  const hyperframesReport = await readJsonIfPresent(argValue(args, '--hyperframes'));
  const reportFile = argValue(args, '--report');
  await repairStrictStoryboard({filename, validationReport, hyperframesReport, reportFile});
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
