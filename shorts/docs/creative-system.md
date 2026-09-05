# Shorts creative system

The shorts pipeline is designed as a **motion infographic generator**, not an AI slide generator.

The core translation is:

> Meaning → visual relationship → visual strategy → choreography

A scene should not merely decorate a sentence. It should explain the sentence through spatial change, motion, comparison, or a concrete visual anchor.

## Pipeline

```text
Script
→ semantic beats
→ emphasis / rhythm map
→ scene split
→ art direction
→ visual relationship
→ visual strategy
→ asset resolution or direct rendering
→ style normalization
→ layout composition
→ element choreography
→ camera movement
→ subtitle animation
→ scene transition
→ render
```

## Art direction

Default preset:

- monochrome
- editorial
- sharp
- minimal
- tech
- black / charcoal base
- white primary type
- gray secondary lines and labels
- low-saturation or grayscale source photography
- restrained motion vocabulary

Raw assets do not define the mood. Every asset is normalized into the same visual language at render time.

### Normalization policy

- Photography: grayscale, controlled contrast, no warm stock-photo look.
- Icons: one stroke/fill family per video.
- Illustrations: do not mix unrelated illustration styles inside one video.
- Graphs and diagrams: prefer first-party rendering so font, stroke, radius, and animation remain consistent.
- Motion: fade, slide, scale, reveal, draw, zoom, pan. Avoid bounce, spin, elastic, and ornamental overshoot.
- Texture: optional subtle grain only when it helps unify mixed sources.

## No meaningless template decoration

Do not render template labels such as:

- `PHOTO / PHOTO`
- `IMAGE`
- `VIDEO`
- `STATEMENT / LEVERAGE`
- `VISUAL / ROI-CURVE`

Also avoid decorative boxes, quote marks, English captions, counters, or UI fragments that exist only to make the frame look designed.

Every visible element must do at least one job:

1. communicate information
2. emphasize meaning
3. provide context
4. guide attention
5. control rhythm

Otherwise remove it.

## Visual resolver

Do not map a keyword directly to an icon. First identify the relationship in the sentence.

Preferred strategy order:

1. simulation
2. graph
3. spatial diagram
4. physical metaphor
5. photo / B-roll
6. icon fallback

Examples:

| Concept | Weak fallback | Preferred expression |
| --- | --- | --- |
| leverage | rising arrow | lever / seesaw: small force lifts a large load |
| ROI / efficiency | arrow | input-output curve or comparative curve |
| trade-off | scale icon | balance that actually tilts |
| bottleneck | warning icon | flow accumulating at a narrow gate |
| accumulation | stack icon | objects or values visibly stacking |
| convergence | target icon | multiple paths moving toward one point |
| zoomed learning | magnifier icon | overview → camera zoom into one region |
| network effect | network icon | nodes increase while edges grow faster |

### Graph-first cases

Prefer graphs for:

- change over time
- cumulative effects
- efficiency
- ROI
- widening gaps
- relative slopes
- diminishing returns
- before/after trajectories

Graphs should animate. A useful pattern is:

`overview → curve reveal → endpoint/inflection zoom → annotation`

## Motion and choreography

Scene transitions and element animations are different layers.

A scene should normally contain 1–3 meaningful motion events rather than making every element move continuously.

Canonical choreography events:

- `show-visual`
- `show-headline`
- `show-subline`
- `advance-visual`
- `camera-focus`
- `emphasize-result`

The model may add a meaningful kebab-case event when needed.

Important rule:

> Translate verbs into motion.

If narration says something expands, the visual should expand. If it accumulates, it should stack. If it bottlenecks, flow should visibly slow or queue. If the script says to inspect a detail, the camera should move into that detail.

## Camera motion

Camera motion is separate from element motion.

Use camera movement for semantic changes in viewpoint:

- overview → detail
- full graph → endpoint
- full graph → inflection point
- system map → one node
- whole object → meaningful mechanism

Keep ordinary scenes static or use a subtle push-in. Zoom is not decorative punctuation.

## Subtitle rhythm

Subtitles are treated as a **rhythm score**, not a character-count split.

Each semantic beat carries:

- text
- emphasis: `low | mid | high`
- delivery: `normal | push | hold | drop`
- pause after the beat
- visual priority
- optional keyword
- optional visual cue

Rules:

- Split by meaning, not morphology.
- Avoid fragments like `그럴 / 수 / 있다`.
- Prefer at least four non-space Korean characters per beat.
- A short punch word may stand alone when the separation is intentional: `없다`, `아니다`.
- Do not mark everything as high emphasis.
- Prefer 1–2 high-emphasis beats per sentence.
- Conclusions, contrast, numbers, reversals, declarations, and core concepts are the strongest emphasis candidates.

