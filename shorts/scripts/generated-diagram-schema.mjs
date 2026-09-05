import {z} from 'zod/v4';

const event = (property, min, max) => z.object({
  target: z.string(), property,
  from: z.number().min(min).max(max), to: z.number().min(min).max(max),
  start: z.number().min(0).max(1), end: z.number().min(0).max(1),
});

// Generation uses property-specific bounds; renderer validation still checks
// relationships such as target IDs, timing overlaps and physics ownership.
export const GeneratedDiagramEventSchema = z.union([
  event(z.literal('scale'), .01, 4),
  event(z.literal('opacity'), 0, 1),
  event(z.literal('width'), 1, 800),
  event(z.literal('height'), 1, 560),
  event(z.enum(['x', 'y', 'rotation']), -800, 800),
]);
