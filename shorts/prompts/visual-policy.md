
화면 구성의 우선 규칙:
- 자막이 주된 언어 전달 수단이다. 중앙은 사진·영상·도식 중심이며 headline은 기본 빈 문자열, subline=null이다. 별도 설명문이나 제목을 의무적으로 붙이지 않는다.
- 중앙 타이포는 특별한 질문·결론 강조에만 허용하고 visualIntent.strategy.rationale에 이유를 적는다. 동일 문장을 두 위치에서 반복하지 않는 설계를 택한다. 스키마에 없는 자막 크기·숨김 필드를 만들지 않는다.
- 자막은 크고 안정적으로 읽는 것을 목표로 의미 단위 최대 두 줄을 계획한다. 공간 때문에 문장을 잘게 쪼개거나 의미를 삭제하지 않는다. 실제 글자 크기와 두 줄 배치는 렌더러 검수 사항이며 JSON으로 확인 완료라 하지 않는다. 반복 확대 대신 제한된 keyword 강조를 사용한다.
- 도식 글자는 식별에 꼭 필요한 대상 이름·수치·축·구분 라벨만 남긴다. 설명 문장은 내레이션/자막에 보존한다. 위치·크기·연결·움직임으로 관계를 전달하고 식별에 필요한 라벨까지 삭제하지 않는다.
- 순간의 중심 시각 요소는 하나다. 사진/영상, 도식, 프레젠터 중 목적에 맞게 선택한다. 프레젠터는 직접 질문/정리할 때만 쓰고 상시 오버레이를 생성하지 않는다.
- 설명에 필요 없으면 중앙을 비워도 된다. 텍스트 전용 장면 연속 금지나 레이아웃 변주 할당량보다 이해와 연속성을 우선한다.


## 노트 UI SVG 모션

notebook-grid에서 버튼·팝업·응답 데이터처럼 조작과 반응을 설명하는 장면은 scene.uiMotion을 사용한다. shorts/docs/notebook-ui-motion.md와 public/stickers/notebook-ui-svg/catalog.json을 따른다. scribble=true를 기본으로 윤곽에만 적용하고 한글 라벨은 선명하게 유지한다. 초기 상태→커서 이동→클릭→상태 변화→결과 유지 순으로 사건을 만든다. arrow의 drawProgress는 꼬리부터 몸통(70%)→머리 첫 획(15%)→둘째 획(15%)이다. 창·배너·커서 등은 의미를 설명할 때만 사용하며 기존 완성 도식은 유지할 수 있다. uiMotion 장면은 visual.type=none, layout=diagram-centered, image/diagramSpec/presenter/backgroundVideo=null로 하며 노트 템플릿만 지원한다. nodes/events/states의 실제 동작을 visualStory/choreography에도 반영한다. 새 애셋은 문서의 팔레트·선·앵커·labelArea 계약을 지킨다.

uiMotion v1은 width=800,height=560,nodes=[{id,asset,x,y,width,layer,label?,labelSize?}],events=[{target,property,from,to,start,end,easing?}],states=[{target,at,asset}] 구조다. 시간은 장면 진행률 0~1, 기본 easing=smooth, 화살표 drawProgress는 linear다. asset은 window/banner/banner-empty/button/button-pressed/popup/data-card/data-card-empty/cursor/click-rays/arrow/text-lines-short/text-lines-long 중 선택한다. 같은 대상·속성 이벤트를 겹치지 않게 이어 붙이고 from은 이전 to와 맞춘다. 크기는 종횡비를 유지한다. 라벨 기본 28px, 최소 24px이며 창·버튼·팝업의 라벨 영역을 침범하지 않게 짧게 쓴다. 화살표는 초기 drawProgress=0에서 1로 그린다. 전후 상태는 동일 크기의 SVG 쌍으로 바꾼다. 전체 창을 흔들지 말고 입력과 그 결과만 변화시킨다.

### 제목과 애셋의 겹침 허용치

같은 uiMotion 안의 애셋·라벨은 겹침을 허용한다. 제목(headline)과 애셋은 가린 영역의 합집합 ÷ 제목 DOM 텍스트 경계 면적이 **5% 이하**이면 허용하므로 약한 의도적 겹침을 배치에 활용할 수 있다. scene.uiMotion.headlineOverlapLimit=0.05를 명시한다(생략 기본값 0.05, 범위 0~0.05; 0은 제목 겹침 금지). 애셋별 5%가 아니라 전체 합집합 5%이며, 같은 영역은 중복 계산하지 않는다. 여러 UI 컨테이너가 있으면 가장 엄격한 허용치를 적용한다.

예약된 도식 영역 대신 각 애셋의 변환 후 DOM 사각형을 사용하며 매 렌더 프레임에 검사한다. opacity=0은 제외하고 부분 투명 애셋은 포함한다. 제목·본문·자막끼리의 겹침, 일반 시각 영역 침범과 캔버스 이탈은 기존 기준을 유지한다. 이는 픽셀 알파나 글자 획이 아닌 DOM 사각형 근사치이므로 SVG 투명 여백·회전을 보수적으로 계산한다. 중요한 제목 글자의 가독성을 프리뷰에서 확인한다. 허용 범위의 겹침을 무조건 제거하거나 레이아웃 오류로 지적하지 않는다.
