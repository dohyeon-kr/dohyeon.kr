const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const AURORA_GEOMETRY = Object.freeze({
  canvasWidth: 1080,
  canvasHeight: 1920,
  stageLeft: 84,
  stageTop: 470,
  stageRight: 996,
  stageBottom: 1490,
  minimumNodeGap: 24,
  minimumObjectHeight: 190,
});

const stageWidth = AURORA_GEOMETRY.stageRight - AURORA_GEOMETRY.stageLeft;
const stageHeight = AURORA_GEOMETRY.stageBottom - AURORA_GEOMETRY.stageTop;
const finite = (value) => Number.isFinite(Number(value));
const round = (value) => Number(Number(value).toFixed(3));

export function inferAuroraRole(node) {
  const value = `${node?.id ?? ''} ${node?.label ?? ''}`.toLowerCase();
  if (/browser|web|client|frontend/.test(value)) return 'browser';
  if (/terminal|cli|console/.test(value)) return 'terminal';
  if (/cache|redis/.test(value)) return 'cache';
  if (/queue|slot|worker/.test(value)) return 'queue';
  if (/db|database|repository|repo|store|storage|sql/.test(value)) return 'datastore';
  return 'module';
}

const roleMinimumWidth = (role) => role === 'browser' ? 220 : role === 'datastore' || role === 'cache' ? 180 : 170;

export function auroraNodePosition(node) {
  const role = inferAuroraRole(node);
  const left = clamp((Number(node.x) / 800) * 100, 5, 95);
  const top = clamp((Number(node.y) / 560) * 100, 7, 93);
  const width = Math.max(roleMinimumWidth(role), clamp((Number(node.width) / 800) * 900, 150, 390));
  const height = Math.max(AURORA_GEOMETRY.minimumObjectHeight, clamp((Number(node.height) / 560) * 720, 110, 270));
  return {left, top, width, height, role};
}

const eventValue = (base, events, progress) => {
  if (!events.length) return base;
  let value = events[0].from;
  for (const event of events) {
    if (progress < event.start) break;
    const t = clamp((progress - event.start) / Math.max(1e-9, event.end - event.start), 0, 1);
    const eased = t * t * (3 - 2 * t);
    value = event.from + (event.to - event.from) * eased;
  }
  return value;
};

const nodeState = (spec, node, progress) => {
  const byProperty = (property) => (spec.events ?? [])
    .filter((event) => event.target === node.id && event.property === property)
    .sort((a, b) => a.start - b.start);
  return {
    ...node,
    x: eventValue(Number(node.x), byProperty('x'), progress),
    y: eventValue(Number(node.y), byProperty('y'), progress),
    width: eventValue(Number(node.width), byProperty('width'), progress),
    height: eventValue(Number(node.height), byProperty('height'), progress),
    rotation: eventValue(0, byProperty('rotation'), progress),
    scale: eventValue(1, byProperty('scale'), progress),
    opacity: eventValue(1, byProperty('opacity'), progress),
  };
};

const sampleTimes = (spec) => {
  const values = new Set(Array.from({length: 101}, (_, index) => index / 100));
  for (const event of spec.events ?? []) {
    for (const value of [event.start, (event.start + event.end) / 2, event.end]) values.add(clamp(value, 0, 1));
  }
  return [...values].sort((a, b) => a - b);
};

const renderedBox = (state, spec) => {
  const base = auroraNodePosition(state);
  const xAnimated = (spec.events ?? []).some((event) => event.target === state.id && event.property === 'x');
  const yAnimated = (spec.events ?? []).some((event) => event.target === state.id && event.property === 'y');
  const widthAnimated = (spec.events ?? []).some((event) => event.target === state.id && event.property === 'width');
  const heightAnimated = (spec.events ?? []).some((event) => event.target === state.id && event.property === 'height');
  const leftPercent = xAnimated ? clamp((Number(state.x) / 800) * 100, -20, 120) : base.left;
  const topPercent = yAnimated ? clamp((Number(state.y) / 560) * 100, -20, 120) : base.top;
  const width = Math.max(roleMinimumWidth(base.role), widthAnimated ? Number(state.width) : base.width) * Number(state.scale);
  const height = Math.max(AURORA_GEOMETRY.minimumObjectHeight, heightAnimated ? Number(state.height) : base.height) * Number(state.scale);
  const radians = Number(state.rotation) * Math.PI / 180;
  const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  const cx = AURORA_GEOMETRY.stageLeft + stageWidth * leftPercent / 100;
  const cy = AURORA_GEOMETRY.stageTop + stageHeight * topPercent / 100;
  return {
    id: state.id,
    opacity: Number(state.opacity),
    left: cx - rotatedWidth / 2,
    right: cx + rotatedWidth / 2,
    top: cy - rotatedHeight / 2,
    bottom: cy + rotatedHeight / 2,
  };
};

