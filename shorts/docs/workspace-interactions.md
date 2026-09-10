# 워크스페이스 상호작용 SVG

모노톤·각진 윤곽·투명 배경의 개별 벡터 파일이다. 스크리블, 래스터 이미지, 외부 폰트, 그라데이션을 넣지 않는다. 이 문서와 카탈로그는 추가 요청한 애셋 4개만 다룬다. 전체 워크스페이스 세트나 기본 숏츠 렌더러 통합을 완료했다는 의미는 아니다.

## 파일과 역할

파일은 `shorts/public/stickers/workspace-svg/`에 저장한다.

| 파일 | 용도 | 앵커 / 텍스트 영역 |
|---|---|---|
| speech-bubble.svg | 대화, 질문, 피드백 | tip=(56,178), labelArea=(36,40,168,80) |
| pointing-hand.svg | 선택, 지목, 클릭 | tip=(42,10) |
| mouse.svg | 물리 마우스, 입력 동작 | left-click=(104,62), right-click=(138,62), wheel=(120,58) |
| mouse-pointer.svg | 화면 커서 | tip=(12,10) |

## 배치 API

`shorts/src/visuals/workspace-interactions.mjs`는 외부 패키지 없이 메타데이터 조회와 앵커 정렬을 제공한다. `interaction-catalog.json`은 기존 애셋 레지스트리에 병합할 수 있는 별도 카탈로그다. 기존 catalog.json을 이 부분 카탈로그로 덮어쓰지 않는다.

```js
import {getInteractionAsset, interactionAssetPath, placeInteractionAtAnchor}
  from './workspace-interactions.mjs';

const hand = placeInteractionAtAnchor({
  asset: 'pointing-hand', anchor: 'tip', at: [400, 250], width: 144,
  rotation: 0, scale: 1, scribble: false,
});
// hand.x / hand.y는 오브젝트 좌상단이다.
// transform-origin: top left; transform: rotate(...) scale(...)
```

`at`은 부모 캔버스 좌표다. width로 원본 비율을 유지하며 scale과 rotation(도)을 모두 반영해 앵커를 맞춘다. `scribble: true`는 실패한다. 물리 마우스(mouse)와 화면 커서(mouse-pointer)를 혼동하지 않는다. 이 모듈 자체는 scene JSON에 자동 삽입하거나 Remotion을 실행하지 않는다.

## 사용 지침

말풍선은 빈 도형이며 텍스트는 labelArea에 별도로 올린다. 문구는 짧은 질문·응답만 쓰고 설명 문장은 자막에 유지한다. 개발용 ID, 구현 설명, 기획 지침을 라벨로 노출하지 않는다. 기본 숏츠의 한글 폰트와 자막 규칙을 유지한다.

손과 커서는 바운딩 박스 중앙이 아니라 tip 앵커를 클릭 지점에 맞춘다. 이동 → 클릭 → 반응 → 결과 유지 순으로 구성한다. 실제 연결이나 동작을 설명할 때만 사용하고 의미 없는 반복 클릭·회전·흔들림을 넣지 않는다.

모서리 라운드, 스크리블, 윤곽 변위 필터를 추가하지 않는다. 어두운 배경에는 SVG 이미지 레이어만 `filter: invert(1)`로 명암을 반전하고 텍스트는 별도 레이어로 유지한다. 꼬리 방향은 회전·좌우 반전으로 조절할 수 있으나 말풍선 글자까지 반전하지 않는다.

SVG/XML 검사·앵커 단위 테스트와 실제 영상 중간 프레임·한글 가독성·TTS 타이밍 검수는 구분한다. 새 애셋 때문에 기존 노트 템플릿의 정책이나 승인된 내레이션을 바꾸지 않는다.

```sh
node --test shorts/tests/workspace-interactions.test.mjs
```
