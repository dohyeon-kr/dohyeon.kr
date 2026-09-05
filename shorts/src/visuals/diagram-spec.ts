import {z} from 'zod';
export const DiagramSpecSchema = z.object({
  version: z.literal(1),
  renderer: z.enum(['remotion', 'motion-canvas']),
  description: z.string().min(1).max(500),
  nodes: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    shape: z.enum(['rect', 'circle', 'line', 'text']),
    label: z.string().max(60),
    x: z.number().min(0).max(800), y: z.number().min(0).max(560),
    width: z.number().min(1).max(800), height: z.number().min(1).max(560),
    fill: z.enum(['white', 'gray', 'none']),
  })).min(1).max(40),
  events: z.array(z.object({
    target: z.string(), property: z.enum(['x', 'y', 'rotation', 'scale', 'opacity']),
    from: z.number().min(-800).max(800), to: z.number().min(-800).max(800),
    start: z.number().min(0).max(1), end: z.number().min(0).max(1),
  })).max(120),
});
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
export function validateDiagram(value: unknown): DiagramSpec {
  const spec = DiagramSpecSchema.parse(value);
  const ids = new Set(spec.nodes.map((n) => n.id));
  if (ids.size !== spec.nodes.length) throw new Error('Duplicate diagram node id');
  for (const event of spec.events) {
    if (!ids.has(event.target)) throw new Error(`Unknown diagram target: ${event.target}`);
    if (event.end <= event.start) throw new Error('Diagram event must have positive duration');
    if (event.property === 'opacity' && [event.from, event.to].some((n) => n < 0 || n > 1)) throw new Error('Opacity must be in [0, 1]');
    if (event.property === 'scale' && [event.from, event.to].some((n) => n <= 0 || n > 4)) throw new Error('Scale must be in (0, 4]');
    if (spec.events.some((other) => other !== event && other.target === event.target && other.property === event.property && other.start < event.end && event.start < other.end)) throw new Error('Overlapping animations on the same property');
  }
  return spec;
}
// Pure frame evaluation. No playback history, wall time, or random state.
export function diagramState(spec: DiagramSpec, progress: number) {
  return spec.nodes.map((node) => {
    const state = {x: node.x, y: node.y, rotation: 0, scale: 1, opacity: 1};
    for (const property of ['x', 'y', 'rotation', 'scale', 'opacity'] as const) {
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