const boxGap = (a, b) => {
  const dx = Math.max(a.left - b.right, b.left - a.right, 0);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  return Math.hypot(dx, dy);
};

const overflow = (box) => Math.max(
  AURORA_GEOMETRY.stageLeft - box.left,
  box.right - AURORA_GEOMETRY.stageRight,
  AURORA_GEOMETRY.stageTop - box.top,
  box.bottom - AURORA_GEOMETRY.stageBottom,
  0,
);

const keyFor = (issue) => `${issue.scene}:${issue.rule}:${issue.ids.join('|')}`;
const worse = (current, next) => {
  if (!current) return next;
  if (next.rule === 'node-gap') return next.measured < current.measured ? next : current;
  return next.measured > current.measured ? next : current;
};

export function collectAuroraStrictIssues(manifest) {
  const issues = new Map();
  const push = (issue) => issues.set(keyFor(issue), worse(issues.get(keyFor(issue)), issue));

  if (manifest?.style?.safeArea !== 'shorts-reels') {
    push({scene: 0, rule: 'safe-area-mode', ids: [], progress: 0, measured: 1,
      detail: 'Aurora requires style.safeArea="shorts-reels".'});
  }

  for (const [sceneIndex, scene] of (manifest?.scenes ?? []).entries()) {
    const spec = scene?.diagramSpec;
    if (!spec?.nodes?.length) continue;
    const objects = spec.nodes.filter((node) => node.shape !== 'line');
    for (const progress of sampleTimes(spec)) {
      const boxes = objects
        .map((node) => nodeState(spec, node, progress))
        .filter((state) => finite(state.opacity) && state.opacity > .02)
        .map((state) => renderedBox(state, spec));

      for (const box of boxes) {
        const amount = overflow(box);
        if (amount > .5) push({
          scene: sceneIndex + 1,
          rule: 'safe-area',
          ids: [box.id],
          progress,
          measured: round(amount),
          detail: `rendered node leaves the Aurora Shorts stage by ${round(amount)}px`,
        });
      }

      for (let left = 0; left < boxes.length; left += 1) {
        for (let right = left + 1; right < boxes.length; right += 1) {
          const gap = boxGap(boxes[left], boxes[right]);
          if (gap + .5 < AURORA_GEOMETRY.minimumNodeGap) push({
            scene: sceneIndex + 1,
            rule: 'node-gap',
            ids: [boxes[left].id, boxes[right].id].sort(),
            progress,
            measured: round(gap),
            detail: `rendered node gap is ${round(gap)}px; minimum is ${AURORA_GEOMETRY.minimumNodeGap}px`,
          });
        }
      }
    }
  }

  return [...issues.values()].sort((a, b) => a.scene - b.scene || a.rule.localeCompare(b.rule) || a.ids.join().localeCompare(b.ids.join()));
}

export const formatAuroraStrictIssue = (issue) =>
  `[aurora:${issue.rule}] scene=${issue.scene || 'manifest'} t=${Number(issue.progress).toFixed(3)}${issue.ids.length ? ` nodes=${issue.ids.join(',')}` : ''}: ${issue.detail}`;

export function assertAuroraStrictLayout(manifest) {
  const issues = collectAuroraStrictIssues(manifest);
  if (issues.length) throw new Error(issues.map(formatAuroraStrictIssue).join('\n'));
  return manifest;
}
