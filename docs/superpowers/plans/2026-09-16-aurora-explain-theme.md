# Aurora Explain Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new dark `aurora-explain` HyperFrames shorts theme with Siri-like audio-reactive ambient light, stateful glass/skeuomorphic explanatory diagrams, stable captions, no presenter, and a theme-specific CTA.

**Architecture:** Keep candidate JSON and shared storyboard/final workflows as the editorial and execution boundaries. Extract theme selection behind a registry, then add a focused Aurora renderer made from theme-owned primitives, deterministic timeline state, and a normalized speech-energy envelope. `monoliquid-v2` stays byte/behavior compatible at its public rendering contract and keeps its existing CTA/presenter behavior.

**Tech Stack:** Node.js ESM, HTML/CSS, GSAP 3.14.x, HyperFrames CLI, existing shorts candidate schema/TTS preparation, Node test runner. Paper Shaders Mesh Gradient is an optional capture-compatible implementation behind `AmbientGradient`; deterministic CSS is the required fallback.

**Spec:** `docs/superpowers/specs/2026-09-16-aurora-explain-theme-design.md`

## Global Constraints

- Theme ID is `aurora-explain`; it is dark-only in v1.
- No human presenter, presenter asset, circular portrait, lip sync, or talking head may render for Aurora.
- Candidate JSON remains the editorial source of truth; arbitrary AI-generated HTML is not accepted.
- Shared storyboard/final workflows remain the entry points; do not create Aurora-specific workflows.
- Audio energy controls ambient light only; caption/narration cue timing controls conceptual diagram steps.
- Captured motion is deterministic: no `Math.random()`, `Date.now()`, `requestAnimationFrame` clocks, autonomous CSS infinite animation, or `repeat: -1`.
- CTA intent/content remains shared, while CTA visual rendering is selected by theme.
- Existing `monoliquid-v2` rendering, presenter, common CTA, TTS cache and release behavior must not regress.
- Third-party source/assets used in rendering are vendored locally with the exact applicable notices; no render-time fetching of UI libraries or textures.
- WebGPU liquid glass, React Bits redistribution, a bright variant, arbitrary 3D and full Remotion parity are out of scope for v1.

---

### Task 1: Theme registry and compiler routing

**Files:**
- Create: `shorts/scripts/hyperframes-themes.mjs`
- Modify: `shorts/scripts/build-hyperframes.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Produces: `getHyperframesTheme(themeId)` returning `{id, compositionId, rootClass, assetDir, renderCommonCta}` metadata.
- Consumes later: Aurora renderer and CTA routing use the resolved theme instead of direct `monoliquid-v2` checks.

- [ ] **Step 1: Add failing registry tests** asserting `monoliquid-v2` resolves unchanged, `aurora-explain` resolves to its own composition ID/root class, and unknown themes throw a descriptive error.
- [ ] **Step 2: Run** `cd shorts && node --test tests/hyperframes-build.test.mjs` **and verify the new assertions fail.**
- [ ] **Step 3: Implement** `hyperframes-themes.mjs` with an explicit immutable registry. Replace the compiler's single `template !== 'monoliquid-v2'` gate with registry lookup while retaining the same error behavior for unsupported themes.
- [ ] **Step 4: Run the focused test** and verify all existing monoliquid tests plus registry tests pass.
- [ ] **Step 5: Commit** `feat(shorts): add HyperFrames theme registry`.

### Task 2: Aurora visual identity and bounded primitives

**Files:**
- Create: `shorts/hyperframes/aurora-explain/DESIGN.md`
- Create: `shorts/hyperframes/aurora-explain/tokens.css`
- Create: `shorts/hyperframes/aurora-explain/theme.css`
- Create: `shorts/scripts/hyperframes-aurora-primitives.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Produces: `renderAuroraPrimitive(type, props)` for `smoked-panel`, `tactile-control`, `terminal`, `browser`, `flow-connector`; CSS classes `ax-*` for material and layout.
- Consumes: sanitized strings and semantic state only; no arbitrary HTML input.

