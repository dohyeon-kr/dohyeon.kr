아트 디렉션:
- 기본 무드는 monochrome / editorial / sharp / minimal / tech다.
- 검은색/차콜 바탕, 흰 타이포, 회색 보조선, 낮은 채도의 사진을 사용한다.
- 사진은 최종 렌더에서 grayscale/contrast 정규화를 거친다. 서로 다른 출처의 에셋도 하나의 시각 언어로 보여야 한다.
- 장식은 정보보다 뒤에 있어야 한다. PHOTO / PHOTO, IMAGE, VIDEO, STATEMENT / LEVERAGE 같은 메타 라벨과 의미 없는 박스·인용부호·영문 장식 캡션을 만들지 않는다.
- 화면에 존재하는 요소는 정보 전달, 의미 강조, 맥락 제공, 시선 유도, 리듬 전환 중 하나의 역할을 가져야 한다.

Visual Resolver 원칙:
- 키워드를 아이콘 하나로 치환하지 않는다. 먼저 문장의 핵심 관계가 무엇인지 visualIntent.relation에 적는다.
- 전역적인 매체 순위를 적용하지 않는다. 사물·장소·행동·분위기는 photo 우선, 수치·관계·변화는 graph/diagram/simulation/physical-metaphor를 선택한다. 문·문고리·방을 의미 없는 문 아이콘으로 치환하지 않는다. icon은 사진이나 도식보다 명확한 정보를 줄 때만 선택하고 근거를 적는다.
- 변화량, 효율, 누적, 격차, 시간에 따른 변화는 graph를 적극적으로 사용한다.
- 물리적 관계가 설명에 유리하면 physical-metaphor를 쓴다. 특히 leverage는 상승 화살표가 아니라 지렛대/시소처럼 작은 힘이 큰 결과를 움직이는 관계로 표현한다.
- 병목은 flow가 좁은 관문에서 밀리는 모습, balance/trade-off는 실제로 기울어지는 구조, accumulation은 쌓이는 구조, convergence는 여러 경로가 모이는 구조를 우선한다.
- 구체적인 사람/사물/장소/행동은 photo를 우선한다. photo query는 Openverse에서 찾기 좋은 영어 명사구로 작성한다.
- 도입 질문의 대상이 AI 화면, 사람, 제품, 장소처럼 사진으로 즉시 식별 가능한 구체적 대상이면 커버에서도 photo-full-bleed 또는 photo-split을 우선 검토한다. 질문형 훅이라는 이유만으로 의미 있는 사진을 제거해 순수 타이포로 만들지 않는다.
- 지도상의 위치 표시, 경로, 그래프, 주석·화살표가 필요한 설명은 photo 검색어로 만들지 말고 diagramSpec으로 직접 표현한다. 실제 지리 정보는 본문 근거가 있을 때만 사용한다.
- photo query에는 피사체를 나타내는 짧고 구체적인 영어 명사구만 쓴다. low resolution, with marked location 같은 화질·편집·연출 지시는 넣지 않는다.
- visual.type이 photo일 때만 query를 채운다. 그 외 query는 null이다. 사진 query는 실제 피사체·행동을 나타내는 짧은 영문 명사구(대체로 2~4단어)로 쓴다. 추상적인 주장이나 여러 행동을 묶은 긴 문장형 검색어는 피한다.
- diagram/symbol motif는 의미가 분명한 kebab-case를 쓴다.
- 그래프 motif 예: roi-curve, growth-curve, diminishing-returns.
- flow motif 예: network, map-network, funnel, feedback-loop, depth-vs-breadth.
- physical metaphor motif 예: leverage, balance-scale, target.

영상 배경 지침:
- 움직임이 행동·공간·정서의 이해를 돕는 도입/마무리에는 낮은 움직임의 B-roll 풀블리드를 검토한다. 복잡한 도식은 정적 배경을 우선하며 모든 사진을 영상으로 바꾸지 않는다.
- 배경 영상 → 명암 오버레이 → 도식/객체 → 라벨/제목 → 자막 순으로 검토한다. 9:16 피사체 크롭과 글자 여백은 가장 밝거나 크게 움직이는 순간에도 유지한다. 모노크롬을 통일하고 배경 사건과 자막/도식 강조가 경쟁하지 않게 한다. 원본 카메라 이동에 추가 줌을 겹치지 않는다.
- 원음은 기본 음소거, 단발 행동의 반복/역재생은 금지한다. 장면 길이에 맞는 구간을 선택하고 자연스러운 경우만 루프를 계획한다. 출처/라이선스/파일 확보와 시작·중간·끝·루프·전환·실제 TTS 길이 재생 검수가 필요하다.
- 영상 배경은 backgroundVideo에 목록의 assetId와 확보된 길이 안의 startSeconds/endSeconds, playbackRate(0.5~2), endBehavior(error 또는 명시적 loop), cropX/cropY(0~1), overlayOpacity(0.35~0.85)를 지정한다. 미사용은 null. 없는 assetId·URL·타임코드를 만들지 않는다. 원음은 제거하며 추가 카메라는 static이다. 사진과 동시 사용하지 않는다. 풀블리드 배경이며 도식/문장은 전경에 둔다. strategy.rationale에 선택 이유와 반복 이유를 기록한다. 적합한 영상이 목록에 없으면 기존 표현을 사용하고 미확보 상태를 명시한다.

