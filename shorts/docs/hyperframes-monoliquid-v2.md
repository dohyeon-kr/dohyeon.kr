# Monoliquid v2 / HyperFrames

`monoliquid-v2` is the HyperFrames renderer path for SNS shorts. It keeps the candidate JSON contract and the existing approval/release model, but compiles approved scene data into deterministic HTML/CSS/GSAP instead of sending the video through the Remotion composition.

## Why a separate engine path

The candidate JSON remains the editorial source of truth. AI decides the message, scene kind, narration, photo/diagram intent and comparison content. The renderer decides layout and motion from a bounded template. HyperFrames then supplies deterministic timeline playback plus `lint` and rendered layout inspection.

Do **not** let generation produce arbitrary HTML. The intended contract is:

```text
blog/source
  → candidate JSON
  → semantic storyboard validation
  → monoliquid-v2 compiler
  → HyperFrames HTML
  → hyperframes lint
  → hyperframes inspect
  → draft/high render
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

## Storyboard preview

Run **Render Monoliquid v2 with HyperFrames** (`.github/workflows/hyperframes-shorts.yml`) with:

- `manifest`: `shorts/content/<post>/candidate-XX.json`
- `mode`: `storyboard`
- `preview_scale`: normally `0.4`

The workflow performs, in order:

1. existing semantic storyboard validation;
2. `candidate.json → HyperFrames` compilation;
3. `hyperframes lint`;
4. `hyperframes inspect --strict`;
5. a draft 30fps render;
6. representative scene snapshots;
7. the existing storyboard contact-sheet/PDF packaging;
8. replacement of the single working `shorts-storyboard-preview` Draft Release;
9. upload of a downscaled, silent motion-preview MP4 to that same working Release.

The release motion preview is encoded at the selected preview scale and must stay below 10 MiB. This preserves the repository rule that storyboard iteration updates one working Release rather than accumulating normal artifacts.

## AI storyboard review

The existing **Review and improve shorts storyboard** workflow detects `monoliquid-v2` before rendering the improved candidate. Editorial review and PR creation remain shared, but the improved preview is routed through the HyperFrames compiler, `lint`, strict `inspect`, draft render and the same 0.4× working motion-preview Release rather than falling back to Remotion.

## Final render

After reviewing the working storyboard, run the same HyperFrames workflow with:

- `mode`: `final`
- `storyboard_approved`: `true`

Final mode intentionally reuses the existing paid-audio recovery path instead of asking HyperFrames TTS to regenerate speech:

1. restore the current `shorts/.cache/audio` cache;
2. run the existing `render.mjs --prepare-audio` path;
3. reuse its final-rate MP3, measured duration and caption alignment;
4. compile that prepared render manifest into HyperFrames;
5. lint and inspect again;
6. render high-quality 30fps MP4;
7. reuse `shorts/scripts/bgm.mjs` for BGM/SFX and speech ducking;
8. write SRT, Reels publishing copy, narration script and media provenance sidecars;
9. reuse `publish-video-release.mjs` so each reel still has exactly one stable final Release.

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

The full HyperFrames CLI pass requires the CLI/Chrome environment and is run by the dedicated Actions workflow.

## Files

- `shorts/hyperframes/monoliquid-v2/DESIGN.md` — visual identity and motion constraints
- `shorts/hyperframes/monoliquid-v2/tokens.css` — shared design tokens/fonts
- `shorts/hyperframes/monoliquid-v2/theme.css` — bounded 9:16 scene styles
- `shorts/scripts/build-hyperframes.mjs` — JSON → HTML compiler
- `shorts/scripts/extract-hyperframes-storyboard.mjs` — motion preview → storyboard snapshots
- `shorts/scripts/mix-hyperframes-bgm.mjs` — existing BGM/SFX reuse
- `shorts/scripts/write-hyperframes-release-assets.mjs` — SRT/copy/script/media release sidecars
- `.github/workflows/hyperframes-shorts.yml` — storyboard and final workflow
- `.github/workflows/review-storyboard.yml` — shared AI review with renderer-specific preview rerender
