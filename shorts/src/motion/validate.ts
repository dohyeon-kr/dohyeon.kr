import {z} from 'zod';
import {TRANSITIONS, LightEffectSchema, TransitionOptionsSchema} from './schema.ts';
import {evaluatedDiagramState} from '../visuals/physics.ts';
import type {CandidateScene} from '../types';

export function validateSceneMotion(scene: CandidateScene, previous?: CandidateScene) {
  if (scene.transition !== undefined) z.enum(TRANSITIONS).parse(scene.transition);
  if (scene.transitionOptions != null) TransitionOptionsSchema.parse(scene.transitionOptions);
  if (scene.effects != null) z.array(LightEffectSchema).max(4).parse(scene.effects);
  for (const effect of scene.effects ?? []) {
    if (['background', 'photo', 'visual'].includes(effect.target)) {
      if (effect.type === 'flow-glow') throw new Error('flow-glow requires a diagram line or circle target');
      if (effect.target === 'photo' && scene.visual?.type !== 'photo') throw new Error('Photo effect requires a photo visual');
      if (effect.target === 'visual' && (!['diagram', 'symbol', 'number'].includes(scene.visual?.type ?? '') && !scene.diagramSpec)) throw new Error('Visual effect requires a visual');
      if (effect.target === 'background' && ['glow', 'bloom', 'rim-light', 'light-sweep'].includes(effect.type)) throw new Error('Source-dependent effect requires photo, visual, or node geometry');
    } else {
      const node = scene.diagramSpec?.nodes.find(n => n.id === effect.target);
      if (!node || node.shape === 'text') throw new Error(`Invalid effect target: ${effect.target}`);
      if (!['flow-glow', 'glow', 'bloom', 'rim-light', 'light-sweep'].includes(effect.type)) throw new Error(`${effect.type} requires a photo, visual, or background target`);
      if (effect.type === 'flow-glow' && !['line', 'circle'].includes(node.shape)) throw new Error('flow-glow requires a line or travelling circle');
    }
  }
  if (scene.transition === 'match-cut') {
    const target = scene.transitionOptions?.matchTarget;
    if (!previous?.diagramSpec || !scene.diagramSpec || !target || scene.layout !== 'diagram-centered' || previous.layout !== scene.layout) throw new Error('match-cut requires adjacent centered diagrams and matchTarget');
    const a = evaluatedDiagramState(previous.diagramSpec, 1).find(n => n.id === target);
    const b = evaluatedDiagramState(scene.diagramSpec, 0).find(n => n.id === target);
    if (!a || !b || a.shape !== b.shape || ['x', 'y', 'width', 'height', 'scale', 'rotation', 'opacity'].some(key => Math.abs(Number(a[key as keyof typeof a]) - Number(b[key as keyof typeof b])) > .01)) throw new Error('match-cut target geometry must match across the boundary');
  }
}
