export const templates = [
  {id: 'monochrome-editorial', name: 'Monochrome Editorial', renderer: 'editorial', background: null, instructions: ''},
  {id: 'monochrome-editorial-dark', name: 'Monochrome Editorial (default)', renderer: 'editorial', background: null, instructions: ''},
  {
    id: 'notebook-grid', name: 'Notebook Grid · 가벼운 에세이', renderer: 'notebook',
    background: 'templates/notebook-grid/paper.png',
    instructions: `선택된 템플릿은 notebook-grid이다. 가벼운 에세이용 템플릿이다. 아래 에세이 서사 지침은 정보성 콘텐츠의 밀도·논증 형식보다 우선하며, 시각 연출은 기본 검정 배경·중앙 타이포 제한보다 우선한다. 사실 정확성·원문 충실성·존댓말·가독성 규칙은 유지한다.
일상이나 일에서 겪은 작은 장면·관찰에서 시작해 그때 든 생각과 관점의 변화, 짧은 여운으로 이어간다. 원문에 있는 1인칭 경험과 망설임을 자연스럽게 살린다. 개인적인 감상을 보편적 정답으로 단정하지 않고, 원문에 없는 경험·감정·깨달음을 만들어내지 않는다. 정보성 5단계 논증, 비교표, 실천 목록, 교훈을 억지로 채우지 않는다. 마지막 본문은 도입의 경험이나 질문으로 돌아오는 짧은 생각으로 맺으며 열린 질문도 허용한다. 공통 CTA는 본문과 별도다.
한 화면은 짧은 문장 하나 또는 사진 한 장을 중심으로 여백을 넉넉하게 둔다. 그리드는 정렬과 가벼운 구획에 사용하며 모든 칸을 정보로 채우지 않는다. 사진은 원문의 장면·감각·분위기를 전달할 때 사용하고, 도식과 비교는 이해에 꼭 필요할 때만 선택한다.
릴스 UI 보정을 위해 렌더러가 본문 전체(상단 라벨·구획선·제목·사진·도식·자막)와 상시 발표자를 원본 1080×1920 기준 아래로 100px 이동한다. 배경과 공통 CTA는 이동하지 않는다. 자막 시작 y=1510, 두 줄 예약 영역 끝 y=1654, 발표자 y=1420..1610이다. 생성 JSON의 도식 좌표나 개별 장면에 이 오프셋을 중복 적용하지 않는다. 이 값은 제공된 화면 기준의 조정값이며 릴스 UI 오버레이와 함께 확인한다.
미색 모눈 종이, 검정 고딕, 주황 강조, 2px 구획선과 선 끝 점, 4열 기반 1/2/4열 병합 구성이다.
한 장면 핵심 메시지 하나와 보조 구역 최대 2개. 첫 장면 headline은 전체 주제 제목, 이후 headline은 짧은 핵심 메시지 또는 빈 문자열. subline은 필요한 짧은 설명만 쓴다.
사진은 흰 인화지 여백(좌우·위 18px, 아래 40px)과 반투명 PNG 테이프 스티커로 노트에 붙인 듯 표시한다. 상단 중앙 테이프 1개, 약 50%가 사진 위에 걸치며 인물 얼굴·사진 속 중요 글자를 가리지 않는다. 이미지 검색은 테이프나 액자 합성이 없는 원본 사진을 찾는다. 이미지 자체에 흰 테두리·스티커·자막을 생성하지 않는다. 사진은 3:4 세로 프레임을 cover로 빈틈없이 채우고 핵심 피사체가 크롭 안에 남는 원본을 선택한다. 제목이 없으면 750×1000px, 제목이 있으면 540×720px, subline이 있으면 427.5×570px 공간을 쓴다. 직접 제작한 도식 이미지는 visual.type=photo와 diagramSpec=null로 파일을 삽입하고, image.source=authored-diagram으로 지정해 contain으로 전체를 보존한다. 프레임은 그리드 중앙에 정렬한다. 테이프만 -4도 회전하며 원본 사진은 기울이지 않는다. 영상도 종이 위 넓은 영역에 표시한다. 비교가 필요하면 compare-columns 또는 compare-versus, 도식이 필요하면 diagram-centered, 마무리는 outro-minimal을 사용한다.
도식은 화면 중앙의 넓은 영역을 사용하며 제목이 없으면 제목 자리도 활용한다. 도형과 연결선에는 0.1초마다 바뀌는 약한 스크리블 윤곽을 적용하고 글자·정렬·노드 위치는 흔들지 않는다. 도식은 기존 800×560 좌표·흑백 스키마를 유지한다. 렌더러가 잉크 색상으로 변환한다. 라벨·화살표·받침 간격 규칙은 그대로 준수한다.
짧은 페이드와 미세한 이동을 사용한다. 종이 배경 고정, 구획선 뒤 내용 순차 등장. transition은 fade 또는 none, camera는 static, effects는 빈 배열을 우선한다.
손글씨·그라데이션·입체 카드·장식 아이콘은 사용하지 않는다. 사진 고정용 테이프는 1개만 사용한다. 조작과 반응을 설명하는 창·배너·커서 등의 SVG는 scene.uiMotion으로 추가할 수 있으며 shorts/docs/notebook-ui-motion.md를 따른다. 윤곽 스크리블은 기본으로 적용하고 라벨은 선명하게 유지한다. 본문 44px 이상을 목표로 짧게 쓰며 자막은 최대 두 줄 분량의 beats로 나눈다.
사진·도식이 없는 장면은 짧은 의미 단위로 headline을 줄바꿈하고 큰 타이포를 화면 중앙에 배치한다. 크기에 관계없이 모든 비어 있지 않은 headline에 도식과 같은 약한 스크리블을 0.1초 간격으로 적용한다. 글자 위치·줄바꿈은 고정하며 작은 자막·보조 문구·도식 라벨은 선명하게 유지한다. 워크플로우의 변경 전후·의존 관계·요청 흐름은 도식으로 적극 설명하되 원문 밖 경험·수치·운영 규칙을 만들지 않는다.
내레이션 사실·논리·존댓말 정책과 공통 CTA, 명시된 발표자 설정은 보존한다. 우측 하단 상시 발표자를 요청받으면 manifest.presenterOverlay를 보존하고 장면 presenter는 null로 둔다. 자막은 발표자 왼쪽 580px 공간에서 두 줄 이내로 읽히도록 의미 단위로 나눈다.`,
  },
] as const;

export type TemplateId = typeof templates[number]['id'];
export const DEFAULT_TEMPLATE: TemplateId = 'monochrome-editorial-dark';
export const listTemplates = () => templates.map(template => ({...template}));
export function getTemplate(id: string = DEFAULT_TEMPLATE) {
  const template = templates.find(template => template.id === id);
  if (!template) throw new Error(`Unknown shorts template: ${id}. Choose ${templates.map(t => t.id).join(', ')}`);
  return template;
}
export function resolveTemplate(manifest: {style?: {template?: string; theme?: string}}) {
  return getTemplate(manifest.style?.template ?? manifest.style?.theme ?? DEFAULT_TEMPLATE);
}
