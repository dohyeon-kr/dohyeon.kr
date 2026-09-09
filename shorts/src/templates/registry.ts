export const templates = [
  {id: 'monochrome-editorial', name: 'Monochrome Editorial', renderer: 'editorial', background: null, instructions: ''},
  {id: 'monochrome-editorial-dark', name: 'Monochrome Editorial (default)', renderer: 'editorial', background: null, instructions: ''},
  {
    id: 'notebook-grid', name: 'Notebook Grid · 노트 그리드', renderer: 'notebook',
    background: 'templates/notebook-grid/paper.png',
    instructions: `선택된 템플릿은 notebook-grid이다. 다음은 이 템플릿의 시각 연출에 한해 기본 검정 배경·중앙 타이포 제한보다 우선한다.
미색 모눈 종이, 검정 고딕, 주황 강조, 2px 구획선과 선 끝 점, 4열 기반 1/2/4열 병합 구성이다.
한 장면 핵심 메시지 하나와 보조 구역 최대 2개. 첫 장면 headline은 전체 주제 제목, 이후 headline은 짧은 핵심 메시지 또는 빈 문자열. subline은 필요한 짧은 설명만 쓴다.
사진은 흰 인화지 여백(좌우·위 18px, 아래 40px)과 반투명 PNG 테이프 스티커로 노트에 붙인 듯 표시한다. 상단 중앙 테이프 1개, 약 50%가 사진 위에 걸치며 인물 얼굴·사진 속 중요 글자를 가리지 않는다. 이미지 검색은 테이프나 액자 합성이 없는 원본 사진을 찾는다. 이미지 자체에 흰 테두리·스티커·자막을 생성하지 않는다. 사진은 contain으로 원본을 보존하고 프레임은 그리드에 정렬한다. 테이프만 -4도 회전하며 원본 사진은 기울이지 않는다. 영상도 종이 위 넓은 영역에 표시한다. 비교는 compare-columns 또는 compare-versus, 도식은 diagram-centered, 마무리는 outro-minimal을 사용한다.
도식은 기존 800×560 좌표·흑백 스키마를 유지한다. 렌더러가 잉크 색상으로 변환한다. 라벨·화살표·받침 간격 규칙은 그대로 준수한다.
짧은 페이드와 미세한 이동을 사용한다. 종이 배경 고정, 구획선 뒤 내용 순차 등장. transition은 fade 또는 none, camera는 static, effects는 빈 배열을 우선한다.
손글씨·그라데이션·입체 카드·장식 아이콘은 사용하지 않는다. 스티커는 사진 고정용 테이프 1개만 사용한다. 본문 44px 이상을 목표로 짧게 쓰며 자막은 최대 두 줄 분량의 beats로 나눈다.
내레이션 사실·논리·존댓말 정책과 공통 CTA, 명시된 발표자 설정은 보존한다.`,
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
