# Blog → Shorts pipeline

`shorts/` turns a published `dohyeon.kr` Ghost post into multiple short-form video candidates, keeps human review in the middle, then renders only explicitly selected candidates.

The creative target is a **motion infographic**, not a templated AI slideshow. See [`docs/creative-system.md`](docs/creative-system.md) for the canonical visual, motion, subtitle-rhythm, and asset policy.

For the end-to-end operating procedure, approval checklist, engine routing, output locations and known limitations, see [제작·승인·렌더 운영 가이드](docs/production-workflow.md).

## Flow

1. Run **Generate blog shorts** from GitHub Actions with a `dohyeon.kr` post URL.
2. GPT extracts 3–8 independent viral angles instead of summarizing the whole article.
3. Every scene receives semantic subtitle beats, a visual relationship, a visual strategy, a layout, element choreography, camera motion, and a scene transition.
4. Photo scenes receive a relevant Openverse search result. The default resolver only accepts CC0 or Public Domain Mark results.
5. The workflow converts candidate JSON into readable `candidate-XX.md` storyboards, builds a linked README index, and opens a review PR containing both. Each storyboard presents narration, screen copy and layout, visual relationships, diagram changes, camera/transition direction, and subtitle emphasis/pacing in scene order. No additional model call or TTS is needed. The Actions summary and PR body link to the candidate index for mobile review.
6. Check the candidates to use in the PR body. Each checkbox edit regenerates only the selected candidates’ silent previews and scene images in Actions artifacts. Keep unselected files for later reuse. With no selection, candidate rendering is skipped.
7. Merging the PR triggers **Build blog shorts storyboard** for only the checked candidates, creating one representative PNG per scene, a two-column mobile contact sheet, and a scene-by-scene PDF. Direct pushes do not render all candidates. For later revisions or existing candidates, use its manual manifest input.
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

- `SHORTS_TEXT_MODEL` — defaults to `gpt-5.6-sol`. Candidate generation uses `reasoning.effort: low`.
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

To regenerate readable storyboards after editing or deleting candidate JSON (from the repository root):

```bash
node shorts/scripts/describe-candidates.mjs shorts/content/<post-slug>
```

JSON remains the editable source; generated Markdown is a review view of its planned direction, not proof of rendered behavior. Missing photos are explicitly marked, and unmeasured TTS durations are not invented. Existing manifests without semantic beats remain supported. Custom choreography instructions are retained verbatim when no Korean label is defined.

See the [readable storyboard example for candidate 3](docs/examples/candidate-03-storyboard.md), captured from commit `3549151`.

The render script copies the repository's existing Pretendard font files into the temporary Remotion public directory; generated media and copied fonts are ignored by Git.

## Remotion licensing

This repository uses automated Remotion rendering. Review the current Remotion license terms before scaling or commercializing the automation because automated rendering can have different licensing terms from manual creator usage.

## 웹에서 후보 선택하기

1. 생성된 PR 본문의 **사용할 후보 선택**에서 원하는 후보를 체크합니다. 여러 후보도 선택할 수 있습니다.
2. PR의 Actions 실행에서 `shorts-candidate-review-<PR 번호>` artifact를 열어 선택한 후보의 무음 영상과 장면 이미지를 검토합니다. 이전 실행의 결과와 혼동하지 않도록 가장 최근 실행을 확인합니다.
3. 선택을 바꾸면 새 검토 실행이 시작됩니다. 후보 JSON과 동반 Markdown은 삭제할 필요가 없습니다.
4. PR을 병합하면 당시 체크된 후보만 스토리보드 Draft Release로 생성됩니다. 체크가 없으면 생성하지 않습니다.
5. 검토를 마치면 **Render blog shorts → Run workflow**에서 선택한 후보 JSON 경로를 넣고 `storyboard_approved`를 체크합니다. 최종 음성·영상은 이 단계에서만 생성됩니다.

선택 상태는 PR 본문의 `shorts-selection` 구간에 저장됩니다. 구간 표식과 후보 경로는 유지하세요. 기존 PR은 이 구간을 추가해야 선택 기능이 동작하며, 구간이 없으면 후보를 자동 렌더링하지 않습니다. PR 미리보기에서는 해당 PR이 변경한 후보만 선택할 수 있습니다. 워크플로 변경을 먼저 main에 병합해야 이후 생성되는 PR에도 새 동작이 적용됩니다.