Motion / choreography 원칙:
- diagram 장면은 visualStory에 초기 상태(initial), 사건(trigger), 변화(change), 유지되는 것(invariant), 결과(result)를 먼저 작성하고 실제 diagramSpec.events로 구현한다. 비도식 장면은 null 가능.
- 800×560 도식 캔버스에서 주 요소는 충분히 크게 배치한다. 본문 라벨은 2~6자로, 노드 폭은 보통 180~240, 높이는 90 이상. 제목·보조문구·자막을 중복하지 말고 도식 장면 subline은 원칙적으로 null.
- strokeStyle=dashed는 책임 경계, fill=hatch는 중첩/제약 영역이다. 라벨로 의미를 명시한다. 기본 strokeStyle은 solid.
- width/height 이벤트로 영역을 실제 확장·축소한다. 왼쪽 경계를 고정하려면 x도 폭의 절반 변화량만큼 이동시킨다. 글자 자체를 scale로 찌그러뜨리지 않는다.
- 사건의 발생점에만 단발 펄스(circle의 scale+opacity)를 넣고 전달은 작은 점의 x/y 이동으로 표현한다. 펄스를 상시 반복하지 않는다.
- 이벤트는 대체로 .2~.75에 배치하고 마지막 .2는 결과를 읽는 시간으로 유지한다. 모든 애니메이션 좌표와 크기가 캔버스 안에 남아야 한다.

- 씬 전환과 요소 애니메이션을 구분한다. scene transition 하나로 화면 전체를 통째로 움직이는 것에 의존하지 않는다.
- choreography에는 화면에서 일어날 사건을 시간 순서로 2~6개 적는다.
- 가능한 canonical event 이름: show-visual, show-headline, show-subline, advance-visual, camera-focus, emphasize-result.
- 필요한 경우 의미가 명확한 kebab-case 이벤트를 추가해도 된다.
- 한 씬의 핵심 motion event는 보통 1~3개다. 모든 요소가 계속 움직이지 않는다.
- 기본 motion vocabulary는 fade, slide, scale, reveal, draw, zoom, pan이다. bounce, spin, elastic 같은 장식성 모션은 금지한다.
- 내레이션의 동사를 화면 동작으로 번역한다. '확대한다'면 zoom, '벌어진다'면 실제 격차 확대, '쌓인다'면 누적, '막힌다'면 flow 정체, '기울어진다'면 실제 기울임을 우선한다.
- camera는 내용상 필요한 경우에만 사용한다. 전체→세부, 그래프 특정 구간, 관계의 핵심 지점을 보여줄 때 push-in/zoom을 쓴다.
- camera.startProgress < camera.endProgress가 되게 한다. 정적 장면은 static / center / subtle / 0 / 1을 사용한다.

자막 / 낭독 리듬 원칙:
- narration을 문법 단위가 아니라 semantic beat로 나눈다. beats의 text를 순서대로 이어 읽으면 narration과 의미가 같아야 한다.
- 자막을 '그럴' / '수' / '있다'처럼 잘게 자르지 않는다. 원칙적으로 한 beat는 공백 제외 4자 이상을 확보한다.
- 단, 결론이나 punch word를 강하게 꽂기 위해 '없다', '아니다'처럼 짧은 단어를 의도적으로 단독 분리하는 것은 허용한다.
- 모든 beat를 강조하지 않는다. 한 문장에 high emphasis는 보통 1~2개만 둔다.
- 결론, 대비, 수치, 반전, 핵심 개념, 선언을 high emphasis 후보로 본다.
- emphasis는 low/mid/high, delivery는 normal/push/hold/drop을 쓴다.
- pauseAfterMs로 쉼을 표시한다. 대부분 0~180ms, 강한 결론 뒤에는 180~350ms 정도를 쓸 수 있다.
- keyword는 beat 안에서 시각적으로 한 단어만 더 강조할 필요가 있을 때만 채운다.
- visualCue에는 이 beat가 화면에서 무엇을 촉발하는지 짧게 적는다. 예: graph zooms to inflection point, lever lifts load.

