# Blog → Shorts pipeline

`shorts/` turns a published `dohyeon.kr` Ghost post into multiple short-form video candidates, keeps human review in the middle, then renders only merged candidates.

## Flow

1. Run **Generate blog shorts** from GitHub Actions with a `dohyeon.kr` post URL.
2. GPT extracts 3–8 independent viral angles instead of summarizing the whole article.
3. Every scene receives a visual strategy (`photo`, `diagram`, `symbol`, `number`, or intentionally minimal `none`) and a layout.
4. Photo scenes receive a relevant Openverse search result. The default resolver only accepts CC0 or Public Domain Mark results.
5. The workflow opens a PR containing `shorts/content/<post-slug>/candidate-XX.json` files.
6. Edit or delete candidates in the PR. A merge is the approval gate.
7. Changes to candidate JSON files on `main` trigger **Render blog shorts**.
8. OpenAI TTS creates per-scene narration. Remotion renders 1080×1920 MP4 files with burned-in captions, and the render also emits an SRT subtitle file.

The visual system keeps one brand language while varying composition aggressively enough to avoid a repetitive template feel. Source photos are monochrome at render time; diagrams and symbols are drawn directly in Remotion.

## Visual language

New manifests use `schemaVersion: 2`. Existing v1 manifests remain renderable through legacy fallbacks.

Each scene can choose one of these layouts:

- `photo-top-right` — upper-right image, lower-left statement
- `photo-full-bleed` — full-screen monochrome image with text overlay
- `photo-split-left` — left image / right copy split
- `photo-strip` — horizontal image band
- `diagram-centered` — graph or diagram as the main visual
- `symbol-right` — large symbol on the right, statement on the left
- `statement-giant` — one oversized sentence
- `statement-offset` — asymmetric editorial typography
- `compare-columns` — calm two-column comparison
- `compare-versus` — stronger conflict / choice comparison
- `outro-minimal` — restrained conclusion

The generator is instructed not to repeat the same layout consecutively and to avoid two text-only scenes in a row.

### Concept → motif examples

- ROI / efficiency → `roi-curve`
- balance / trade-off → `balance-scale`
- goal → `target`
- direction → `compass`, `arrow-path`
- depth / zoom → `magnifier`
- whole structure / mental model → `map-network`
- choice → `fork-road`
- leverage → `leverage`
- learning debt / return-later marker → `bookmark-stack`
- bottleneck → `funnel`
- relationships → `network`
- priority → `ranked-list`
- growth → `ladder`
- risk → `warning`
- time investment → `hourglass`
- feedback → `feedback-loop`

Concrete scenes should prefer photos; abstract ideas should prefer a diagram or symbol instead of generic stock photography.

## Subtitles

Narration text is automatically chunked into short caption cues and timed proportionally to each scene's measured TTS duration. Captions are burned into the MP4, and the same cues are exported as `*.srt` for YouTube or other platform-native subtitle tracks.

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
OPENAI_API_KEY=... npm run render -- content/<post-slug>/candidate-01.json
npm run studio
```

The render script copies the repository's existing Pretendard font files into the temporary Remotion public directory; generated media and copied fonts are ignored by Git.

## Remotion licensing

This repository uses automated Remotion rendering. Review the current Remotion license terms before scaling or commercializing the automation because automated rendering can have different licensing terms from manual creator usage.
