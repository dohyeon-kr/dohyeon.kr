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

## 영상 배경 선택과 연출

영상 배경은 페이지 지면 전체 또는 지정 영역에 B-roll을 재생하고 그 위에 제목·도식·자막을 합성하는 방식이다. 움직임이 행동·공간·정서의 이해를 돕는 경우에 선택한다. 모든 사진을 영상으로 바꾸거나 영상 장면 수를 할당하지 않는다. 상세 작성·검수 절차는 [영상 배경 가이드](video-background-guide.md)를 따른다.

- 도입·마무리에는 문이 열리는 모습, 빈 방의 빛 변화 등 논지와 연결되는 샷을 우선 검토한다. 설명 장면에는 낮은 움직임과 텍스트용 여백을 확보한다. 복잡한 도식에는 정적인 배경이나 승인된 정지 프레임을 우선한다.
- 풀블리드는 공간과 분위기가 핵심일 때 선택한다. 피사체와 설명을 분리해야 읽기 쉬우면 분할 영역을 사용한다. 빠른 팬·흔들림·번쩍임·의미 없는 반복 동작을 피한다.
- 배경 영상 → 명암 오버레이 → 도식 영역/연결선/객체 → 라벨·제목 → 자막을 기본으로 검토한다. 주요 피사체와 자막 공간을 분리하고 기존 레이어·한글 보호 여백 규칙을 지킨다.
- 모노크롬·명암을 통일하되 피사체를 잃지 않는다. 영상의 가장 밝은 순간과 피사체 이동 중에도 글자가 읽혀야 한다. 필요하면 국소 그라데이션이나 텍스트 뒤 안정된 판을 사용한다.
- 배경이 재생되는 동안 텍스트는 의미 단위로 순차 등장할 수 있다. 배경의 큰 움직임과 핵심 자막/도식 강조를 동시에 경쟁시키지 않는다. 원본 카메라가 움직이면 추가 줌·팬을 기본적으로 생략한다.
- 장면 길이에 맞는 사용 구간을 먼저 고른다. 루프는 이음새가 자연스러울 때만 사용하고, 문 열기 같은 단발 행동을 반복하거나 역재생하지 않는다. 길이 부족을 무리한 감속으로 해결하지 않는다.
- 원음은 기본 음소거한다. 의미 있는 현장음은 별도로 선택·검수해 내레이션과 BGM을 가리지 않게 한다.
- 원본 출처·제작자·라이선스·재현 가능한 파일을 확보한다. 검색어/페이지 URL만으로 적용 완료라 하지 않는다. 영상 실패를 사진이나 아이콘으로 조용히 대체하지 않는다.
- 대표 스틸 외에 시작·중간·끝, 최대 밝기/움직임, 루프와 장면 전환 경계 및 실제 TTS 길이의 재생을 확인한다. 스틸 검수와 영상·오디오 검수 결과를 구분한다.

backgroundVideo는 등록 영상의 assetId, 구간, 속도, 크롭, 오버레이, 명시적 반복 여부를 지원한다. shorts/media/videos.json에 등록된 소스만 사용하며 실제 파일은 해시·디코딩·길이를 확인한 뒤 원음을 제거해 합성한다. 현재 풀블리드·흑백·그라데이션 오버레이를 지원하며 분할 영상·현장음·정지 프레임 유지는 지원하지 않는다. 미확보 영상은 제안으로만 적고 없는 ID/URL을 만들지 않는다. 사진과 동시 사용하지 않고 카메라는 static으로 둔다.

## 훅과 결론의 순서

- 커버/첫 장면은 최종 결론을 선언하는 포스터가 아니라, 그 결론이 필요해지는 문제를 여는 장면이다. 결론보다 질문·모순·관찰을 먼저 둔다.
- 가능하면 시청자가 다음 답을 궁금해하도록 짧고 구체적인 질문으로 시작한다. 질문은 낚시가 아니라 이후 설명과 결론으로 이어지는 인과의 첫 고리여야 한다.
- `핵심은 X다`, `승부처는 X다` 같은 결론형 문장을 강한 훅으로 착각하지 않는다. 핵심 주장은 근거가 쌓인 뒤 또는 마지막에 둔다.
- 2~3장 안에서 도입 질문의 원인이나 현상을 설명하기 시작하고, 결말에서는 도입의 질문을 회수해 답한다.
- 질문의 대상이 AI 화면, 사람, 제품, 장소처럼 사진으로 즉시 식별 가능한 구체적 대상이면 첫 장면부터 photo-full-bleed 또는 photo-split을 우선 검토한다. 의미 있는 사진을 질문형 타이포로 제거하지 않는다. 단, 사진이 질문의 의미를 구체화하지 못하면 타이포만 사용하는 편이 낫다.
- 예: `AI의 글, 왜 읽고 싶지 않을까?` → 평균화와 경험 손실을 설명 → 위임 경계와 평가 환경이라는 결론.

