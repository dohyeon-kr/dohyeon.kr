# 노트 SVG 애셋과 모션 프로토콜 v1

노트 템플릿의 UI 조작·입력과 결과를 설명할 때 사용하는 계약이다. 완성된 설명 도식과 함께 쓴다. 모든 장면을 UI로 바꾸거나 빈 공간을 장식으로 채우지 않는다.

## 톤앤매너

- 투명 SVG, 미색 면 `#fffdf7`, 차콜 윤곽 `#222522`, 주황 강조 `#ba652e`, 보조선 `#aaa297`, 그림자 `#ded8cc`.
- 배너 면 `#f3dfc9`, 썸네일 면 `#ead0b2`. 그라데이션·광택·3D 원근은 쓰지 않는다.
- 기본 윤곽 3 viewBox 단위, 둥근 끝과 연결. 박스 변마다 8개 표본, ±1의 고정 시드 흔들림. 화살표 5, 커서 검정 4와 흰 외곽 12.
- 단순한 창·버튼·배너·데이터 카드처럼 즉시 역할을 알아보는 형태. 임의 장식 스티커를 추가하지 않는다.
- 한글은 SVG에 굽지 않는다. labelArea에 별도 텍스트로 배치하고 받침·줄간격·선과의 거리를 확인한다. 라벨 기본 28px, 최소 24px, 최종 합성 배율까지 고려한다.
- 새 애셋은 `create-notebook-svg-assets.py`에 추가하고 SVG, catalog.json, TS registry를 함께 재생성한다. ID·viewBox·labelArea·상호작용 앵커·용도를 등록한다. 상태 교체 쌍은 같은 viewBox를 쓴다.

## 기본 스크리블

`NotebookUiAsset`과 scene.uiMotion은 scribble=true가 기본이다. SVG 윤곽에 기존 ScribbleFilter(10Hz, 변위 4)를 적용한다. 라벨은 필터 밖에 두고 좌표와 줄바꿈을 고정한다. frame/fps로만 결정하며 시간·난수를 런타임에 사용하지 않는다. 정적 SVG 원본에는 고정된 손그림 선만 있고, 움직이는 효과는 컴포넌트에서 적용된다. 명시적으로 정적 처리가 필요할 때만 scribble=false를 쓰고 이유를 기록한다.

## JSON 사용

`style.template=notebook-grid`, `scene.uiMotion={version:1,width:800,height:560,nodes,events,states}`로 연결한다. `visual.type=none`, `layout=diagram-centered`, image/diagramSpec/presenter/backgroundVideo는 null로 둔다. manifest-level presenterOverlay는 유지할 수 있다. 다른 템플릿에서 사용하면 검증을 실패시킨다.

- nodes: 고유 id, catalog의 asset ID, 캔버스 좌표 x/y, 종횡비를 유지할 width. 선택값 scale=1, rotation=0, opacity=1, drawProgress=1, layer=0. label과 labelSize는 labelArea가 있는 애셋에만 쓴다.
- events: target, property(x/y/scale/rotation/opacity/drawProgress), from/to, start/end. 시간은 해당 장면의 0~1 진행률. 기본 easing=smooth, 획 그리기는 linear를 권장한다. 같은 대상·속성 트랙은 겹치지 않고 이전 to와 다음 from이 같아야 한다.
- states: target, at(0~1), asset. 같은 크기의 상태 SVG를 교체한다. banner→banner-empty, button→button-pressed 등을 쓴다.
- 부모가 예약된 도식 영역에 균등 축소·중앙 정렬한다. JSON에 릴스 safe-area 오프셋을 더하지 않는다. 이동 후에도 자막·발표자·헤딩과 겹치지 않게 중간 프레임을 본다.

실제 사용: Storybook 글의 candidate-01.json 5·6·8장면. 최소 예제: `shorts/examples/notebook-ui-click.json`.

## 애니메이션 문법

