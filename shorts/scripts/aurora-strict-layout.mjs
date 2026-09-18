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


const diagramDxForPixels = (pixels) => pixels * 800 / stageWidth;
const diagramDyForPixels = (pixels) => pixels * 560 / stageHeight;
const POLISH_EPSILON = 1e-6;

const visibleBoxAt = (spec, nodeId, progress) => {
  const node = (spec.nodes ?? []).find((candidate) => candidate.id === nodeId && candidate.shape !== 'line');
  if (!node) return null;
  const state = nodeState(spec, node, progress);
  if (!finite(state.opacity) || state.opacity <= .02) return null;
  return renderedBox(state, spec);
};

const trackBounds = (spec, nodeId) => {
  const boxes = sampleTimes(spec)
    .map((progress) => visibleBoxAt(spec, nodeId, progress))
    .filter(Boolean);
  if (!boxes.length) return null;
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    right: Math.max(...boxes.map((box) => box.right)),
    top: Math.min(...boxes.map((box) => box.top)),
    bottom: Math.max(...boxes.map((box) => box.bottom)),
  };
};

const shiftNodeTrack = (spec, nodeId, dxPixels = 0, dyPixels = 0) => {
  if (Math.abs(dxPixels) < POLISH_EPSILON && Math.abs(dyPixels) < POLISH_EPSILON) return false;
  const node = (spec.nodes ?? []).find((candidate) => candidate.id === nodeId && candidate.shape !== 'line');
  if (!node) return false;
  const dx = diagramDxForPixels(dxPixels);
  const dy = diagramDyForPixels(dyPixels);
  if (Math.abs(dx) >= POLISH_EPSILON) node.x = round(Number(node.x) + dx);
  if (Math.abs(dy) >= POLISH_EPSILON) node.y = round(Number(node.y) + dy);
  for (const event of spec.events ?? []) {
    if (event.target !== nodeId) continue;
    if (event.property === 'x' && Math.abs(dx) >= POLISH_EPSILON) {
      event.from = round(Number(event.from) + dx);
      event.to = round(Number(event.to) + dx);
    }
    if (event.property === 'y' && Math.abs(dy) >= POLISH_EPSILON) {
      event.from = round(Number(event.from) + dy);
      event.to = round(Number(event.to) + dy);
    }
  }
  return true;
};

const moveTrackInsideStage = (spec, nodeId, inset = 1) => {
  const bounds = trackBounds(spec, nodeId);
  if (!bounds) return false;
  const targetLeft = AURORA_GEOMETRY.stageLeft + inset;
  const targetRight = AURORA_GEOMETRY.stageRight - inset;
  const targetTop = AURORA_GEOMETRY.stageTop + inset;
  const targetBottom = AURORA_GEOMETRY.stageBottom - inset;
  let dx = 0;
  let dy = 0;
  if (bounds.left < targetLeft) dx += targetLeft - bounds.left;
  if (bounds.right > targetRight) dx -= bounds.right - targetRight;
  if (bounds.top < targetTop) dy += targetTop - bounds.top;
  if (bounds.bottom > targetBottom) dy -= bounds.bottom - targetBottom;
  return shiftNodeTrack(spec, nodeId, dx, dy);
};

const allocateSeparation = (required, roomA, roomB) => {
  let moveA = Math.min(required / 2, Math.max(0, roomA));
  let moveB = Math.min(required / 2, Math.max(0, roomB));
  let remaining = Math.max(0, required - moveA - moveB);
  const extraA = Math.min(remaining, Math.max(0, roomA - moveA));
  moveA += extraA;
  remaining -= extraA;
  const extraB = Math.min(remaining, Math.max(0, roomB - moveB));
  moveB += extraB;
  remaining -= extraB;
  return {moveA, moveB, remaining};
};

