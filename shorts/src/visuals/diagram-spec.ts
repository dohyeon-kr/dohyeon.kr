import {z} from 'zod';
export const DiagramSpecSchema = z.object({
  version: z.literal(1),
  renderer: z.enum(['auto', 'remotion', 'motion-canvas']),
  physics: z.object({
    seconds: z.number().min(.1).max(10),
    gravity: z.object({x: z.number().min(-2).max(2), y: z.number().min(-2).max(2)}),
    bodies: z.array(z.object({
      target: z.string(), isStatic: z.boolean(),
      mass: z.number().min(.1).max(100),
      restitution: z.number().min(0).max(1),
      friction: z.number().min(0).max(1),
      velocity: z.object({x: z.number().min(-20).max(20), y: z.number().min(-20).max(20)}),
    })).min(1).max(40),
    pins: z.array(z.object({
      target: z.string(), x: z.number().min(0).max(800), y: z.number().min(0).max(560),
    })).max(40),
  }).nullable().optional(),
  description: z.string().min(1).max(500),
  nodes: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    shape: z.enum(['rect', 'circle', 'line', 'text']),
    label: z.string().max(60),
    x: z.number().min(0).max(800), y: z.number().min(0).max(560),
    width: z.number().min(1).max(800), height: z.number().min(1).max(560),
    fill: z.enum(['white', 'gray', 'none', 'hatch']),
    connector: z.object({source: z.string(), target: z.string(), sourceSide: z.enum(['left', 'right', 'top', 'bottom']), targetSide: z.enum(['left', 'right', 'top', 'bottom']), gap: z.number().min(2).max(40)}).nullable().optional(),
    strokeStyle: z.enum(['solid', 'dashed']).nullable().optional(),
  })).min(1).max(40),
  events: z.array(z.object({
    target: z.string(), property: z.enum(['x', 'y', 'rotation', 'scale', 'opacity', 'width', 'height']),
    from: z.number().min(-800).max(800), to: z.number().min(-800).max(800),
    start: z.number().min(0).max(1), end: z.number().min(0).max(1),
  })).max(120),
});
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
export function validateDiagram(value: unknown): DiagramSpec {
  const spec = DiagramSpecSchema.parse(value);
  const ids = new Set(spec.nodes.map((n) => n.id));
  if (ids.size !== spec.nodes.length) throw new Error('Duplicate diagram node id');
  const bodyIds = new Set(spec.physics?.bodies.map(b => b.target));
  if (spec.physics) {
    if (bodyIds.size !== spec.physics.bodies.length) throw new Error('Duplicate physics body');
    for (const body of spec.physics.bodies) {
      const node = spec.nodes.find(n => n.id === body.target);
      if (!node || !['rect', 'circle'].includes(node.shape)) throw new Error('Physics bodies require rect or circle nodes');
      if (node.shape === 'circle' && node.width !== node.height) throw new Error('Physics circles must have equal dimensions');
    }
    if (new Set(spec.physics.pins.map(p => p.target)).size !== spec.physics.pins.length) throw new Error('Duplicate physics pin');
    for (const pin of spec.physics.pins) {
      if (!bodyIds.has(pin.target) || spec.physics.bodies.find(b => b.target === pin.target)?.isStatic) throw new Error('Pin requires a dynamic body');
    }
  }
  for (const node of spec.nodes) {
    if (!node.connector) continue;
    if (node.shape !== 'line' || node.connector.source === node.connector.target) throw new Error('Connector requires a line and distinct endpoints');
    for (const id of [node.connector.source, node.connector.target]) {
      const target = spec.nodes.find(n => n.id === id);
      if (!target || !['rect', 'circle'].includes(target.shape)) throw new Error(`Invalid connector anchor: ${id}`);
    }
    if (spec.events.some(e => e.target === node.id && e.property !== 'opacity')) throw new Error('Connector geometry is owned by anchors; animate opacity only');
  }
  for (const event of spec.events) {
    if (spec.nodes.find(n => n.id === event.target)?.shape === 'line' && ['scale', 'width', 'height'].includes(event.property)) throw new Error('[layout:line-reveal] Keep line dimensions fixed; use opacity to reveal it');
    if (!ids.has(event.target)) throw new Error(`Unknown diagram target: ${event.target}`);
    if (bodyIds.has(event.target) && event.property !== 'opacity') throw new Error('Physics owns body transforms; only opacity may be animated');
    if (event.end <= event.start) throw new Error('Diagram event must have positive duration');
    if (event.property === 'opacity' && [event.from, event.to].some((n) => n < 0 || n > 1)) throw new Error('Opacity must be in [0, 1]');
    if (['width', 'height'].includes(event.property) && [event.from, event.to].some(n => n < 1 || n > (event.property === 'width' ? 800 : 560))) throw new Error('Invalid animated dimensions');
    if (event.property === 'scale' && [event.from, event.to].some((n) => n <= 0 || n > 4)) throw new Error('Scale must be in (0, 4]');
    if (spec.events.some((other) => other !== event && other.target === event.target && other.property === event.property && other.start < event.end && event.start < other.end)) throw new Error('Overlapping animations on the same property');
  }
  return spec;
}
// Pure frame evaluation. No playback history, wall time, or random state.
export function diagramState(spec: DiagramSpec, progress: number) {
  return spec.nodes.map((node) => {
    const state = {width: node.width, height: node.height, x: node.x, y: node.y, rotation: 0, scale: 1, opacity: 1};
    for (const property of ['x', 'y', 'rotation', 'scale', 'opacity', 'width', 'height'] as const) {
      const events = spec.events.filter((e) => e.target === node.id && e.property === property).sort((a, b) => a.start - b.start);
      if (!events.length) continue;
      state[property] = events[0].from;
      for (const event of events) {
        if (progress < event.start) break;
        const t = Math.max(0, Math.min(1, (progress - event.start) / (event.end - event.start)));
        state[property] = event.from + (event.to - event.from) * t * t * (3 - 2 * t);
      }
    }
    return {...node, ...state};
  });
}

