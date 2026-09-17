import {templates as baseTemplates, DEFAULT_TEMPLATE as BASE_DEFAULT_TEMPLATE} from './registry-base.ts';

const auroraExplain = {
  id: 'aurora-explain',
  name: 'Aurora Explain · HyperFrames',
  renderer: 'editorial',
  engine: 'hyperframes',
  background: null,
  instructions: `선택된 템플릿은 aurora-explain이다. 어두운 설명형 HyperFrames 테마이며 발표자·원형 인물·립싱크를 사용하지 않는다.
근접한 검정 배경 위에 인디고·바이올렛·시안·마젠타의 큰 흐림 광원을 제한적으로 사용한다. 글래스모피즘은 장식 카드가 아니라 브라우저, 터미널, 모듈, 캐시, DB처럼 상태를 설명하는 의미 있는 표면에만 사용한다. 브라우저·DB·서버 등 익숙한 개발 오브젝트는 단순 문자나 이모지 대신 정밀한 SVG/HTML 오브젝트로 표현한다.
기존 candidate의 diagramSpec.nodes/events 계약을 그대로 사용한다. 임의 HTML을 생성하지 말고, 800×560 도식 좌표에서 라벨과 ID가 browser/client/frontend면 브라우저, db/database/repository/sql이면 데이터 저장소, cache/redis면 캐시, terminal/cli면 터미널, 나머지는 모듈로 읽힐 수 있도록 이름을 명확히 쓴다. 연결선은 line node와 connector를 사용하고, 개념 진행은 opacity/scale 등 기존 events로 순차적으로 보여준다.
한 장면에는 하나의 설명 흐름을 두고 오브젝트를 유지한 채 상태가 바뀌는 방식으로 설명한다. headline은 짧게, subline은 보조 설명 한 덩어리만 둔다. 자막은 화면 하단의 고정 영역에서 한두 줄 의미 단위로 유지한다.
애니메이션은 deterministic해야 한다. random, requestAnimationFrame 기반 시간, 무한 반복, hover/pointer tracking을 사용하지 않는다. 오로라 광원은 유한한 GSAP timeline 변화만 사용한다.
공통 CTA의 문구 의도는 유지하되 Aurora 전용 smoked-glass CTA로 렌더링한다. 원문에 없는 사실·수치·경험은 만들지 않는다.`,
} as const;

export const templates = [...baseTemplates, auroraExplain] as const;
export type TemplateId = typeof templates[number]['id'];
export const DEFAULT_TEMPLATE: TemplateId = BASE_DEFAULT_TEMPLATE;
export const listTemplates = () => templates.map(template => ({...template}));
export function getTemplate(id: string = DEFAULT_TEMPLATE) {
  const template = templates.find(template => template.id === id);
  if (!template) throw new Error(`Unknown shorts template: ${id}. Choose ${templates.map(t => t.id).join(', ')}`);
  return template;
}
export function resolveTemplate(manifest: {style?: {template?: string; theme?: string}}) {
  return getTemplate(manifest.style?.template ?? manifest.style?.theme ?? DEFAULT_TEMPLATE);
}