- [ ] **Step 1: Add failing tests** that render each primitive and assert stable `data-ax-primitive` markers, semantic IDs/anchors, escaped user text, no presenter class, and no autonomous animation constructs.
- [ ] **Step 2: Run** `cd shorts && node --test tests/hyperframes-build.test.mjs` **and confirm failures identify missing Aurora primitives/assets.**
- [ ] **Step 3: Write Aurora `DESIGN.md`** from the approved spec: near-black canvas, indigo/violet/cyan restrained ambient fields, smoked glass semantic surfaces, subtle tactile depth, crisp text, stable centered captions, no presenter.
- [ ] **Step 4: Implement tokens and CSS** with `--ax-bg`, `--ax-glass-*`, `--ax-indigo`, `--ax-violet`, `--ax-cyan`, `--ax-magenta`, depth/highlight variables, safe areas, and static hero-frame layouts. Keep all content layout deterministic and reserve absolute positioning for ambient/decorative layers.
- [ ] **Step 5: Implement primitive markup helpers** with escaped text and named anchors. `TerminalWindow` exposes deterministic rows; `BrowserFrame` exposes toolbar/content slots generated from structured props; `FlowConnector` emits SVG/path markup from named bounded endpoints rather than arbitrary SVG strings.
- [ ] **Step 6: Run tests** and verify the primitive contract passes.
- [ ] **Step 7: Commit** `feat(shorts): add aurora explain visual primitives`.

### Task 3: Stateful explanation diagram contract

**Files:**
- Create: `shorts/scripts/hyperframes-aurora-diagram.mjs`
- Modify: `shorts/scripts/build-hyperframes.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Consumes: `scene.diagramSpec.objects`, `scene.diagramSpec.connections`, `scene.diagramSpec.steps` when theme is Aurora.
- Produces: `{markup, timelineStatements}` with persistent object IDs `ax-object-<scene>-<id>` and ordered step mutations.

- [ ] **Step 1: Add a failing cache-flow fixture** containing browser, service and cache objects, two connections and three timed steps; assert all objects exist once in the HTML and timeline statements activate/move state without replacing the scene DOM.
- [ ] **Step 2: Add failing validation cases** for duplicate object IDs, connections referencing missing anchors, non-monotonic step times and unsupported actions; each must fail before render with a specific message.
- [ ] **Step 3: Run the focused tests** and confirm the old generic three-node fallback cannot satisfy them.
- [ ] **Step 4: Implement bounded validation and rendering.** Supported v1 object roles: `browser`, `terminal`, `module`, `datastore`, `cache`, `queue`, `object`. Supported actions: `activate`, `deactivate`, `set-state`, `reveal`, `move-token`, `activate-connector`.
- [ ] **Step 5: Generate deterministic GSAP statements** from step times. Animate only opacity/transforms/color-related visual state; retain static end-state layout as the source of geometry.
- [ ] **Step 6: Wire Aurora scenes** to this renderer while leaving the existing monoliquid diagram branch unchanged.
- [ ] **Step 7: Run tests** and verify both Aurora stateful diagrams and monoliquid regression fixtures pass.
- [ ] **Step 8: Commit** `feat(shorts): render stateful aurora diagrams`.

### Task 4: Speech-energy envelope and Siri-like ambient field

**Files:**
- Create: `shorts/scripts/audio-envelope.mjs`
- Create: `shorts/scripts/hyperframes-aurora-ambient.mjs`
- Modify: `shorts/scripts/build-hyperframes.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Produces: `normalizeEnvelope(samples)` and `sampleEnvelope(envelope, timeSeconds)`; Aurora ambient renderer emits fixed light blobs plus finite timeline keyframes.
- Consumes: prepared speech metadata/audio-derived samples when available; otherwise a deterministic low-energy preview envelope derived from scene/caption timing.