## 비정형 도형과 형태 모핑

- `blob`은 원/타원의 둘레를 결정적 노이즈로 왜곡한 유기적 비정형 도형이다. 고유함, 불완전함, 예외, 모호한 경계처럼 ‘정형화되지 않음’ 자체가 의미일 때 사용한다. 장식용 배경 얼룩으로 남발하지 않는다.
- 형태는 `seed`, `points`, `frequency`로 정체성을 고정하고 `noiseAmount`로 왜곡 강도를 조절한다. 같은 대상을 변화시키는 장면에서는 seed/points/frequency를 바꾸지 않는다.
- 고유함 → 평균화, 불완전함 → 정리, 다양성 → 표준화 같은 의미는 **같은 blob의 `noiseAmount`를 낮춰 원/타원에 가까워지는 모핑**으로 표현한다. 예: 0.26 → 0.03. 반대 의미는 0.02 → 0.24처럼 증가시킨다.
- 단순 scale/opacity crossfade로 형태 변화를 흉내내지 않는다. 경계 자체가 연속적으로 변해야 한다. 모핑은 장면 중반까지 진행하고 마지막 20~25%는 결과 형태를 읽는 시간으로 둔다.
- `noiseAmount=0`은 사실상 정형 원/타원이며, 값이 커질수록 경계가 비정형화된다. 너무 높은 값은 의미보다 시각적 소음이 커지므로 일반적으로 0.18~0.32를 우선하고 0.45는 상한으로만 본다.
- 라벨은 blob 내부의 보수적인 원형 안전영역 안에 둔다. 경계 요철과 라벨이 경쟁하면 도형을 키우거나 문구를 축약한다. 연결선은 blob의 bounding box 외곽에 anchor되므로 강한 왜곡에서는 충분한 gap을 둔다.
- 예: ‘한 사람의 고유한 경험’ = 서로 다른 seed의 blob들. ‘AI가 평균으로 수렴시킨다’ = 각 blob의 seed를 유지한 채 noiseAmount를 낮춰 매끈한 원에 가깝게 만든다. 여러 개체가 하나의 평균으로 수렴하는 장면은 위치/불투명도/연결 구조까지 함께 써 의미를 명확히 한다.

## Motion and choreography

### 발표자 캐릭터

공개 계약과 프리셋 선택 기준은 [presenter-api.md](presenter-api.md), 기계 판독 스키마는 [presenter.schema.json](presenter.schema.json)를 따른다. 생성과 리뷰가 같은 GeneratedPresenterSchema를 공유한다. 직접 설명·질문하는 화자가 도움이 될 때만 presenter-bust 레이아웃을 선택하고 기존 사진·도식의 정보 전달을 대체하지 않는다. 이 레이아웃은 흰 배경과 원형 바스트, 제목·자막 분리 영역을 실제로 렌더한다. 공통 CTA에는 삽입하지 않는다.

candidate는 동작/표정/시점을 지정한다. 현재 디자인은 손 없는 바스트이며 action은 작은 고개 반응만 표시한다. 새 후보는 idle/explain/emphasize 중심으로 작성하고 hand=null을 사용한다. 이전 손 필드는 호환용이며 화면에 손을 표시하지 않는다. 카라·둥근 눈썹·얕은 회색 명암으로 단순한 실루엣을 유지한다. 팔 관절이나 임의 SVG를 만들지 않는다. 발음 시간 정보 없이 mouths를 추측하지 않는다. 모든 시간은 장면 시작 기준 초, 같은 트랙 내 중첩과 실제 장면 범위 초과는 검증 오류다. 입력이 없는 입모양은 표정의 기본 입을 사용한다. 일반 후보의 presenter는 null이다.

