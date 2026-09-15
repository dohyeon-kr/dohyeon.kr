# Monoliquid v2 / HyperFrames

`monoliquid-v2` is the HyperFrames renderer path for SNS shorts. It keeps the candidate JSON contract and the existing approval/release model, but compiles approved scene data into deterministic HTML/CSS/GSAP instead of sending the video through the Remotion composition.

## Why a separate engine path

The candidate JSON remains the editorial source of truth. AI decides the message, scene kind, narration, photo/diagram intent and comparison content. The renderer decides layout and motion from a bounded template. HyperFrames then supplies deterministic timeline playback plus `lint` and rendered layout inspection.

The engine implementation is separate, but the GitHub Actions entry points are shared with the existing shorts pipeline. Do **not** create a renderer-specific workflow again. Storyboard and final rendering select the engine from a workflow input.

Do **not** let generation produce arbitrary HTML. The intended contract is:

```text
blog/source
  → candidate JSON
  → semantic storyboard validation
  → selected engine
      ├─ remotion
      └─ hyperframes → monoliquid-v2 compiler → lint/check
  → storyboard preview or final render
```

The visual source of truth is `shorts/hyperframes/monoliquid-v2/DESIGN.md`. Its palette and typography come from `themes/monoliquid/assets/css/screen.css`.

## Generate candidates

Run **Generate blog shorts** and select `template: monoliquid-v2`.

The generated manifest stores both:

```json
{
  "style": {
    "theme": "monoliquid-v2",
    "template": "monoliquid-v2"
  }
}
```

Existing templates and existing manifests are unchanged.

## Engine selection contract

The manual storyboard and final-render workflows both expose:

- `engine: remotion` for the existing Remotion templates;
- `engine: hyperframes` for `monoliquid-v2`.

The workflows fail early when the selected engine and candidate template do not match. `monoliquid-v2` must use HyperFrames; the current HyperFrames compiler only accepts `monoliquid-v2`.

## Storyboard preview

Run **Build blog shorts storyboard** (`.github/workflows/storyboard-shorts.yml`) with:

- `generate_previews`: `true`;
- `engine`: `hyperframes`;
- `manifest`: `shorts/content/<post>/candidate-XX.json`;
- `preview_scale`: normally `0.4`.

For HyperFrames the shared storyboard workflow performs, in order:

1. existing semantic storyboard validation;
2. `candidate.json → HyperFrames` compilation;
3. `hyperframes lint`;
4. `hyperframes check --strict`;
5. a draft 30fps render;
6. representative scene snapshots;
7. the existing storyboard contact-sheet/PDF packaging;
8. replacement of the single working `shorts-storyboard-preview` Draft Release;
9. upload of a downscaled, silent motion-preview MP4 to that same working Release.

For `engine: remotion`, the same workflow keeps the existing `render.mjs --storyboard` path and publishes to the same working storyboard Release.

The HyperFrames release motion preview is encoded at the selected preview scale and must stay below 10 MiB. This preserves the repository rule that storyboard iteration updates one working Release rather than accumulating normal artifacts.

## AI storyboard review

The existing **Review and improve shorts storyboard** workflow detects `monoliquid-v2` before rendering the improved candidate. Editorial review and PR creation remain shared, but the improved preview is routed through the HyperFrames compiler, `lint`, strict visual check, draft render and the same 0.4× working motion-preview Release rather than falling back to Remotion.

## Final render

After reviewing the working storyboard, run **Render blog shorts** (`.github/workflows/render-shorts.yml`) with:

- `engine`: `hyperframes`;
- `manifest`: the approved candidate;
- `storyboard_approved`: `true`.

HyperFrames final mode intentionally reuses the existing paid-audio recovery path instead of asking HyperFrames TTS to regenerate speech:

1. restore the current `shorts/.cache/audio` cache;
2. run the existing `render.mjs --prepare-audio` path;
3. reuse its final-rate MP3, measured duration and caption alignment;
4. compile that prepared render manifest into HyperFrames;
5. lint and check again;
6. render high-quality 30fps MP4;
7. reuse `shorts/scripts/bgm.mjs` through the HyperFrames mixer for BGM/SFX and speech ducking;
8. write SRT, Reels publishing copy, narration script and media provenance sidecars;
9. reuse `publish-video-release.mjs` so each reel still has exactly one stable final Release.

For `engine: remotion`, the same workflow keeps the existing `render-reels.mjs` path before publishing the final Release.

A render failure after TTS preparation therefore does not intentionally trigger a second paid speech call on the next run while the cache is available.

## Scene support in v2 initial implementation

The initial compiler handles the current bounded scene contract rather than arbitrary DOM:

- `hero`: large editorial title frame;
- `statement`: one dominant sentence/subline;
- `photo`: resolved photo in the Monoliquid image plate;
- `compare`: rigid two-column contrast;
- `outro`: minimal closing frame;
- `diagramSpec` / diagram visual: an initial relationship/node representation.

The compiler uses the existing common blog CTA as a scene and keeps captions left of the reserved lower-right presenter area.

## Current parity boundaries

These are deliberate v2 boundaries, not silent fallbacks:

- The programmable persistent presenter is **not yet ported into HyperFrames**. v2 reserves its lower-right safe area so later presenter parity does not require redesigning every composition.
- Existing `backgroundVideo` preparation is not yet emitted into the HyperFrames composition.
- Complex Remotion/Motion Canvas `diagramSpec` geometry is not reproduced one-for-one yet; v2 currently renders a bounded relation diagram from scene meaning.
- Candidate semantics, image provenance, TTS cache, caption timing, BGM/SFX and final Release behavior are reused from the current pipeline.

Until presenter/background-video/diagram parity lands, use v2 for validating the HyperFrames template/render architecture and for reels whose approved storyboard does not depend on those features.

## Local compiler smoke test

The unit suite includes `tests/hyperframes-build.test.mjs`, which creates a temporary v2 manifest and verifies that the compiler produces a registered deterministic HyperFrames composition without random/infinite timeline behavior.

`tests/workflow-engine-routing.test.mjs` also locks the Actions contract: storyboard and final render must expose the shared engine selector and the old dedicated HyperFrames workflow must not return.

The full HyperFrames CLI pass requires the CLI/Chrome environment and is run by the selected Actions path.

## Files

- `shorts/hyperframes/monoliquid-v2/DESIGN.md` — visual identity and motion constraints
- `shorts/hyperframes/monoliquid-v2/tokens.css` — shared design tokens/fonts
- `shorts/hyperframes/monoliquid-v2/theme.css` — bounded 9:16 scene styles
- `shorts/scripts/build-hyperframes.mjs` — JSON → HTML compiler
- `shorts/scripts/extract-hyperframes-storyboard.mjs` — motion preview → storyboard snapshots
- `shorts/scripts/mix-hyperframes-bgm.mjs` — existing BGM/SFX reuse
- `shorts/scripts/write-hyperframes-release-assets.mjs` — SRT/copy/script/media release sidecars
- `.github/workflows/storyboard-shorts.yml` — shared storyboard workflow with engine selection
- `.github/workflows/render-shorts.yml` — shared final render workflow with engine selection
- `.github/workflows/review-storyboard.yml` — shared AI review with renderer-specific preview rerender