Subtitle emphasis should affect the visual treatment as well as timing. A high-emphasis beat can become slightly larger, enter more decisively, or invert its keyword. Avoid karaoke-like word-by-word popping.

## Asset sources

Current automated photo resolution uses Openverse with CC0 / Public Domain Mark filtering.

Useful source pools for future resolvers or manual review:

### Photo / B-roll

- Pexels
- Coverr
- Mixkit
- Pixabay

### SVG / icon

- SVG Repo
- Icons8
- Flaticon

### Motion / illustration

- LottieFiles
- Storyset
- unDraw

### SFX / motion templates

- Mixkit
- Pixabay
- Motion Array
- Envato Elements
- Artlist

These sources are **material pools, not style systems**. Imported assets still pass through the art-direction and normalization policy above. License checks remain mandatory for every source actually integrated into automation.

## Schema v3

New candidate manifests add:

- `beats`
- `visualIntent`
- `choreography`
- `camera`
- expanded style metadata

Older v1/v2 manifests remain renderable through existing fallbacks.

## Diagram storytelling and contact-sheet review (2026-09-05)

Each diagram scene records `visualStory`: initial state, trigger, change, invariant,
and result. These are review instructions; actual behavior lives in diagram events.
Reuse coordinates and responsibility regions across related scenes. A photo quota or
layout rotation must not interrupt an explanatory before/after sequence.

- Dashed strokes mark responsibility boundaries; label their meaning.
- Hatching marks an overlap or constrained area. Keep text on a clear layer.
- A single pulse marks an event; a travelling dot marks propagation. Avoid idle loops.
- Animate width/height plus position for anchored area changes, not text scale.
- Finish the explanation by roughly 75% of the scene and hold the result.
- Keep diagram labels short and legible, with primary boxes roughly 180–240 units wide.
- Remove redundant sublines. Keep caption size stable; use restrained dark plates and
  an inverse keyword rather than a competing full-white caption block.
- Changes staying behind a frontend boundary assume the public contract is maintained.

Storyboards retain the one-result-per-scene sheet and add a three-column motion sheet
(initial / change / result). Release notes include these states and downloadable sheets.
Static frames demonstrate layout and sampled states, not audio timing or smooth motion.

## 한글 간격과 겹침 방지

한글 텍스트는 Pretendard의 실제 렌더링 크기와 받침 영역을 기준으로 배치한다. 영문 글자 폭이나 글자 수만으로 공간을 확정하지 않는다. 다음 수치는 초기 배치 기준이며 실제 프레임 검수로 조정한다.

- 여러 줄 본문은 줄 높이 1.5~1.7배를 출발점으로 삼는다. 제목·도식 라벨은 각 영역에 맞게 조정하되 받침과 다음 줄이 닿거나 고정 높이에 잘리지 않게 한다.
- 밑줄의 위쪽 가장자리와 실제 글자 하단 사이에 글자 크기의 0.12~0.18배 이상 여백을 먼저 확보한다. 밑줄 두께, 받침, 강조 확대를 포함해 확인하며 여러 줄 문구는 줄마다 별도로 배치한다.
- 백엔드 연결 등 도식의 연결선은 노드 외곽에서 시작하고 끝나게 한다. 한글 라벨의 실제 경계에 최소 0.25em의 보호 여백을 더한 영역을 선과 화살촉이 통과하지 않게 한다. 선 위 설명은 선과 분리된 공간에 둔다.
- 노드 안쪽은 좌우 최소 0.5em, 상하 최소 0.35em 여백을 초기 기준으로 확보한다. 긴 라벨은 의미 단위로 줄바꿈하고 노드와 주변 간격을 늘린다. 글자 크기를 무조건 줄여 해결하지 않는다.
- 제목·보조 문구·도식·자막과 밑줄·연결선의 공간을 함께 예약한다. 이동·확대·등장 효과의 중간 상태에서도 텍스트 보호 영역을 침범하지 않게 경로와 간격을 정한다.
- 대표 스틸만으로 승인하지 않는다. 밑줄 등장 전·중간·완료, 연결선 그리기 중간·완료, 노드 이동·확대의 최대 점유 순간과 장면 전환을 실제 한글로 확인한다. 받침이 있는 문구, 긴 라벨, 여러 줄 제목을 포함하고 최종 1080×1920 영상과 휴대폰 크기 미리보기 모두에서 겹침·잘림을 검수한다.

이 지침은 생성 프롬프트와 수동 수정에 모두 적용한다. 프롬프트 준수만으로 기존 영상의 문제가 해결됐다고 판단하지 않으며, 기존 후보는 실제 재렌더 검수가 필요하다.