Scene transitions and element animations are different layers.

For the expanded vocabulary, use [트랜지션·라이트 효과 사전](transitions-and-effects.md): 20 transition definitions and 11 light-effect definitions, including blur, directional blur, zoom blur, light wipe, light sweep, glow, light leaks, and path-following pulse halos (`flow-glow`). All catalog IDs are rendered; match-cut requires matching adjacent diagram geometry. Candidate manifests may include optional transitionOptions and effects, validated before rendering. It also defines intended use, timing, compositing, and Korean text protection.

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
- 현재 도식은 nodes 배열 순서대로 그리므로 뒤에 있는 노드가 위에 놓인다. 생성 시 이 순서를 역할에 맞게 배치한다. 엔진이 배열을 도형 종류로 자동 재정렬하지 않는다. 도식의 도형은 배열 순서대로 그리며, 라벨은 공통 상위 레이어에서 같은 노드 변환을 따라간다. 라이트 효과가 라벨을 덮지 않게 하고, 후속 객체와 라벨의 의미상 가림 관계도 검토한다.

하드 검사는 텍스트·선·불투명 객체의 충돌을 보수적으로 검출할 뿐, 의미상 옳은 레이어 순서를 판정하는 대체재가 아니다. AI 리뷰에서는 이 섹션의 관계를 직접 평가한다.

## 분량과 소주제 구성

기본 6~9장/확장 18~21장은 참고 범위다. 장수보다 한 질문과 답의 완결성을 우선한다.
같은 질문의 답을 심화할 때만 확장하고 candidate.rationale에 이유를 기록한다.
독립 질문과 별도 결론이 필요한 소주제는 다른 후보로 분리한다. 세 부분을 채우거나
챕터 제목·전환 효과로 논리 비약을 덮지 않는다. 필요한 전제와 근거는 남긴다.
실제 길이는 TTS/렌더에서 확인하며 후보 개수는 장수와 별개다.

## 자막 중심 구성과 단계별 생성

[3단계 생성 지침](generation-stages.md)을 생성과 JSON 리뷰에 적용한다.
자막을 주된 언어 전달 수단으로 삼고 headline은 기본 빈 문자열, subline은 null이다.
중앙 타이포는 특별한 질문·결론 강조만 허용한다. 사진·영상·도식은 해당 설명에 필요할 때
선택하고 중앙을 매번 채우지 않는다. 도식 글자는 식별용 짧은 라벨과 필요한 수치만 남긴다.
설명문은 내레이션/자막이 담당한다. 프레젠터는 직접 질문·정리하는 순간에 선택한다.
각 요소가 유용해도 동시에 필요하지는 않다. 순간의 중심 시각 요소를 하나 정한다.
큰 고정 자막·최대 두 줄·중복 타이포 통합은 연출 목표이며 현재 JSON에 없는 크기/숨김
필드를 만들지 않는다. 실제 렌더러 변경·시각 검수와 JSON 설계 검토를 구분한다.

## 생성 도식 자동 수정

후보 생성 중 도식 스키마·레이아웃 검증에 실패하면 해당 장면과 현재 오류(노드·시간 포함)를 AI에 전달해 diagramSpec만 최대 8회 수정한다. 대본·자막·다른 장면은 코드에서 보존한다. 매 수정 후 동일한 스키마 및 중간 상태 레이아웃 검증을 다시 수행한다. 라벨 삭제·투명화로 문제를 숨기지 않고 의미와 사건을 유지한 채 배치·크기·이동 경로를 수정한다. 시도 횟수와 검증 오류는 Actions 로그에 남긴다. 재시도 소진 또는 API 실패 시 장면 정보와 마지막 오류를 보고하고 중단하며 텍스트 장면으로 대체하거나 검증을 생략하지 않는다. 이 과정은 실제 렌더 프레임 리뷰를 대체하지 않는다.


