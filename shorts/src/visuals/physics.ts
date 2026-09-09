import Matter from 'matter-js';
import {assertDiagramLayout, resolveConnectors, layoutSampleTimes} from './layout-guard.ts';
import {diagramState, type DiagramSpec} from './diagram-spec.ts';

// A fresh, fixed-step world per evaluation: no Runner, clock, random numbers or
// shared solver state. Narration stretches playback, never changes the solution.
function rawDiagramState(spec: DiagramSpec, progress: number) {
  const states = diagramState(spec, progress);
  if (!spec.physics) return states;
  const {Engine, Bodies, Body, Composite, Constraint} = Matter;
  const engine = Engine.create({enableSleeping: false, constraintIterations: 4});
  engine.gravity.x = spec.physics.gravity.x;
  engine.gravity.y = spec.physics.gravity.y;
  const bodies = new Map<string, Matter.Body>();
  try {
    for (const [index, config] of spec.physics.bodies.entries()) {
      const node = spec.nodes.find(n => n.id === config.target)!;
      const options = {id: index + 1, isStatic: config.isStatic, restitution: config.restitution, friction: config.friction};
      const body = node.shape === 'circle'
        ? Bodies.circle(node.x, node.y, node.width / 2, options)
        : Bodies.rectangle(node.x, node.y, node.width, node.height, options);
      if (!config.isStatic) {
        Body.setMass(body, config.mass);
        Body.setVelocity(body, config.velocity);
      }
      bodies.set(config.target, body);
      Composite.add(engine.world, body);
    }
    for (const pin of spec.physics.pins) {
      const body = bodies.get(pin.target)!;
      Composite.add(engine.world, Constraint.create({
        pointA: {x: pin.x, y: pin.y}, bodyB: body,
        pointB: {x: pin.x - body.position.x, y: pin.y - body.position.y},
        length: 0, stiffness: 1,
      }));
    }
    const steps = Math.round(Math.max(0, Math.min(1, progress)) * spec.physics.seconds * 60);
    for (let step = 0; step < steps; step++) Engine.update(engine, 1000 / 60);
    return states.map(node => {
      const body = bodies.get(node.id);
      if (!body) return node;
      const result = {...node, x: body.position.x, y: body.position.y, rotation: body.angle * 180 / Math.PI};
      if (![result.x, result.y, result.rotation].every(Number.isFinite)) throw new Error('Non-finite physics result');
      return result;
    });
  } finally {
    Composite.clear(engine.world, false);
    Engine.clear(engine);
  }
}

export function selectDiagramEngine(spec: DiagramSpec): 'remotion' | 'motion-canvas' {
  return spec.renderer === 'auto' ? (spec.physics ? 'motion-canvas' : 'remotion') : spec.renderer;
}


// Both backends receive the same checked geometry, including every rendered frame.
export function evaluatedDiagramState(spec: DiagramSpec, progress: number) {
  const states = resolveConnectors(rawDiagramState(spec, progress));
  assertDiagramLayout(states, progress);
  return states;
}
export function validateDiagramLayout(spec: DiagramSpec) {
  for (const progress of layoutSampleTimes(spec)) evaluatedDiagramState(spec, progress);
}
