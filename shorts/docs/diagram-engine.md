# Declarative diagram engine

scene.diagramSpec supports 40 labeled rect/circle/line/text nodes and 120 normalized-time transform events. Old manifests without a spec use PresetVisual. Generation and rendering validate IDs, event overlap, physics targets, circles, pins and transform conflicts before paid TTS.

## Engine selection and recovery

renderer: auto selects React SVG/Remotion for regular diagrams and Motion Canvas 3.17.2 for physics scenes. This is project routing policy, not a claim SVG cannot display physics. Explicit remotion and motion-canvas override selection. Both consume the same evaluated node positions, rotations, labels and opacity.

On a component/async adapter failure, an error boundary tries the alternate backend once and logs the failure. Invalid specs fail before the boundary. Failed fallback aborts rendering, never substitutes an unrelated icon. CLI/browser crashes and process-level timeouts cannot be recovered by a component boundary. Strict engine CI previews disable fallback to expose engine bugs.

The adapter imports ReadOnlyTimeEvents from its actual submodule: Motion Canvas 3.17.2 does not export it from the core entry point. Capture waits for its isolated scene and fonts. Typechecking now runs in CI.

## Physics

Matter.js 0.20.0 provides collisions, gravity, mass, friction, restitution, initial velocity, static floors and fixed-world pins (seesaw pivots). physics: null disables physics. Otherwise specify seconds (0.1–10), gravity, bodies and pins. See src/visuals/physics-example.ts for a complete seesaw.

Coordinates use the 800×560 diagram space. Velocity is coordinate units per 60Hz tick; gravity uses Matter's default scale. Pins use world coordinates, with body attachments calculated from initial position. No invisible boundaries: specify static floor/wall nodes if needed. Only rect and equal-size circle nodes can be physical bodies. Physics owns transforms; only opacity events may overlap physics. Pins themselves are not drawn: add a decorative node.

Every evaluation rebuilds a world with stable body IDs and advances at 1/60 second steps. No realtime Runner, randomness or shared solver state. physics.seconds is independent of narration: normalized scene progress maps to the same simulation timeline for storyboards and final renders. Reverse and out-of-order frames reproduce the same state with pinned dependencies. This is a conceptual metaphor, not a financial/engineering prediction. Scene complexity and duration are bounded to limit replay cost.

No arbitrary AI code, arbitrary paths, automatic layout or visual auto-repair. Engine switching alone adds no new shapes. Keep labels/nodes inside a 40-unit inset; physical motion can still leave the viewport, so inspect storyboards.

## Verification

Run npm test and npm run typecheck in shorts. CI renders initial/mid/final frames for SVG, strict Motion Canvas, automatic physics and forced failures in both directions, plus full template previews. Failed runs retain successfully rendered PNGs. Do not merge before render CI passes.

References: https://brm.io/matter-js/docs/classes/Engine.html and https://brm.io/matter-js/docs/classes/Constraint.html.