자동 수정은 같은 Generate 작업 안에서 수행한다. 앞 3회는 부분 수정, 4~8회는 원래 의미와 사건을 유지한 배치 재설계로 전환하며 이전 오류 이력을 모두 전달한다. 작업 전체 AI 수정 호출은 최대 60회·40분 예산으로 제한한다. 후보 하나가 실패해도 나머지 후보를 검증하고, 실패가 남으면 PR 생성 전에 중단한다. 원본 계획, 장면별 진행 상태, 마지막 도식과 오류 이력은 성공·실패 모두 진단 아티팩트로 보존한다(14일). 체크포인트는 진단·복구용이며 재실행 자동 이어받기를 뜻하지 않는다. 실제 렌더 오류·권한 오류·코드 결함까지 무조건 자동 해결한다고 보장하지 않는다.

## 수사법과 마지막 문장의 설계

생성·수동 수정·스토리보드 리뷰에 함께 적용한다. 수사법은 정보의 초점을 잡는 편집 수단이다. 모든 문장을 꾸미거나 수사법별 할당량을 채우지 않는다. 사실·인과·조건을 보존하면서 도입, 전환, 마지막 문장 중 효과가 필요한 곳에 선택한다.

### 공유 맥락의 생략과 결말 강조

- 앞 장면에서 확립했고 지금도 하나로 복원되는 주체·수식어는 생략한다. AI를 다루는 영상에서 ‘위임 경쟁’이 이미 AI 위임을 가리킨다면 결말마다 ‘AI가 만든 결과물’을 되풀이하지 않는다. 첫 등장, 주체 전환, 따로 배포할 챕터의 시작에는 필요한 맥락을 다시 준다.
- 생략 후에도 누가 무엇을 하는지, 어떤 조건에서 성립하는지 같아야 한다. ‘일부’, ‘가능하다’, 비교 기준처럼 사실의 범위를 정하는 말은 극적 효과를 위해 지우지 않는다.
- 먼저 평서형으로 결론을 확정한 뒤, 이미 아는 화제를 앞에 두고 새 판단을 뒤에 놓는 안을 비교한다. ‘중요합니다’, ‘필요합니다’, ‘핵심입니다’ 같은 평가어로 끝내기보다 무엇에 달렸는지, 무엇을 해야 하는지 구체적으로 닫는다.
- 승인된 예: ‘위임 경쟁에서 이기려면, AI가 만든 결과물을 잘 평가할 수 있는 환경을 만들어야 합니다.’ → **‘위임 경쟁의 승패, 평가 환경에 달렸습니다’**. 앞 장면에서 기준·검증·거부권을 설명했기에 압축이 가능하다. 이 문구를 다른 주제의 만능 결말로 복제하지 않는다.
- 이 예의 직접적인 장치는 맥락 생략, 조사 생략에 따른 화제 제시, 쉼, 문장 끝의 초점 배치다. 엄밀한 어순 도치와 구분하되, 강조할 정보를 재배치한다는 편집 전략은 함께 활용한다. 쉼표만 넣은 문장을 모두 도치라고 부르지 않는다.
- 마지막에 새 논거나 더 강한 인과를 발명하지 않는다. 결말 뒤에 ‘이것이 핵심입니다’ 같은 해설을 덧붙여 여운을 풀지 않는다.

### 형태별 선택 전략

| 형태 | 쓰는 목적과 예시 | 피할 경우 |
| --- | --- | --- |
| 생략법 | 문맥으로 복원되는 반복을 줄인다. AI 맥락이 충분할 때 ‘AI 위임 경쟁’ → ‘위임 경쟁’. | 여러 주체가 경쟁하거나 단독 인용하면 의미가 달라질 때. |
| 도치법 | 평소 어순을 바꿔 특정 성분을 뒤늦게 부각한다. ‘우리가 지켜야 할 것은 판단입니다’ → ‘판단입니다, 우리가 지켜야 할 것은.’ | 번역체처럼 들리거나 한 번 듣고 이해하기 어려울 때. 일반 평서형과 낭독 비교한다. |
| 화제 제시와 종결부 초점 | 알려진 화제를 먼저 꺼내고 짧게 쉰 뒤 핵심 판단으로 닫는다. ‘위임 경쟁의 승패, 평가 환경에 달렸습니다’. | 화제가 아직 설명되지 않았거나 쉼만 늘어날 때. |
| 대조·대구 | 원문에 있는 차이를 같은 문장 구조로 드러낸다. ‘실행은 맡기고, 판단은 지킵니다.’ | 실제로 양립하는 개념을 억지 양자택일로 만들 때. ‘A가 아니라 B’ 공식을 반복하지 않는다. |
| 점층법 | 근거가 있는 범위·중요도의 상승을 배열한다. ‘한 문장을 고치고, 판단 기준을 고치고, 평가 환경을 바꿉니다.’ | 단순 나열을 상승으로 포장하거나 세 항목을 채우려 내용을 발명할 때. |
| 핵심어 회수 | 도입의 질문이나 핵심어를 결말에서 발전된 답으로 되받는다. 도입의 ‘승패를 가르는 것’에 결말의 ‘평가 환경’으로 답한다. | 같은 주장만 다시 말하고 논지가 진전하지 않을 때. |