하나의 설명 단위는 초기 상태 → 사용자 입력 → 화면 변화 → 결과 유지다. 동시 출현만으로 설명을 끝내지 않는다. 커서 이동은 클릭보다 먼저, 클릭 표시는 짧게, 결과는 충분히 읽을 시간을 둔다. bounce·spin·무한 반복은 사용하지 않는다. 입력과 무관한 개체까지 함께 흔들거나 이동하지 않는다.

화살표는 `drawProgress:0`에서 1로 진행시킨다. 첫 70%에 꼬리부터 몸통을 그리고, 다음 15%에 머리 첫 획, 마지막 15%에 둘째 획을 그린다. 세 path는 독립된 dash reveal이다. 머리는 몸통 완성 전에 나타나지 않는다. opacity fade로 획 그리기를 대신하지 않는다.

커서 좌상단 = 클릭 목표 − cursor.tip × 배율. click-rays 중심도 같은 목표에 둔다. 창→내용→팝업→커서→클릭 표시 순으로 layer를 둔다. 라벨을 커서로 가리지 않는다.

## 검증과 타이밍 한계

스키마 검증 후 validateSceneUiMotion을 호출한다. 중복 ID, 알 수 없는 애셋, 겹치거나 불연속인 트랙, 범위 밖 진행률, 크기가 다른 상태 교체는 실패한다. 같은 frame은 같은 결과여야 한다. 0·중간·1과 클릭/상태 전환 경계 전후를 확인한다. 화살표는 몸통/머리 경계도 확인한다.

진행률은 장면 길이에 맞춰 늘어난다. 특정 단어와 자동 동기화되지는 않는다. 무음 프리뷰에서 동작 순서를 확인하고, 최종 음성이 준비되면 beats의 실제 시간에 맞춰 start/end/at을 조정한다. manifest 검증·무음 프리뷰·최종 음성 검수 상태를 구분해 기록한다.

## 애셋 겹침 허용

같은 `NotebookUiScene` 안의 애셋과 애셋 라벨은 기본적으로 겹침을 허용한다. 버튼 위 팝업, 창 안 배너, 커서·클릭 표시와 상태 전환 중 가림은 레이어 조합이므로 렌더 실패로 처리하지 않는다. 컨테이너의 `data-layout-overlap="assets"`로 범위를 명시하며, 다른 UI 장면이나 제목·본문·자막과의 겹침은 계속 검사한다. 캔버스 이탈과 자막 예약 영역 검증도 유지한다. 결과 상태의 중요한 라벨은 읽을 수 있도록 layer와 유지 시간을 조정한다.

### 제목과 애셋의 겹침 허용치

같은 uiMotion 안의 애셋·라벨은 겹침을 허용한다. 제목(headline)과 애셋은 가린 영역의 합집합 ÷ 제목 DOM 텍스트 경계 면적이 **5% 이하**이면 허용하므로 약한 의도적 겹침을 배치에 활용할 수 있다. scene.uiMotion.headlineOverlapLimit=0.05를 명시한다(생략 기본값 0.05, 범위 0~0.05; 0은 제목 겹침 금지). 애셋별 5%가 아니라 전체 합집합 5%이며, 같은 영역은 중복 계산하지 않는다. 여러 UI 컨테이너가 있으면 가장 엄격한 허용치를 적용한다.

예약된 도식 영역 대신 각 애셋의 변환 후 DOM 사각형을 사용하며 매 렌더 프레임에 검사한다. opacity=0은 제외하고 부분 투명 애셋은 포함한다. 제목·본문·자막끼리의 겹침, 일반 시각 영역 침범과 캔버스 이탈은 기존 기준을 유지한다. 이는 픽셀 알파나 글자 획이 아닌 DOM 사각형 근사치이므로 SVG 투명 여백·회전을 보수적으로 계산한다. 중요한 제목 글자의 가독성을 프리뷰에서 확인한다. 허용 범위의 겹침을 무조건 제거하거나 레이아웃 오류로 지적하지 않는다.