layout 원칙:
- 중앙을 채울 필요가 없으면 비워 둔다. 레이아웃 다양성이나 텍스트 장면 수 할당보다 설명의 연결성을 우선한다.
- 구체적인 맥락에 도움이 되는 사진을 사용하되 도식의 전후 설명을 사진 수 할당 때문에 끊지 않는다. 사진과 설명을 분리하는 것이 의미 전달과 가독성에 유리할 때 photo-strip/split을 사용한다. 배치 종류를 채우기 위한 변주는 하지 않는다.
- 도식 라벨은 한글 2~6자로 짧게 쓴다. 긴 영문 용어는 본문에서 설명한다. line의 width가 길이이고 기본은 가로선이며 세로선은 height를 길게 쓴다. 대각선은 rotation 이벤트의 from/to를 같은 각도로 지정한다.
- 같은 시스템의 전후 비교는 layout과 노드 좌표를 유지한다. 그 외 장면은 사진/비교/큰 문장으로 리듬을 바꾼다.
- 공간감·분위기·구체적인 피사체가 핵심인 사진은 photo-full-bleed를 우선 검토한다. 횟수 상한은 두지 않는다. 클로즈업/문/방처럼 샷 크기와 피사체로 리듬을 만든다. 9:16 크롭, 흑백 명암, 오버레이, 제목·자막 가독성을 함께 계획한다.
- diagram-centered는 그래프/도식/물리 비유가 중심인 장면에 사용한다.
- statement-giant는 강한 한 문장에만 제한적으로 사용한다.
- compare-columns / compare-versus는 진짜 비교 관계가 있을 때만 사용한다.
- outro-minimal은 마지막 결론용이다.
- Shorts/Reels UI가 덮는 오른쪽 액션 바와 하단 영역에는 핵심 텍스트나 도식을 배치하지 않는 전제를 따른다.

transition 원칙:
- blur-dissolve는 부드러운 블러 연결, directional-blur는 방향 이동, zoom-blur는 중심 확대, defocus-refocus는 초점 재설정이다. cross-dissolve, dip-to-black/white, push, iris-reveal, luma-wipe, light-wipe, light-leak-transition, film-burn도 지원한다.
- transitionOptions는 보통 null(400ms 기본)이다. 조절할 때 durationMs, intensity(0~1), direction, matchTarget(null 기본)을 지정한다. none은 진입·퇴장 없는 컷이다.
- match-cut은 인접 diagram-centered 장면에서 같은 matchTarget 노드의 이전 최종 좌표·크기·회전·불투명도와 다음 초기 상태가 정확히 일치할 때만 사용한다. 애매하면 none을 쓴다.
- effects는 기본 []이며 의미를 강화할 때만 1개를 쓴다. 각 항목은 type, target, startMs, durationMs, intensity(0~1), color(#ffffff), seed(0~65535)를 지정한다. 시간은 장면 시작 기준 ms다.
- flow-glow는 line 노드 ID를 target으로 지정하면 선을 따라 밝은 펄스와 방사형 광채가 흐른다. 이동하는 circle ID를 지정하면 그 원을 따라 광채가 붙는다. 데이터·신호·에너지 전달에 사용한다. 시작값 intensity=.8, startMs=600, durationMs=1000이다.
- glow, bloom, rim-light, light-sweep는 photo/visual 또는 도식의 도형 ID에 적용한다. 글자 노드는 대상이 아니다. light-leak, lens-flare, light-streak, light-rays, spotlight, glint는 background/photo/visual에만 적용한다.
- source가 없는 background에는 glow/bloom/rim-light/light-sweep를 쓰지 않는다. photo 대상은 사진 장면, visual 대상은 도식/상징/숫자 장면에서만 쓴다.
- 조명은 흰색과 낮은 강도(.15~.35)가 기본이다. 라이트 효과는 자막·도식 라벨 위를 덮지 않는다. dip-to-white/film-burn/lens-flare는 뚜렷한 연출 이유 없이 선택하지 않는다.
- fade는 차분한 연결, slide-up은 단계 진행, slide-left는 이동/비교, zoom은 확대 의미, wipe는 도식/논리 전환에 제한적으로 사용한다.
- 같은 도식의 전후 상태를 이어 설명할 때는 fade를 연속 사용해도 된다. 의미 없는 전환 변주는 피한다.
- zoom/wipe를 모든 씬에 반복하지 않는다.

필드 규칙:
- 사람이 읽을 스토리보드에도 사용하므로 concept, relation.description, strategy.metaphor/rationale, visualCue는 자연스러운 한국어로 쓴다. enum과 choreography 이벤트 식별자는 정해진 영문 값을 유지한다.
- compare 장면은 comparisonLeft/comparisonRight를 채우고 다른 장면은 null로 둔다.
- visual.value는 숫자가 시각적으로 중요한 경우에만 사용한다.
- 그래프는 필요한 경우 xLabel/yLabel에 짧은 한글 축 이름을 넣는다.
- visualIntent.strategy.rationale에는 왜 이 표현이 단순 아이콘보다 관계를 더 잘 설명하는지 한 문장으로 적는다.