예시는 형태를 보여주는 편집 예이며 사실 근거가 아니다. 가장 강한 기법 하나를 중심으로 쓰고, 생략·쉼처럼 보조 기능이 겹칠 때도 청자가 한 번에 뜻을 이해하는지 확인한다.

### 생성·수정·리뷰 체크

1. 마지막 문장의 평서형 의미와 앞 장면의 근거를 먼저 확인한다.
2. 이미 공유된 말과 반드시 남겨야 할 조건을 나눈다. 의미가 하나로 복원될 때만 생략한다.
3. 평서형과 수사적 변형을 비교하고, 더 명료하고 자연스러운 안을 선택한다. 수사법 사용 자체를 합격 조건으로 삼지 않는다.
4. narration·headline·beats·keyword를 함께 맞춘다. 위 예의 beats는 ‘위임 경쟁의 승패,’ / ‘평가 환경에 달렸습니다’로 나누고 후반을 high emphasis로 둔다. 쉼은 기존 pauseAfterMs 범위에서 조정한다.
5. 문구가 짧아지면 visualIntent·visualStory·choreography와 도식/사진의 의미, 자막 타이밍도 재검토한다. AI라는 말의 생략을 이유로 설명 도식의 AI 라벨까지 일괄 삭제하지 않는다. 읽기용 Markdown을 재생성하고 실제 낭독·렌더 확인 여부를 별도로 보고한다.

### 조사 근거와 적용 범위

