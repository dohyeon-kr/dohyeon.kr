import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {resolveTemplate} from '../src/templates/registry.ts';
import {validateDiagramLayout} from '../src/visuals/physics.ts';
import {validateSceneMotion} from '../src/motion/validate.ts';
import {validatePresenterOverlay} from '../src/presenter/overlay.ts';
import {validateScenePresenter} from '../src/presenter/schema.ts';
import {validateDiagram} from '../src/visuals/diagram-spec.ts';
import {withBlogCta} from './blog-cta.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const shortsRoot = path.resolve(import.meta.dirname, '..');
const SCENE_TAIL_SECONDS = 0.28;

const annotationEscape = (value) => String(value)
  .replace(/%/g, '%25')
  .replace(/\r/g, '%0D')
  .replace(/\n/g, '%0A');

const markdownEscape = (value) => String(value)
  .replace(/\|/g, '\\|')
  .replace(/\r?\n/g, '<br>');

const messageOf = (error) => error instanceof Error ? error.message : String(error);

const main = async () => {
  const manifestArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (!manifestArg) throw new Error('Usage: node validate-storyboard.mjs <shorts/content/.../candidate-XX.json>');

  const manifestPath = path.resolve(repoRoot, manifestArg);
  const contentRoot = path.join(shortsRoot, 'content') + path.sep;
  if (!manifestPath.startsWith(contentRoot) || path.extname(manifestPath) !== '.json') {
    throw new Error('Manifest must be a JSON file under shorts/content/.');
  }

  let manifest;
  try {
    manifest = withBlogCta(JSON.parse(await fs.readFile(manifestPath, 'utf8')));
  } catch (error) {
    const message = messageOf(error);
    console.error(`::error title=Manifest parse::${annotationEscape(message)}`);
    throw error;
  }

  const failures = [];
  const check = (scope, fn) => {
    try {
      fn();
    } catch (error) {
      const message = messageOf(error);
      failures.push({scope, message});
      console.error(`::error title=${annotationEscape(scope)}::${annotationEscape(message)}`);
    }
  };

  let template = null;
  check('Manifest / template', () => {
    template = resolveTemplate(manifest);
  });
  check('Manifest / presenter overlay', () => validatePresenterOverlay(manifest));
  if (template && manifest.scenes.some((scene) => scene.uiMotion) && template.id !== 'notebook-grid') {
    failures.push({scope: 'Manifest / uiMotion', message: 'uiMotion requires notebook-grid'});
    console.error('::error title=Manifest / uiMotion::uiMotion requires notebook-grid');
  }

  for (const [index, scene] of manifest.scenes.entries()) {
    const sceneNo = index + 1;
    check(`Scene ${sceneNo} / motion`, () => validateSceneMotion(scene, manifest.scenes[index - 1]));

    if (scene.diagramSpec) {
      let diagram = null;
      check(`Scene ${sceneNo} / diagram schema`, () => {
        diagram = validateDiagram(scene.diagramSpec);
      });
      if (diagram) check(`Scene ${sceneNo} / diagram layout`, () => validateDiagramLayout(diagram));
      if (scene.visual?.type === 'photo') {
        const message = 'Photo and diagramSpec cannot share a scene';
        failures.push({scope: `Scene ${sceneNo} / visual`, message});
        console.error(`::error title=Scene ${sceneNo} / visual::${message}`);
      }
    }

    const presenterEnd = Math.max(
      0,
      ...['actions', 'expressions', 'mouths'].flatMap((key) => (scene.presenter?.[key] ?? []).map((cue) => cue.end)),
    );
    const speechDuration = 3.6;
    const previewDuration = scene.commonPage === 'blog-cta-v1'
      ? Math.max(6, speechDuration + 1.2)
      : scene.presenter != null
        ? Math.max(speechDuration, presenterEnd)
        : speechDuration;
    check(`Scene ${sceneNo} / presenter timing`, () =>
      validateScenePresenter(scene, Math.max(2.2, previewDuration + SCENE_TAIL_SECONDS)),
    );
  }

  const summary = [
    '### Storyboard validation',
    '',
    `Manifest: \`${manifestArg}\``,
    '',
  ];

  if (failures.length === 0) {
    summary.push('✅ All storyboard preflight checks passed.', '');
    console.log(`Storyboard validation passed: ${manifest.scenes.length} scenes.`);
  } else {
    summary.push(`❌ ${failures.length} validation issue(s) found across ${manifest.scenes.length} scenes.`, '');
    summary.push('| Scope | Failure |', '| --- | --- |');
    for (const failure of failures) {
      summary.push(`| ${markdownEscape(failure.scope)} | ${markdownEscape(failure.message)} |`);
    }
    summary.push('');

    console.error(`\nStoryboard validation found ${failures.length} issue(s):`);
    failures.forEach((failure, index) => {
      console.error(`${index + 1}. [${failure.scope}] ${failure.message}`);
    });
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`, 'utf8');
  }

  if (failures.length) process.exitCode = 1;
};

await main();