- [ ] **Step 1: Add failing unit cases** for normalization, clamping to `0..1`, interpolation and deterministic preview fallback.
- [ ] **Step 2: Add a failing Aurora HTML assertion** requiring an `ax-ambient` layer and finite GSAP updates to scale/opacity/position while explicitly rejecting `requestAnimationFrame`, infinite CSS animation and `repeat:-1`.
- [ ] **Step 3: Run tests** and verify failure.
- [ ] **Step 4: Implement envelope utilities** as pure functions. Keep conceptual diagram steps completely independent of amplitude.
- [ ] **Step 5: Implement the ambient field** as three bounded blurred light masses over near-black with restrained grain. Sample the envelope at a fixed cadence and emit finite timeline segments. Make the implementation swappable so Paper Shaders can replace the CSS field only after deterministic capture verification.
- [ ] **Step 6: Wire preview fallback and prepared-render envelope input** into the compiler output/manifest sidecar without introducing a second TTS call.
- [ ] **Step 7: Run tests** and verify deterministic output for repeated builds of the same fixture.
- [ ] **Step 8: Commit** `feat(shorts): add audio reactive aurora field`.

### Task 5: Aurora theme-owned CTA

**Files:**
- Create: `shorts/scripts/hyperframes-aurora-cta.mjs`
- Modify: `shorts/scripts/hyperframes-themes.mjs`
- Modify: `shorts/scripts/build-hyperframes.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Produces: `renderAuroraCta({scene, start, duration}) -> {markup, timelineStatements}`.
- Consumes: the existing shared blog CTA scene/content intent, not a separate CTA copy source.

- [ ] **Step 1: Add failing tests** compiling identical shared CTA intent through both themes. Assert monoliquid retains `BlogCtaContent`, while Aurora contains `ax-cta`, `ax-ambient`, `ax-smoked-panel`, no `ml-scene--common-cta`, and no presenter markup.
- [ ] **Step 2: Run tests** and verify Aurora currently falls into the shared monoliquid CTA branch.
- [ ] **Step 3: Implement the Aurora CTA renderer**: explanation stage clears/dims, ambient field expands, smoked panel enters, one finite specular sweep runs, then shared CTA copy/action appears.
- [ ] **Step 4: Route common-page rendering through the theme registry** so future themes register their CTA renderer instead of adding compiler conditionals.
- [ ] **Step 5: Run tests** and verify both CTA renderers pass independently.
- [ ] **Step 6: Commit** `feat(shorts): add aurora theme CTA`.

### Task 6: Full Aurora composition, captions and reference scenes

**Files:**
- Create: `shorts/examples/aurora-explain-reference.json`
- Modify: `shorts/scripts/build-hyperframes.mjs`
- Modify: `shorts/tests/hyperframes-build.test.mjs`

**Interfaces:**
- Consumes: theme registry, Aurora primitives, diagram renderer, ambient renderer and CTA renderer.
- Produces: standalone HyperFrames composition ID `aurora-explain`, stable caption markup `ax-caption-zone`, and three acceptance scenes: Browser+Terminal, Glass Pipeline, CTA.

- [ ] **Step 1: Add failing composition tests** asserting `data-composition-id="aurora-explain"`, no presenter asset copied/emitted, bottom-centered one/two-line caption zone, and unique visual tracks for all scenes.
- [ ] **Step 2: Create the reference candidate** with a Browser+Terminal scene and Glass Pipeline scene; shared CTA supplies the third reference frame.
- [ ] **Step 3: Refactor compiler delegation minimally** so theme-owned asset copying, root class/composition ID, scene rendering and timeline hooks do not require Aurora-specific markup scattered through the main loop.
- [ ] **Step 4: Run** `cd shorts && node --test tests/hyperframes-build.test.mjs` **and verify all theme tests pass.**
- [ ] **Step 5: Run existing full shorts tests** with `cd shorts && npm test` and fix only regressions caused by this feature.
- [ ] **Step 6: Commit** `feat(shorts): compile aurora explain compositions`.

### Task 7: Workflow/template selection and semantic validation

**Files:**
- Modify: `.github/workflows/generate-shorts.yml`
- Modify: `.github/workflows/storyboard-shorts.yml`
- Modify: `.github/workflows/render-shorts.yml`
- Modify: `.github/workflows/review-storyboard.yml`
- Modify: `shorts/tests/workflow-engine-routing.test.mjs`
- Modify: relevant candidate/schema validation module discovered by existing workflow tests

**Interfaces:**
- Consumes: `style.template=aurora-explain` with `engine=hyperframes`.
- Produces: shared workflow routing identical to monoliquid-v2 at the engine level, but theme-aware validation/build selection.

- [ ] **Step 1: Extend failing workflow tests** to require `aurora-explain` as a HyperFrames-compatible template and reject it under Remotion until a Remotion adapter is explicitly implemented.
- [ ] **Step 2: Add failing semantic validation fixture** requiring Aurora diagram objects/connections/steps to pass through candidate validation without allowing arbitrary HTML.
- [ ] **Step 3: Run** `cd shorts && node --test tests/workflow-engine-routing.test.mjs` **plus the semantic validator test and confirm failure.**
- [ ] **Step 4: Update shared workflows and validators** by extending existing template lists/conditions only; do not create a new workflow.
- [ ] **Step 5: Run workflow and semantic tests** and verify existing templates remain accepted exactly as before.
- [ ] **Step 6: Commit** `feat(shorts): route aurora explain through shared workflows`.

### Task 8: HyperFrames render verification and three acceptance stills

**Files:**
- Modify only if verification exposes deterministic/capture issues: `shorts/hyperframes/aurora-explain/theme.css`, Aurora renderer modules, tests
- Generate under ignored temp/release paths only: `shorts/.tmp/aurora-explain-*`

**Interfaces:**
- Consumes: `shorts/examples/aurora-explain-reference.json`.
- Produces: lint/check-clean HyperFrames project and representative Browser+Terminal, Glass Pipeline and CTA snapshots for review.

- [ ] **Step 1: Build** the reference candidate with `node shorts/scripts/build-hyperframes.mjs shorts/examples/aurora-explain-reference.json --output=shorts/.tmp/aurora-explain-reference`; if the compiler's safety boundary requires content manifests, copy the fixture under an ignored `shorts/content/.aurora-reference-*` path for this smoke run.
- [ ] **Step 2: Run HyperFrames lint and strict check** using the same commands already used by `storyboard-shorts.yml`; expected result is zero errors.
- [ ] **Step 3: Render a draft** at the storyboard workflow's normal 30fps preview settings and extract the three representative snapshots with the existing storyboard extraction path.
- [ ] **Step 4: Inspect snapshots** for near-black dominance, crisp semantic text, readable centered captions, no presenter, bounded glass depth, visible but subordinate ambient light, and non-overlapping diagram objects.
- [ ] **Step 5: If Paper Shaders has been introduced, render the same timestamp twice and compare output.** Any nondeterminism or missing GPU output causes immediate fallback to the deterministic CSS ambient implementation for v1.
- [ ] **Step 6: Run** `cd shorts && npm test` **and the repository's existing shorts validation commands.**
- [ ] **Step 7: Commit any verification fixes** as `fix(shorts): stabilize aurora explain rendering`.

### Task 9: Documentation, license notices and PR

**Files:**
- Create: `shorts/docs/aurora-explain.md`
- Create as required by incorporated source: `shorts/hyperframes/aurora-explain/THIRD_PARTY_NOTICES.md`
- Modify: `shorts/README.md`

**Interfaces:**
- Produces: operator documentation for generation/storyboard/final render and exact provenance for vendored third-party source.

- [ ] **Step 1: Document** theme purpose, `engine=hyperframes`, candidate diagram contract, no-presenter rule, audio-envelope behavior, CTA routing and reference fixture.
- [ ] **Step 2: Record exact third-party provenance** only for code/assets actually incorporated: project, source path/URL, commit/version, license and preserved notice text. Do not list visual references whose code was not copied.
- [ ] **Step 3: Run the complete test suite**