- Gideon O. Burton, Brigham Young University, Silva Rhetoricae: [생략법](https://rhetoric.byu.edu/Figures/E/ellipsis.htm)은 문맥상 이해되는 말의 생략, [도치법](https://rhetoric.byu.edu/Figures/A/anastrophe.htm)은 강조를 위한 통상 어순의 변경으로 설명한다.
- 같은 자료의 [대조](https://rhetoric.byu.edu/Figures/A/antithesis.htm), [대구](https://rhetoric.byu.edu/Figures/P/parallelism.htm), [점층](https://rhetoric.byu.edu/Figures/C/climax.htm)을 형태 구분의 근거로 삼았다.
- Gopen & Swan, [The Science of Scientific Writing](https://www.gatsby.ucl.ac.uk/~pel/misc/gopen_swan.pdf), American Scientist (1990): 알려진 맥락과 강조할 새 정보를 배치하는 원칙을 참고했다. 영어 과학 글쓰기 논의를 한국어의 보편 법칙으로 단정하지 않는다. 여기의 화제 제시·종결부 초점·핵심어 회수와 한국어 예시는 숏폼 편집에 맞춘 적용 전략이며, 낭독의 자연스러움으로 최종 판단한다.


## 공통 블로그 CTA 엔딩

- 본문 결론 뒤에 공통 CTA 한 장을 코드로 추가한다. 기본 6~9장 / 확장 18~21장은 본문 분량이며 CTA는 별도 한 장이다.
- 생성·AI 리뷰는 본문만 작성한다. `commonPage: blog-cta-v1` 페이지는 공통 모듈이 추가·교체하며 중복되지 않는다. 본문의 마지막 결론 장면을 CTA로 대체하지 않는다.
- 공통 화면: “더 자세한 이야기는 / 블로그에서”, `blog.dohyeon.kr`, “프로필 링크에서 읽기”. 내레이션: “더 자세한 이야기는 블로그에 정리했습니다. 프로필 링크에서 읽어보세요.”
- 공통 CTA는 사진 필수 규칙의 예외다. 검정 배경에 큰 흰색 제목·URL·버튼을 가로·세로 중앙 정렬한다. 제목 100px, URL 60px, 버튼 문구 48px을 사용한다. URL에는 3px 점선 밑줄과 받침 여백을 둔다. “프로필 링크에서 읽기”는 흰색 직사각형에 검은 글자로 표시한다. 이 버튼 모양은 프로필 이동 안내이며 영상 내부의 실제 클릭 기능은 아니다.
- 최소 6초, 실제 내레이션 종료 후 최소 1.2초를 확보한다. 화면 문구는 고정하고 CTA 진입 시 글자를 포함한 페이지 전체에 600ms 블러 디졸브를 적용한다. CTA에서는 별도 자막을 겹쳐 띄우지 않는다.
- 스토리보드·최종 렌더·내레이션 텍스트에 같은 공통 페이지를 적용한다. 기존 후보도 다시 렌더하면 CTA가 붙는다. 이미 배포한 영상 파일은 바뀌지 않는다.
- 원문 링크는 기존 배포용 캡션에 유지한다. 실제 인스타그램 프로필의 블로그 링크 설정은 별도로 확인한다.

### 명시적으로 요청된 상시 발표자

우측 하단 상시 발표자를 요청받은 수동 후보는 presenter-api.md의 manifest-level presenterOverlay를 사용한다. 이 모드에서는 사진·도식 위에 발표자를 별도 레이어로 합성한다. hideOnCommonCta=true이면 공통 CTA에서 숨긴다. 장면마다 presenter-bust를 넣지 않는다. lipSync=word-timestamps와 nod=speech를 지정하면 최종 TTS 전사 시각에 맞춰 입과 고개 트랙을 생성한다. 단어 내부는 음절 기반 근사이며 실제 음성 검수가 필요하다. 무음 미리보기에서 발음 시점을 지어내지 않는다.


## 오답노트 테마: 프로그래밍 가능한 낙서와 스티커

명시적으로 이 테마를 선택할 때 diagramSpec.notebook에
`{"theme":"error-notebook","maxStickerOverlap":0.2}`를 넣는다.
검정 지면·파랑 한 색·밝은 본문을 사용한다. 렌더러는 종이 배경을 별도 레이어로
그리고, 도식 rect/circle/line의 외곽만 ID 기반의 고정된 낙서 선으로 표현한다.
위치·크기·회전·등장 시점·연결은 기존 nodes/events/connector로 제어한다.
같은 ID의 선 질감은 프레임마다 재추첨하지 않는다. 연결선은 전체 길이 fade를 유지한다.

스티커로 사용할 rect에만 `role: "sticker"`를 지정한다. 내용과 관련 없는 스티커는
넣지 않는다. 일반 객체를 스티커로 바꿔 검증 오류를 감추지 않는다.

- 겹침 비율 = 다른 보이는 도형과 교차한 **합집합 면적 / 해당 스티커 면적**.
  IoU가 아니며, 여러 요소가 같은 부분에 겹쳐도 중복 계산하지 않는다.
- 기본 허용량은 20%, 조절 범위는 0~40%. 20%까지 통과하고 초과하면 실패한다.
  모든 스티커를 각각 검사하므로 큰 스티커 뒤의 작은 스티커가 완전히 묻히면 실패한다.
- 면적은 회전·확대·선 두께를 적용한 보수적인 사각 footprint로 계산한다.
  PNG 알파/찢어진 실제 픽셀 면적을 계산한다고 주장하지 않는다.
  outline 도형도 전체 footprint를 점유한다. 종이 배경은 검사 대상 노드가 아니다.
- opacity=0은 제외하고, 보이는 동안은 낮은 opacity라도 면적을 할인하지 않는다.
  이전의 사전 샘플 및 양쪽 엔진의 모든 렌더 프레임 검사에 동일하게 적용한다.
- 예산 안에서 스티커와 채워진 도형 또는 선의 겹침을 허용한다.
  스티커 이외의 기존 line-object, 글자 간 충돌, 글자 보호 여백, 자막, 안전영역은 유지한다.
  기존에는 글자 없는 도형 간 겹침이 허용됐으므로, 스티커에는 새 면적 상한도 생긴다.
- 종이·선·스티커는 아래, 라벨은 위에서 그린다. 글자가 렌더 순서상 위에 있더라도
  다른 스티커가 글자 보호영역을 침범하면 실패한다.

이 테마는 자막 고정 46px·최대 두 줄, 중앙 도식과 하단 자막 영역 분리를 적용한다.
공통 CTA는 기존 검정/흰색 화면을 유지한다. 스케치에 전체 문장을 반복하지 않는다.

프레젠터는 기존 원형으로 표시한다. 과거 torn-paper-blue 값도 원형으로 렌더한다.
도식 라벨은 눈누에서 확인한 나눔손글씨펜(Nanum Pen Script), 자막은 Pretendard다.
실제 papers.webp/marks.webp 시트를 잘라 보여주는 sprite 방식으로 종이와 강조 요소를 합성한다.
스티커는 role=sticker와 stickerAsset=paper/blue/tape/check/star/underline으로 선택한다.
노트 테마에서 장면 의미와 연결되는 이미지 스티커 1~2개를 적극적으로 활용한다.
라벨이 있는 스티커는 paper/blue를 사용하고 다른 마커 스티커는 빈 라벨을 사용한다.
선은 고정 시드 경로의 흔들림과 5px 잉크 이미지 패턴을 함께 적용한다. 프레임마다 랜덤 노이즈를 재생성하지 않는다.
선 검사는 경로 흔들림을 포함한 10px envelope로 강화한다. 텍스트 보호 영역은 유지한다.
짧은 라벨과 메모에 필기체를 쓰고, 긴 정보는 기존 자막으로 분리한다.

검수 composition: NotebookPreview, NotebookCanvasPreview, NotebookPresenterPreview.
NotebookPreview는 무음 레이아웃/동작 예제다. 실제 렌더에서 폰트 로딩, 스티커, 질감과 중간 프레임을 확인한다.

노트 장면은 좌측 상단에 짧은 주제 제목을 필기체와 파란 테이프로 표시한다. headline에는 주제만 간결하게 쓴다.
자막 각 줄 아래에는 받침과 간격을 둔 얇은 파란 공책 선을 둔다. 46px 글씨와 최대 두 줄을 유지하며 줄 높이는 82px다.
ambientCG Paper001(CC0)을 전체 화면 위에 고정된 soft-light 20%로 합성한다. 발표자에도 같은 종이 질감이 적용된다. 공통 CTA와 다른 테마는 제외한다.

### 노트 제목 오프닝

`layout: notebook-title`은 릴스 시작의 1080×1920 제목 장면이다. 정적 썸네일이나 블로그 커버를 생성하는 옵션이 아니다.
제목을 좌측 상단에 84px 최대 세 줄, 사진을 우측 하단에 배치한다. 마지막 제목 줄은 파랑이다.
실제 사진은 기존 image/imagePath 경로로 받고 blue 종이 sprite의 알파 마스크로 합성한다. 사진 자체를 생성 일러스트로 대체하지 않는다.
제목 밑줄과 본문 자막 밑줄 모두 기존 생성 marks.webp의 underline 이미지 crop을 재사용한다. 너비와 두께, reveal 시점을 독립 제어한다.
제목 → 사진 → 이미지 밑줄/짧은 메모가 등장하고 본문으로 전환한다. 3~4초 안팎의 제목 장면을 본문 첫 장면으로 구성하며 같은 문구의 자막을 이중 표시하지 않는다.
`NotebookOpeningPreview`는 제목부터 본문, CTA까지 연결된 무음 예제다. 사진 출처와 라이선스는 preview manifest와 public/notebook/README.md에 기록한다.

노트 자막은 beats.keyword 뒤에 papers.webp의 실제 highlighter 이미지를 50%로 합성한다. 글자 크기·위치는 고정하고 마커만 짧게 reveal한다. 핵심어는 한 줄에 들어가는 짧은 구절로 고르며 본문 전체를 칠하지 않는다. keyword가 없는 자막에는 임의의 강조어를 만들지 않는다.

제목 오프닝에서 본문으로 넘어갈 때는 글자가 동시에 겹치지 않도록 dip-to-black을 사용한다. 명시적인 none 전환은 유지한다.