const separationCandidate = (spec, firstId, secondId, progress, axis, targetGap) => {
  const first = visibleBoxAt(spec, firstId, progress);
  const second = visibleBoxAt(spec, secondId, progress);
  const firstTrack = trackBounds(spec, firstId);
  const secondTrack = trackBounds(spec, secondId);
  if (!first || !second || !firstTrack || !secondTrack) return null;

  if (axis === 'x') {
    const firstCenter = (first.left + first.right) / 2;
    const secondCenter = (second.left + second.right) / 2;
    const firstBefore = firstCenter <= secondCenter;
    const separation = firstBefore ? second.left - first.right : first.left - second.right;
    const required = Math.max(0, targetGap - separation);
    const roomA = firstBefore
      ? firstTrack.left - AURORA_GEOMETRY.stageLeft
      : AURORA_GEOMETRY.stageRight - firstTrack.right;
    const roomB = firstBefore
      ? AURORA_GEOMETRY.stageRight - secondTrack.right
      : secondTrack.left - AURORA_GEOMETRY.stageLeft;
    const allocation = allocateSeparation(required, roomA, roomB);
    return {
      axis,
      required,
      remaining: allocation.remaining,
      firstDelta: (firstBefore ? -1 : 1) * allocation.moveA,
      secondDelta: (firstBefore ? 1 : -1) * allocation.moveB,
    };
  }

  const firstCenter = (first.top + first.bottom) / 2;
  const secondCenter = (second.top + second.bottom) / 2;
  const firstBefore = firstCenter <= secondCenter;
  const separation = firstBefore ? second.top - first.bottom : first.top - second.bottom;
  const required = Math.max(0, targetGap - separation);
  const roomA = firstBefore
    ? firstTrack.top - AURORA_GEOMETRY.stageTop
    : AURORA_GEOMETRY.stageBottom - firstTrack.bottom;
  const roomB = firstBefore
    ? AURORA_GEOMETRY.stageBottom - secondTrack.bottom
    : secondTrack.top - AURORA_GEOMETRY.stageTop;
  const allocation = allocateSeparation(required, roomA, roomB);
  return {
    axis,
    required,
    remaining: allocation.remaining,
    firstDelta: (firstBefore ? -1 : 1) * allocation.moveA,
    secondDelta: (firstBefore ? 1 : -1) * allocation.moveB,
  };
};

const separateTracks = (spec, ids, progress, targetGap) => {
  const [firstId, secondId] = ids;
  const candidates = [
    separationCandidate(spec, firstId, secondId, progress, 'x', targetGap),
    separationCandidate(spec, firstId, secondId, progress, 'y', targetGap),
  ].filter(Boolean);
  if (!candidates.length) return false;
  candidates.sort((a, b) =>
    (a.remaining > .25) - (b.remaining > .25)
    || a.remaining - b.remaining
    || a.required - b.required
    || a.axis.localeCompare(b.axis));
  const best = candidates[0];
  if (best.required < POLISH_EPSILON) return false;
  if (best.axis === 'x') {
    const movedA = shiftNodeTrack(spec, firstId, best.firstDelta, 0);
    const movedB = shiftNodeTrack(spec, secondId, best.secondDelta, 0);
    return movedA || movedB;
  }
  const movedA = shiftNodeTrack(spec, firstId, 0, best.firstDelta);
  const movedB = shiftNodeTrack(spec, secondId, 0, best.secondDelta);
  return movedA || movedB;
};

export function polishAuroraStrictLayout(manifest, {maxIterations = 120, safeInset = 1, gapMargin = 1} = {}) {
  const polished = structuredClone(manifest);
  polished.style = {...polished.style, safeArea: 'shorts-reels'};
  const adjustedSceneNumbers = new Set();
  const priority = {'safe-area-mode': 0, 'safe-area': 1, 'node-gap': 2};

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const issues = collectAuroraStrictIssues(polished);
    if (!issues.length) {
      return {manifest: polished, adjustedSceneNumbers: [...adjustedSceneNumbers].sort((a, b) => a - b)};
    }
    const issue = [...issues].sort((a, b) =>
      (priority[a.rule] ?? 99) - (priority[b.rule] ?? 99)
      || a.scene - b.scene
      || a.ids.join('|').localeCompare(b.ids.join('|')))[0];

    if (issue.rule === 'safe-area-mode') {
      polished.style = {...polished.style, safeArea: 'shorts-reels'};
      continue;
    }

    const scene = polished.scenes?.[issue.scene - 1];
    const spec = scene?.diagramSpec;
    if (!spec) break;

    let changed = false;
    if (issue.rule === 'safe-area' && issue.ids[0]) {
      changed = moveTrackInsideStage(spec, issue.ids[0], safeInset);
    } else if (issue.rule === 'node-gap' && issue.ids.length === 2) {
      changed = separateTracks(
        spec,
        issue.ids,
        issue.progress,
        AURORA_GEOMETRY.minimumNodeGap + gapMargin,
      );
    }

    if (!changed) break;
    adjustedSceneNumbers.add(issue.scene);
  }

  return {manifest: polished, adjustedSceneNumbers: [...adjustedSceneNumbers].sort((a, b) => a - b)};
}

export const formatAuroraStrictIssue = (issue) =>
  `[aurora:${issue.rule}] scene=${issue.scene || 'manifest'} t=${Number(issue.progress).toFixed(3)}${issue.ids.length ? ` nodes=${issue.ids.join(',')}` : ''}: ${issue.detail}`;

export function assertAuroraStrictLayout(manifest) {
  const issues = collectAuroraStrictIssues(manifest);
  if (issues.length) throw new Error(issues.map(formatAuroraStrictIssue).join('\n'));
  return manifest;
}
