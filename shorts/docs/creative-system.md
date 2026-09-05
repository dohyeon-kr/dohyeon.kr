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

Choose by meaning, not a universal renderer ranking:

- Concrete subjects, places, actions, and atmosphere: photo / B-roll first.
- Quantitative change or relationships: graph, spatial diagram, simulation, or physical metaphor.
- Icons: only when they communicate more clearly; record the specific reason.

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

## 사진과 풀블리드 선택 및 수정 검수

- 생성과 수동 수정 모두 같은 규칙을 적용한다. 대본을 바꾸거나 장면을 복사할 때 기존 visual/layout/image를 그대로 유지하지 말고 새 의미에 맞는지 다시 판단한다.
- 구체적인 사물·장소·행동의 질감과 맥락이 핵심이면 실제 사진/B-roll을 우선한다. 문·문고리·방을 단순 문 아이콘으로 치환하지 않는다. 관계·수치·변화 자체를 설명해야 하면 도식·그래프·시뮬레이션을 사용한다.
- 아이콘은 사진을 못 찾았다는 이유만으로 선택하지 않는다. 사진이나 도식보다 명확한 정보를 전달하는 경우에만 사용하고 strategy.rationale에 이유를 기록한다. 모든 장면을 도식으로 만들지 않는다.
- 사진이 공간감·정서·구체적 맥락을 전달하는 장면은 photo-full-bleed를 우선 검토한다. 영상당 1~2회 같은 일률적인 상한을 두지 않는다. 문고리 클로즈업 → 열린 문 → 빈 방처럼 피사체와 샷 크기로 리듬을 만든다.
- 사진과 설명을 분리해야 가독성이 좋아지는 경우에 photo-strip/split을 선택한다. 레이아웃 종류를 채우기 위한 변주는 하지 않는다.
- 흑백/명암 정규화와 어두운 오버레이를 사용하되 피사체가 사라질 정도로 덮지 않는다. 9:16 크롭에서 문고리·문틀 등 의미를 전달하는 부분이 남는지 확인한다. 제목과 자막은 피사체·밝은 부분·플랫폼 UI와 충돌하지 않게 한다.
- 검색어만 넣고 사진 적용 완료라고 하지 않는다. 실제 image URL, 출처, 제작자, 라이선스를 확보한다. 사진 다운로드 실패를 아이콘으로 조용히 대체하지 않는다.
- 최근 릴스와 이미지 원본 URL/ID를 비교해 의도하지 않은 재사용을 피한다. 특히 도입 이미지는 같은 사진을 재사용하지 않는다.
- 수정 후 narration·beats뿐 아니라 visual.type, layout, image, visualIntent, choreography, visualCue를 함께 검토하고 읽기용 Markdown을 다시 생성한다.
- 검수 시 사진 장면 수, 풀블리드 장면 번호, 남아 있는 symbol의 사유를 확인한다. 실제 스토리보드와 중간 프레임에서 크롭·한글 가독성·겹침을 확인하고, 미확인 항목은 완료로 보고하지 않는다.

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


## 실행 가능한 레이아웃 규칙 (하드 게이트)

지침 중 아래 수치 규칙은 권고가 아니라 생성·렌더 실패 조건이다. 실패를 텍스트 장면이나 다른 엔진으로 바꿔 숨기지 않는다. 오류의 장면/노드/시간을 보고 문구·노드 크기·배치를 수정한다.

| 규칙 | 실행 위치 | 실패 조건 |
| --- | --- | --- |
| 도식 라벨 크기·내부 여백 | 공유 nodeLabel | 24px 이상, 줄 높이 1.5, 좌우 0.5em·상하 0.35em 공간을 확보할 수 없음 |
| 텍스트 수용량 | 공유 fitCopy | 지정 영역에 최소 크기까지 내려도 들어가지 않음; 원문을 넘친 채 반환하지 않음 |
| 안전영역 | 도식 프레임 검사 | 선 두께·회전·확대를 포함한 도형 또는 라벨이 800×560의 40-unit inset을 벗어남 |
| 라벨 겹침 | 도식 프레임 검사 | 각 라벨에 0.25em을 더한 보호영역끼리 교차 |
| 텍스트 침범 | 도식 프레임 검사 | 선이 보호영역을 통과하거나 다른 불투명 도형이 라벨 영역을 침범 |
| 선의 점 상태 | 도식 프레임 검사 | 보이는 선의 길이가 6 units 미만. 등장 전 opacity=0, 전체 길이를 유지한 fade 사용 |
| 연결점 | 공유 좌표 평가 | connector의 source/target과 면·gap으로 매 프레임 계산. 연결선의 별도 위치·크기·회전·scale 이벤트 금지 |
| 실제 장면 텍스트 | 폰트 로딩 후 DOM 검사 | 제목·보조문구·비교 문구·자막 겹침, 도식 영역 침범, 캔버스 이탈, 자막 예약 영역 초과 |

연결 관계를 표현하는 line은 connector를 지정한다. 일반 기준선은 null이다. source/target은 rect/circle ID, sourceSide/targetSide는 left/right/top/bottom, gap은 2~40이다. 연결된 객체가 숨겨져 있으면 선도 숨긴다. 연결선은 객체 이동·확대·회전과 물리 계산 결과를 따라간다. 직선이 다른 불투명 객체를 통과하면 자동 우회 대신 배치를 수정한다. 화살촉은 현재 공통 문법에 없으며 추후 지원 시 선 진행률·충돌 경계에 포함해야 한다.

