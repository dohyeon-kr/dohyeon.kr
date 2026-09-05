# Blog → Shorts pipeline

`shorts/` turns a published `dohyeon.kr` Ghost post into multiple short-form video candidates, keeps human review in the middle, then renders only merged candidates.

The creative target is a **motion infographic**, not a templated AI slideshow. See [`docs/creative-system.md`](docs/creative-system.md) for the canonical visual, motion, subtitle-rhythm, and asset policy.

## Flow

1. Run **Generate blog shorts** from GitHub Actions with a `dohyeon.kr` post URL.
2. GPT extracts 3–8 independent viral angles instead of summarizing the whole article.
3. Every scene receives semantic subtitle beats, a visual relationship, a visual strategy, a layout, element choreography, camera motion, and a scene transition.
4. Photo scenes receive a relevant Openverse search result. The default resolver only accepts CC0 or Public Domain Mark results.
5. The workflow opens a PR containing `shorts/content/<post-slug>/candidate-XX.json` files.
6. Edit or delete candidates in the PR, then merge the selected manifests.
7. Changes to candidate JSON files on `main` trigger **Build blog shorts storyboard**, which creates one representative PNG per scene, a two-column mobile contact sheet, and a scene-by-scene PDF.
8. The workflow publishes those files as a Draft Release. Review the contact sheet on mobile, then use the PDF or individual PNGs for detailed checks. Fix the manifest and regenerate until the sequence is approved.
9. Manually run **Render blog shorts** with the approved manifest path and check `storyboard_approved`.
10. Only then does OpenAI TTS create per-scene narration. Remotion renders the 1080×1920 MP4 with burned-in captions and emits an SRT subtitle file.

Source photos are normalized to the monochrome editorial language at render time. Graphs, diagrams, physical metaphors, and symbols are drawn directly in Remotion when possible.

## Visual language

New manifests use `schemaVersion: 3`. Existing v1/v2 manifests remain renderable through legacy fallbacks.

Visual selection is relation-first rather than keyword-first. Preferred strategy order:

`simulation → graph → spatial diagram → physical metaphor → photo → icon fallback`

Examples:

- ROI / efficiency → animated curve
- leverage → animated lever / seesaw rather than a generic rising arrow
- balance / trade-off → tilting balance
- bottleneck → flow accumulating at a narrow point
- whole structure / mental model → network / map
- depth / inspection → overview followed by semantic camera zoom

Meaningless template labels such as `PHOTO / PHOTO`, `STATEMENT / LEVERAGE`, or `VISUAL / ROI-CURVE` are forbidden. Every visible element must communicate information, emphasize meaning, provide context, guide attention, or control rhythm.

## Layouts

Each scene can choose one of these layouts:

- `photo-top-right`
- `photo-full-bleed`
- `photo-split-left`
- `photo-strip`
- `diagram-centered`
- `symbol-right`
- `statement-giant`
- `statement-offset`
- `compare-columns`
- `compare-versus`
- `outro-minimal`

The generator avoids repeating the same layout consecutively and avoids two text-only scenes in a row.

## Motion

Scene transitions and element animations are separate layers. The generator emits an ordered `choreography` for meaningful in-scene events and a `camera` instruction for viewpoint changes.

Default motion vocabulary is deliberately narrow: fade, slide, scale, reveal, draw, zoom, and pan. Bounce, spin, elastic, and decorative overshoot are excluded by default.

A core rule is to translate verbs into motion: expanding concepts should expand, accumulation should stack, bottlenecks should visibly queue, and inspection should zoom into a meaningful detail.

## Subtitles

Schema v3 scenes include semantic `beats` with emphasis, delivery, pause, optional keyword, and visual cue metadata.

Subtitles are not split only by character count. The generator prefers meaningful chunks of at least four non-space characters and avoids fragments such as `그럴 / 수 / 있다`. Short punch words may stand alone when the separation is intentional.

High-emphasis beats are used sparingly, usually 1–2 per sentence, and the renderer gives them stronger visual treatment. Existing manifests without beats fall back to the legacy caption chunker.

## Asset policy

The automated photo resolver currently uses Openverse with CC0 / Public Domain Mark filtering. Other useful source pools are documented in `docs/creative-system.md`, including Pexels, Coverr, Mixkit, Pixabay, SVG Repo, Icons8, LottieFiles, and Storyset.

Those services are material pools, not the art direction. Any future resolver must preserve the monochrome editorial normalization policy and verify licenses before publication.

## Required repository secret

- `OPENAI_API_KEY` — used for candidate generation and TTS.

Optional repository variables:

- `SHORTS_TEXT_MODEL` — defaults to `gpt-5.6-luna`.
- `SHORTS_TTS_MODEL` — defaults to `gpt-4o-mini-tts`.
- `SHORTS_TTS_VOICE` — defaults to `alloy`.

If the repository does not allow GitHub Actions to open pull requests with `GITHUB_TOKEN`, enable that repository setting or provide an appropriate token by adapting the generate workflow.

## Image licensing

Image discovery is powered by Openverse and restricted to `cc0` and `pdm` results by default. Each candidate stores the original source page and license metadata, and every render produces a `*-MEDIA.md` file. Openverse itself warns that aggregated license metadata can be inaccurate, so the source page should still be checked before publication.

## Local commands

```bash
cd shorts
npm install
OPENAI_API_KEY=... npm run generate -- https://dohyeon.kr/<post-slug>/ 5
npm run storyboard -- content/<post-slug>/candidate-01.json
OPENAI_API_KEY=... npm run render -- content/<post-slug>/candidate-01.json
npm run studio
```

The render script copies the repository's existing Pretendard font files into the temporary Remotion public directory; generated media and copied fonts are ignored by Git.

## Remotion licensing

This repository uses automated Remotion rendering. Review the current Remotion license terms before scaling or commercializing the automation because automated rendering can have different licensing terms from manual creator usage.
