# Declarative diagram engine

`scene.diagramSpec` composes up to 40 labeled primitives and 120 bounded animation
events. Existing manifests without this field continue through `PresetVisual`.
The generator emits the shared Zod schema; generation and rendering validate IDs,
event targets, ranges and overlapping property animations before paid TTS calls.

The default `renderer: remotion` uses React SVG. `renderer: motion-canvas` selects
the actual Motion Canvas 3.17.2 engine (not hand-written Canvas2D). It is an explicit
alternative backend, not an automatic recovery from invalid JSON. Both use a pure
normalized-time evaluator, preserving backwards seeking and parallel frames.
The Motion Canvas adapter instantiates an isolated scene, awaits font loading and
Stage.render, and blocks Remotion capture with delayRender until ready. Failures
abort rendering instead of silently replacing the meaning with an icon.

The two backends currently share rect, circle, line and text primitives, and x/y,
rotation, scale and opacity animations. This first version does NOT provide free
AI-generated code, physics, arbitrary paths, ELK layout, or visual auto-repair.
Changing backend alone does not expand the supported vocabulary. Coordinates are
in an 800×560 local view box; keep objects and labels inside a 40-unit inset.
Time is normalized 0..1 across the scene's actual duration; narration determines
duration at final render, while storyboards use estimated duration.

Run `node --test shorts/tests/diagram.test.mjs` from the repository root.
Visual verification of both backends is required before merging: render the same
diagram at start, midpoint and end, and inspect typography and image parity.
