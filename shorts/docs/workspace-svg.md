# Workspace SVG visual set v1

기본 숏츠에서 워크스페이스·데스크테리어·데스크탑 장면을 빠르게 구성하기 위한 독립 SVG 세트다. 노트 템플릿의 카탈로그/앵커/라벨 영역 방식을 차용하지만 시각 스타일과 API는 분리한다.

## 스타일

- 최초 컬러 시안 기준: 차콜 윤곽 + 저채도 파스텔 면. 투명 배경.
- 핵심 팔레트: ink `#222522`, paper `#fffdf7`, blue `#9fb6bb`, teal `#9fc4c0`, green `#6f8f70`, beige `#f3dfc9`, orange `#e3a466`, yellow `#f2c95e`, pink `#efb3a8`, gray `#aaa297`.
- 둥근 카드 UI, 유리 효과, 그라데이션, 3D, 네온, 그림자 중심 연출을 만들지 않는다.
- 모서리는 각지게, stroke-linecap=square / stroke-linejoin=miter를 기본으로 한다.
- **스크리블은 사용하지 않는다.** SVG 원본과 렌더 레이어 모두 흔들림/변위 필터를 적용하지 않는다.
- SVG 안에 설명 문구를 굽지 않는다. `labelArea`가 있는 말풍선·노트·메모·캘린더만 렌더러 텍스트 레이어를 허용한다.

## 기본 에셋

`shorts/public/stickers/workspace-svg/catalog.json`을 단일 소스로 사용한다. 주요 분류는 hardware / furniture / stationery / decor / interaction이다. desktop, laptop, monitor, keyboard, mouse, desk-lamp, plant, coffee, chair, desk, books, pen-holder, notebook, sticky-note, headphones, speaker, speech-bubble, thought-bubble, pointing-hand, mouse-pointer, calendar, cat, arrow를 제공한다.

## API

`shorts/src/visuals/workspace-assets.mjs`

- `workspaceAssetIds`: 사용 가능한 ID 목록
- `getWorkspaceAsset(id)`: viewBox, category, labelArea, anchors 조회
- `workspaceAssetPath(id)`: Remotion `staticFile()`에 전달할 상대 경로
- `placeWorkspaceAsset(...)`: x/y/width/scale/rotation/opacity/layer/label 검증
- `placeWorkspaceAtAnchor(...)`: 손끝, 커서 tip, 마우스 버튼, 모니터 screen 같은 앵커를 기준 좌표에 맞춤
- `validateWorkspaceScene(spec)`: 최대 24개 노드, 중복 id, scribble=false 강제

말풍선과 thought-bubble은 `labelArea`에 짧은 말만 배치한다. 본문 설명은 자막에 둔다. pointing-hand와 mouse-pointer는 `tip` 앵커를 실제 지목 대상에 맞춘다. 물리 mouse는 left-click/right-click/wheel 앵커를 쓴다.

## 장면 구성 지침

한 장면에 의미 중심 오브젝트 1~3개를 우선한다. 책상 전체를 매번 채우지 않는다. `desk + monitor + keyboard`, `laptop + coffee`, `speech-bubble + pointing-hand`, `mouse + arrow + monitor`처럼 의미 관계가 생길 때 조합한다.

등장은 fade/짧은 translate 정도로 제한한다. 포인팅 핸드나 커서는 이동→지목/클릭→결과 유지 순서를 갖는다. 의미 없는 반복 흔들림·회전·bounce는 금지한다. 관계를 설명할 때는 arrow 앵커 from/to를 사용한다.

사진을 대체하기 위한 장식으로 남발하지 않는다. 실제 공간의 분위기·사람·장소가 중요하면 사진을 우선하고, 워크플로우/도구/책상 환경을 설명할 때 SVG를 우선한다.

## Instruction-to-UI Leakage

라벨에 `워크스페이스 테마`, `사용자 친화적`, `여기에 설명`, `API 연결`, `TODO` 같은 내부 지침을 노출하지 않는다. 요구사항은 화면 문구가 아니라 배치/선택 기준으로만 사용한다. 사용자에게 필요한 명사·상태·짧은 대사만 남긴다.

## 검증

```sh
node --test shorts/tests/workspace-assets.test.mjs
```

SVG XML 파싱/카탈로그 검증과 실제 영상 검수는 구분한다. 프리뷰에서는 한글 label, 자막, 발표자와의 충돌, 중간 프레임의 손끝/커서 정렬을 별도로 확인한다.
