# 오답노트 스티커와 지면 인터페이스

기존 이미지 시트 `public/notebook/papers.webp`, `marks.webp`를 원본으로 사용한다.
`src/visuals/notebook-catalog.ts`가 애셋 ID·원본 크기·crop·용례·attachment 범위의 단일 정의다.
Remotion과 Motion Canvas가 같은 catalog를 소비한다. 새 이미지를 생성하거나 원본을 다시 그리지 않는다.

## 지면과 제목

1080×1920 전체가 종이 지면이다. 도식 뒤에 별도의 작은 종이 패널을 두지 않는다.
제목 오프닝: 84px 최대 세 줄, 넓은 840×560 인화 사진과 모서리 테이프 두 개.
본문: 좌측 상단에는 `source.title` 전체 주제 제목을 모든 페이지에서 동일하게 표시한다.
페이지별 소제목을 헤더로 바꾸지 않는다. 도식은 900×630 영역에 놓고 자막·발표자와 분리한다.
미세한 종이 질감은 전체 화면에 고정 합성하며 공통 CTA에는 적용하지 않는다.
자막은 Pretendard 46px 최대 두 줄, 발표자가 있으면 폭 590px 기준으로 문장을 나눈다.

## 애셋 용례

| ID | 시트 | 용례 | 라벨 | 붙이는 방식 |
| --- | --- | --- | --- | --- |
| paper | papers | 조건, 질문, 수정 메모 | 짧게 허용 | 독립 또는 edge-note |
| blue | papers | 선택한 버전, 남길 결론 | 흰색 짧은 라벨 | 독립 또는 edge-note |
| tape | papers | 사진·카드 가장자리 고정 | 금지 | tape |
| check | marks | 확인했거나 선택한 항목 | 금지 | 독립 또는 badge |
| star | marks | 동료 반응, 발견한 점 | 금지 | 독립 또는 badge |
| underline | marks | 짧은 제목 아래 | 금지 | 받침 아래 최소 12px 간격 |
| highlighter | papers | 자막 핵심어 뒤 | 직접 라벨 없음 | beats.keyword, 불투명도 50% |

한 장면에 의미 있는 메모와 확인 표시 2~3개를 활용하되 개수를 채우지 않는다.
별이나 체크가 아직 확인하지 않은 성과를 암시하지 않게 한다. 스티커를 프레젠터·자막 위에 붙이지 않는다.
도식 좌표계 800×560의 크기는 화면에서 1.125배로 표시된다. 화면 px와 도식 좌표를 혼용하지 않는다.

## JSON 인터페이스

기존 `role`, `stickerAsset`, `x/y/width/height`, `events`를 유지한다.
지정한 객체에 걸쳐 붙일 때만 `stickerAttachment`를 추가한다.

```json
{
  "id": "fixed-card-tape",
  "shape": "rect",
  "role": "sticker",
  "stickerAsset": "tape",
  "stickerAttachment": {"target": "card", "preset": "tape"},
  "label": "",
  "x": 400, "y": 200, "width": 140, "height": 60,
  "fill": "none"
}
```

예제의 대상 `card`는 x=400, y=300, width=300, height=200인 일반 rect다.
API는 자동 배치 명령이 아니다. 작성자가 좌표와 events를 정하며 엔진은 매 상태를 검증한다.
움직이는 대상과 스티커의 좌표를 함께 갱신하지 않아 분리되면 실패한다.
대상은 자기 자신·다른 스티커·선·텍스트가 될 수 없다. 숨겨진 대상 위에 스티커만 남아도 실패한다.

| preset | 애셋 | 지정 대상과 겹침 | 기본 의도 |
| --- | --- | --- | --- |
| edge-note | paper, blue | 8–20% | 메모가 모서리에 조금 걸침 |
| tape | tape | 35–65% | 테이프가 객체와 지면 양쪽에 걸침 |
| badge | check, star | 5–15% | 확인 표시를 모서리에 가볍게 걸침 |
| attachment 없음/null | 기존 전체 | 최소 없음, 전역 상한 기본 20% | 독립 메모·호환 후보 |

겹침 분모는 **스티커 footprint 면적**이다. 대상 면적이나 IoU가 아니다.
회전·크기·stroke를 포함한 보수적 사각형이며 실제 PNG 알파 면적과 같다고 주장하지 않는다.
지정 대상에만 preset 범위를 적용하고, 그 밖의 보이는 객체들과 겹친 합집합은 별도로
`notebook.maxStickerOverlap`(기본 20%, 최대 40%) 이하로 제한한다.
테이프의 지정 대상 35–65% 예외를 다른 도형에 확대하지 않는다.
글자 보호영역 0.25em, 한글 받침 간격, 선·글자 충돌 및 도식 inset 40은 계속 강제한다.
레이어는 전체 지면 → 연결선·일반 객체 → 스티커 → 글자 → 자막·발표자 → 미세 질감 순서다.
대상에 붙이는 스티커를 대상보다 뒤에 그리지 않도록 nodes 순서도 함께 맞춘다.

사진 테이프는 NotebookTitleScene의 장면 장식이며 diagram node와 별개다.
폭 200×높이 80, 대각선 두 모서리에 반쯤 걸치는 배치다. 사진의 주요 얼굴을 덮지 않는다.
자막 highlighter는 글자 **뒤**에만 합성하는 별도 트랙이므로 일반 스티커의 텍스트 침범 예외로 사용하지 않는다.

## 문체

오답노트는 저자의 경험을 존댓말로 회고한다. '~했습니다 / ~합니다 / ~하려고 합니다'를 기본으로,
필요한 짧은 끝맺음은 '~하려고요'를 허용한다. 비하·자기비하 속어 대신 어떤 행동을 돌아보는지 쓴다.
원문에 없는 경험·감정·성공을 만들지 않는다. 실제로 남아 있는 고민은 그대로 둔다.

## 검증

스키마, min/max 겹침, 지정 대상 외 합집합 겹침, 텍스트 보호, 숨김·회전·역방향 탐색을 테스트한다.
스키마 통과와 실제 이미지 크롭·렌더 결과 확인은 별도로 기록한다.

개별 투명 lossless WebP는 `public/notebook/stickers/`에 제공한다.
`python shorts/scripts/extract-notebook-stickers.py`로 원본 crop과 같은 alpha 수식을 적용해 재생성한다(Pillow, Node 24 필요).
기존 엔진은 단일 catalog의 시트 crop을 계속 사용하므로 기존 후보의 텍스처 해석이 달라지지 않는다.
Figma에는 편집 성능을 위한 PNG 사본을 넣었으며 원본 해상도 애셋은 저장소 파일을 사용한다.
Figma에서 Pretendard가 제공되지 않아 자막·오프닝 제목은 Noto Sans KR로 대체 표시한다. 런타임은 Pretendard를 유지한다.

[Figma 레이아웃·컴포넌트](https://www.figma.com/design/3I8agGzTSC0OZUl04YfRud)