생성 및 렌더 준비 단계는 101개 정규화 시점과 모든 이벤트 시작/중간/종료 및 경계 직전·직후를 검사한다. 두 엔진은 실제 렌더되는 매 프레임을 다시 검사한다. 샘플 사전검사만 통과한 것을 전체 프레임 검증으로 보고하지 않는다. 렌더 단계 DOM 검사는 폰트 로딩 완료를 기다린다.

도형끼리의 중첩은 영역·해칭·물리 비유에 필요하므로 일괄 금지하지 않는다. 대신 라벨 침범은 허용하지 않는다. 전역 skip/ignore 옵션을 만들지 않는다. 도식의 텍스트 폭은 보수적 추정치이며 원·회전 영역도 보수적으로 검사한다. 도식 내부 실제 글리프 ink bounds, 사진 피사체/크롭, 선의 의미, 심미적 균형, 휴대폰 가독성, 장면 전환의 시각적 자연스러움은 실제 프레임 리뷰를 계속한다. DOM 검사는 지정된 텍스트 역할에 적용되며 모든 장식·외부 프리셋 내부 요소를 검증했다고 주장하지 않는다.

기존 후보도 다시 렌더하면 같은 게이트를 통과해야 한다. 기존 산출 영상을 자동 수정한 것으로 취급하지 않는다.

## 레이어 역할과 가림 관계 — 지침 리뷰

레이어 순서의 적절성은 의미 기반 리뷰 항목이다. z-index 숫자나 도형 종류만으로 일괄 합격/불합격을 정하지 않는다.

- 기본 순서는 배경/사진 → 영역 채움·해칭·그리드 → 연결선 → 주요 객체 → 라벨·주석 → 핵심 강조·자막이다. 사진 위 제목처럼 의도된 중첩은 허용한다.
- 각 장면 visualStory.invariant 또는 choreography에 주요 앞뒤 관계를 명시한다. 예: “연결선은 카드 뒤, 한글 라벨은 해칭 앞, 자막은 핵심 객체를 덮지 않는 별도 공간”. enum 밖 필드를 임의로 추가하지 않는다.
- 선이 노드 중심을 관통한 뒤 노드로 덮어 숨기는 배치는 금지한다. 선은 외곽 연결점에서 끝내고 레이어는 올바른 기하 배치를 보조한다.
- 그림자·밑줄·영역 강조는 해당 글자 뒤/아래에 둔다. 의미를 전달하는 라벨·화살촉·주석은 다른 장식 때문에 가려지지 않아야 한다. 강조 효과가 새 라벨이나 받침을 덮지 않게 한다.
- 생성·수동 수정·AI 리뷰 시 “반드시 보여야 하는 것 / 가려도 되는 것 / 앞뒤 관계가 바뀌는 시점”을 확인한다. 각 위반은 장면·객체·시점·가림 관계·수정 제안으로 기록한다. 위반 없음과 미확인을 구분한다.
- 초기·이동 중·최대 확대·완료·전환 상태에서 관계를 다시 확인한다. 완료 프레임만 보고 레이어를 승인하지 않는다.
- 현재 도식은 nodes 배열 순서대로 그리므로 뒤에 있는 노드가 위에 놓인다. 생성 시 이 순서를 역할에 맞게 배치한다. 엔진이 배열을 도형 종류로 자동 재정렬하지 않는다. 도식 라벨은 현재 각 노드와 같은 그룹에 있으므로, 후속 노드가 기존 라벨을 가리지 않는지 특히 검토한다.

하드 검사는 텍스트·선·불투명 객체의 충돌을 보수적으로 검출할 뿐, 의미상 옳은 레이어 순서를 판정하는 대체재가 아니다. AI 리뷰에서는 이 섹션의 관계를 직접 평가한다.

## 분량과 소주제 구성

기본 구성은 6~9장이다. 원문에 충분한 근거와 독립적으로 설명할 소주제 3개가 있으면, 하나의 중심 논지를 발전시키는 확장 구성을 선택할 수 있다.

- 확장 구성: 소주제 3개 × 각 6~7장, 총 18~21장을 하나의 영상으로 구성한다. 전체 도입과 최종 결론도 이 수에 포함한다.
- 각 소주제는 도입 → 설명·사례 → 작은 결론으로 완결하며, 따로 떼어도 이해되어야 한다. 앞 소주제의 결론은 다음 질문으로 연결한다.
- 챕터 시작은 짧은 소주제 제목과 의미 있는 화면 전환으로 구분한다. 기존 headline/choreography를 사용하고 임의 스키마 필드를 추가하지 않는다.
- candidate.rationale에 확장 선택 근거와 소주제별 제목·장면 범위를 기록해 리뷰할 수 있게 한다.
- 기본 분량을 일괄 늘리지 않는다. 세 소주제를 채우기 위한 반복, 근거 없는 사례, 억지 분량 늘리기를 금지한다. 근거가 부족하면 기본 구성과 그 이유를 제시한다.
- 확장 영상에는 기본 30~55초를 강제하지 않는다. 자연스러운 낭독과 설명 시간을 확보하며 실제 길이는 TTS/렌더 결과로 확인한다.
- 후보 개수(candidate_count)는 독립적인 영상 후보의 수다. 한 후보 안의 세 소주제와 혼동하지 않는다.
