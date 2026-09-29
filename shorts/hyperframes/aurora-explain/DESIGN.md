# Aurora Explain

Dark explanation-first HyperFrames theme.

- Near-black canvas with deterministic indigo/cyan/magenta ambient fields.
- Smoked-glass semantic objects, crisp labels, stable bottom captions.
- Existing `diagramSpec.nodes/events` is the editorial contract. The renderer infers browser/datastore/cache/module treatments from stable node IDs and labels; arbitrary HTML is never accepted.
- No presenter asset, presenter overlay, lip sync, pointer tracking, autonomous clock, infinite CSS animation, or random motion.
- Shared blog CTA intent is rendered by a theme-owned smoked-glass CTA.
- Final prepared manifests reuse the same scene renderer and only add prepared audio/media paths.


## Continuous state and error feedback

- For requirement-growth explainers, keep one semantic stage alive and morph diagram nodes in place instead of resetting the scene for every requirement.
- `flow-glow` remains the normal focus cue between semantic objects.
- `glow` may target a non-line diagram node to create a finite local highlight using `effect.color` and optional `radius`.
- `light-leak` renders a finite full-scene overlay. Use it sparingly for exceptional states such as validation failure; it must return to zero opacity.
- When `choreography` contains `camera-error-shake`, the renderer uses the first light-leak/glow target as the focus origin, briefly zooms and shakes the diagram stage, then deterministically returns to rest.
- Error camera motion applies only to the diagram stage. Headline and subtitle/caption zones remain stable so feedback reads as UI state, not an edit glitch.
- No error effect may repeat indefinitely or use wall-clock/random motion.
