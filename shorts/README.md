# Blog → Shorts pipeline

`shorts/` turns a published `dohyeon.kr` Ghost post into multiple short-form video candidates, keeps human review in the middle, then renders only merged candidates.

## Flow

1. Run **Generate blog shorts** from GitHub Actions with a `dohyeon.kr` post URL.
2. GPT extracts 3–8 independent viral angles instead of summarizing the whole article.
3. Photo scenes receive a relevant Openverse search result. The default resolver only accepts CC0 or Public Domain Mark results.
4. The workflow opens a PR containing `shorts/content/<post-slug>/candidate-XX.json` files.
5. Edit or delete candidates in the PR. A merge is the approval gate.
6. Changes to candidate JSON files on `main` trigger **Render blog shorts**.
7. OpenAI TTS creates per-scene narration, Remotion renders 1080×1920 MP4 files, and GitHub stores them as workflow artifacts.

The visual system is intentionally narrow: off-white background, large lower-left statement, upper-right visual, generous whitespace, and monochrome treatment applied at render time. Source images are not modified in Git.

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
