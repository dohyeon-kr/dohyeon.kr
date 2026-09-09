# Blog → Shorts pipeline

`shorts/` turns a published `dohyeon.kr` Ghost post into multiple short-form video candidates, keeps human review in the middle, then renders only explicitly selected candidates.

The creative target is a **motion infographic**, not a templated AI slideshow. See [`docs/creative-system.md`](docs/creative-system.md) for the canonical visual, motion, subtitle-rhythm, and asset policy.

For the end-to-end operating procedure, approval checklist, engine routing, output locations and known limitations, see [제작·승인·렌더 운영 가이드](docs/production-workflow.md).

## Flow

1. Run **Generate blog shorts** from GitHub Actions with a `dohyeon.kr` post URL.
2. Inside the generation action, Astra Light analyzes source evidence and locks each script, Sol Light composes scene JSON, and Astra Light reviews and minimally corrects the JSON. See [3단계 생성 지침](docs/generation-stages.md). No preview, TTS, or render is added to these model stages.
3. Every scene receives semantic subtitle beats, a visual relationship, a visual strategy, a layout, element choreography, camera motion, and a scene transition.
4. Photo scenes receive a relevant Openverse search result. The default resolver only accepts CC0 or Public Domain Mark results.
5. The workflow converts candidate JSON into readable `candidate-XX.md` storyboards, builds a linked README index, and opens a review PR containing both. Each storyboard presents narration, screen copy and layout, visual relationships, diagram changes, camera/transition direction, and subtitle emphasis/pacing in scene order. No additional model call or TTS is needed. The Actions summary and PR body link to the candidate index for mobile review.
6. PR creation and code updates run typechecks and unit tests only. Editing candidate checkboxes or merging a PR never generates previews. For silent previews, manually run **Shorts pipeline check**, check `generate_previews` (default off), and optionally enter a candidate `manifest`.
7. Manually run **Build blog shorts storyboard** with a `manifest` and check `generate_previews` (default off) to create representative PNGs, a two-column mobile contact sheet, and a scene-by-scene PDF. Select the branch that contains the candidate. Template preview publishing is also manual and checkbox-gated.
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

The generator prioritizes continuity over layout variety. Captions carry the language; central headlines are empty by default, and diagrams keep only essential labels.

## Motion

Scene transitions and element animations are separate layers. The generator emits an ordered `choreography` for meaningful in-scene events and a `camera` instruction for viewpoint changes.

Scene transitions support 20 types and light effects support 11 types, including path-following glow pulses. See [the transition and light-effect catalog](docs/transitions-and-effects.md) for executable scene fields, target rules, examples, and preview commands. Element motion remains restrained: fade, slide, scale, reveal, draw, zoom, and pan. Bounce, spin, elastic, and decorative overshoot are excluded by default.

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

- Generation stages are fixed to `gpt-6-astra` → `gpt-5.6-sol` → `gpt-6-astra`, all with `reasoning.effort: low`. `SHORTS_TEXT_MODEL` does not override them.
- `SHORTS_TEXT_MODEL` still configures existing diagram repair (default `gpt-6-astra`; ordinary repair `low`, redesign `medium`). Other workflows retain their own existing model configuration.
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
2. 선택 체크박스는 후보 기록용입니다. PR 생성·수정·체크 변경·머지만으로 프리뷰가 만들어지지 않습니다.
3. 무음 프리뷰가 필요하면 **Shorts pipeline check → Run workflow**에서 후보가 있는 브랜치를 선택하고 `generate_previews`를 체크한 뒤 `manifest` 경로를 입력합니다. 결과는 `shorts-candidate-review-<run_id>` 아티팩트로 받습니다. 체크하지 않으면 검증만 실행합니다.
4. 스토리보드 Draft Release는 **Build blog shorts storyboard**에서 `manifest`를 입력하고 `generate_previews`를 체크해 수동 생성합니다. 템플릿 공개 프리뷰도 별도 수동 실행 + 같은 체크박스가 필요합니다. 모두 기본 해제입니다.
5. 검토를 마치면 **Render blog shorts → Run workflow**에서 선택한 후보 JSON 경로를 넣고 `storyboard_approved`를 체크합니다. 최종 음성·영상은 이 단계에서만 생성됩니다.

선택 상태는 PR 본문의 `shorts-selection` 구간에 기록하되 렌더 트리거로 사용하지 않습니다. 수동 실행의 `manifest`가 실제 프리뷰 대상을 결정합니다. 워크플로 변경을 main에 병합해야 기본 브랜치에서도 새 수동 실행 옵션이 보입니다.

## 스토리보드 AI 리뷰

스토리보드 생성 후 선택 코멘트를 반영해 OpenAI가 리뷰하고 개선 PR을 만듭니다. [실행 방법과 검증 범위](docs/storyboard-review.md)를 참고하세요.

## Ghost 대표 이미지 자동 생성

관리자나 API에서 저장한 글에 대표 이미지가 없으면 기존 도식 렌더러로 커버를 만들 수 있습니다. [적용 범위와 활성화 방법](docs/ghost-feature-images.md)을 참고하세요. Draft 상태와 기존 대표 이미지는 유지합니다.

## 생성 시 추가 요청과 확장 구성

**Generate blog shorts → Run workflow → additional_request**에 선택적으로 강조점·관점·어조·구성을 입력할 수 있습니다. 비워 두면 기존 기본 동작을 유지합니다. 최대 4,000자이며 초과하면 API 호출 전에 실패합니다.

예: “조직이 판단을 위임하는 기준이라는 질문에 집중해줘. 필요한 근거는 보존하고, 연고주의처럼 별도 설명이 필요한 논점은 다른 후보로 분리해줘.”

기본 6~9장/확장 18~21장은 참고 범위입니다. 같은 질문을 심화할 때만 확장하며, 장수나 세 부분을 채우기 위해 늘리지 않습니다. 공통 CTA는 본문 뒤 별도로 붙습니다. 후보 수는 페이지/소주제 수와 별개입니다. 로컬에서는 SHORTS_ADDITIONAL_REQUEST 환경변수를 사용합니다.

추가 요청은 생성 단계의 환경변수로만 전달하며 셸 소스에 보간하지 않습니다. 모델에는 시스템 지침과 분리된 JSON의 editorialRequest로, 원문은 sourceArticle로 전달합니다. 추가 요청은 콘텐츠 편집만 지시하며 사실 근거·스키마·검증·승인 규칙을 덮어쓸 수 없습니다. 모델 호출에는 실행 도구나 비밀 값을 제공하지 않습니다. 구조화 출력과 기존 검증·사람의 승인 절차를 유지합니다. JSON 분리와 프롬프트만으로 인젝션을 완전히 방지하는 것은 아니므로 결과의 사실성과 요청 준수 여부도 리뷰해야 합니다.
