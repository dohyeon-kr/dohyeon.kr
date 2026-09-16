# Aurora Explain Theme Design

## Goal

Add a new dark explanation-first SNS shorts theme without changing `monoliquid-v2`. The theme has no human presenter. Narration is represented by an ambient Siri-like field of light, while concrete HTML diagram objects explain concepts above stable bottom captions.

## Visual identity

Working name: `aurora-explain`.

The canvas is near-black and intentionally dark. Most of the frame remains black. Indigo, violet, cyan and restrained magenta light appear as large blurred fields rather than a full-screen rainbow gradient. The light behaves as an ambient voice presence: speech energy increases its area and intensity and silence lets it settle back into the black canvas.

The foreground combines restrained skeuomorphism and glassmorphism. Glass is a semantic surface rather than a generic card treatment. Depth, inset highlights, rails, slots, LEDs and tactile controls should communicate state. Text and diagram edges remain sharp and readable even when surrounding surfaces are translucent.

There is no presenter overlay, circular portrait or talking head in this theme.

## Composition

A normal explanatory scene uses three functional zones:

1. The upper 60–70% is the explanation stage. Browser frames, terminals, pipelines, architecture layers and stateful controls live here.
2. Ambient light sits behind the explanation stage and can extend toward the caption zone without reducing text contrast.
3. Bottom-centered captions use a stable one- or two-line region. Caption position and base size do not jump between cues.

The visual should explain by changing persistent object state, not by replacing the whole screen for every narration sentence. A cache explanation, for example, should retain the browser, server and cache objects while requests move, paths activate and states change.

## Primitive set

The first implementation contains seven bounded primitives:

- `SmokedGlassPanel`: dark translucent semantic container with controlled highlight, border and depth.
- `TactileControl`: button, switch, slot or LED state used when physical affordance improves comprehension.
- `TerminalWindow`: deterministic command/output surface derived from the visual language of terminal UI references.
- `BrowserFrame`: simplified browser or web-app frame for showing an interface, request or result.
- `AmbientGradient`: dark audio-reactive light field. Paper Shaders Mesh Gradient is the first implementation candidate, with a deterministic CSS/canvas fallback if capture compatibility fails.
- `SpecularSweep`: a one-shot reflection sweep for emphasis. It is timeline-triggered, never an infinite decoration loop.
- `FlowConnector`: theme-owned path/arrow/rail connecting semantic objects. Path activation can be timed to narration.

Uiverse and Magic UI are reference/implementation sources, not runtime design systems. Extract the useful surface, depth and component grammar into theme-owned primitives so the reel does not look like a mixture of unrelated libraries. Store required notices when source code is incorporated.

React Bits and experimental WebGPU liquid-glass implementations are outside the first implementation. They can be separately evaluated later.

## Motion and time

Visual state is deterministic and controlled by the video timeline. Hover, pointer tracking, requestAnimationFrame clocks, CSS infinite animation and autonomous shader time are not allowed in captured output.

Two timing streams are intentionally separate:

- Audio envelope drives ambient light intensity, spread and restrained deformation.
- Caption/narration cue timing drives diagram state transitions.

The renderer precomputes or receives a normalized speech-energy envelope. The visual adapter samples it by composition time. The diagram contract exposes ordered steps tied to cue-relative times. Speech volume must never decide which conceptual step is active.

GSAP is the preferred common motion vocabulary where practical because HyperFrames already uses deterministic GSAP timelines and Remotion can later adapt the same motion definitions through a frame-controlled integration. Engine adapters remain separate; identical DOM/JSX is not required.

## Diagram behavior

`diagramSpec` must no longer collapse to three generic text nodes for this theme. The theme consumes a bounded explanation specification consisting of persistent objects, connections and ordered state changes. Supported first-pass object roles are browser, terminal, service/module, datastore/cache, queue/slot and generic labeled object.

Each step may activate/deactivate an object, change a semantic state, reveal text, move a token between named anchors, or activate a connector. The final layout for every step must be statically inspectable. Semantic text may not overlap captions or other semantic text.

## CTA

CTA content/intent remains shared with the blog-shorts system, but CTA rendering is theme-owned. A registry resolves `theme -> scene renderer / CTA renderer / tokens` rather than accumulating renderer-specific conditionals.

For `aurora-explain`, the CTA contains no presenter. Explanation objects dim or clear, ambient light expands toward the center, a smoked-glass CTA surface appears, one specular sweep passes across it, and CTA copy/action appears. It remains in the same dark visual world as the reel.

Existing themes continue using their current CTA output unless explicitly registered otherwise.

## Renderer architecture

Candidate JSON remains the editorial source of truth. Shared workflows remain the entry points. Add a theme registry that owns theme metadata and renderer selection. The HyperFrames compiler delegates visual composition to the selected theme implementation rather than embedding all theme-specific HTML in one growing conditional block.

Initial modules should separate:

- theme registry and contracts;
- Aurora visual tokens/styles;
- Aurora primitive markup;
- Aurora scene/diagram rendering;
- Aurora CTA rendering;
- audio-envelope preparation/sampling;
- timeline generation.

`monoliquid-v2` behavior is a regression boundary and must remain unchanged.

## Storyboard reference frames

The first design verification must include three representative stills:

1. Browser + Terminal: smoked browser and terminal surfaces over the ambient field, with one active relation.
2. Glass Pipeline: persistent modules and FlowConnectors showing a concrete state transition.
3. CTA: ambient field + theme-specific smoked-glass CTA with no presenter.

These stills are acceptance frames for material, hierarchy and safe-area decisions before richer motion is added.

## Validation

Unit tests must lock theme registry selection, absence of presenter markup, theme-owned CTA routing, deterministic timeline construction and non-regression for `monoliquid-v2`. Diagram tests must verify persistent object IDs and ordered steps rather than generic three-node fallback.

HyperFrames `lint` and strict check remain mandatory before storyboard/final render. A render smoke test should capture the three representative frames. If Paper Shaders cannot be captured deterministically in the Actions renderer, the first release uses the deterministic fallback rather than blocking the theme.

## Licensing and assets

Do not fetch third-party UI code or textures during rendering. Incorporated code/assets are vendored locally with applicable license/notice files. Uiverse/Magic UI/Paper Shaders/HyperFrames source conditions must be checked for the exact incorporated artifact. Do not assume paid/pro components inherit a repository's free-component license.

## Out of scope for v1

- Human presenter or speech-driven mouth animation.
- Bright/light variant.
- Arbitrary AI-generated HTML.
- React Bits component redistribution.
- WebGPU-dependent liquid-glass effects.
- General-purpose 3D scene engine.
- One-to-one parity of all existing Remotion diagram features.