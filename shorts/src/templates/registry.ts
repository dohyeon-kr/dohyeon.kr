import {templates as baseTemplates, DEFAULT_TEMPLATE as BASE_DEFAULT_TEMPLATE} from './registry-base.ts';

const auroraExplain = {
  id: 'aurora-explain',
  name: 'Aurora Explain · HyperFrames',
  renderer: 'editorial',
  engine: 'hyperframes',
  background: null,
  instructions: `선택된 템플릿은 aurora-explain이다. 어두운 설명형 HyperFrames 테마이며 발표자·원형 인물·립싱크를 사용하지 않는다.
근접한 검정 배경 위에 인디고·바이올렛·시안·마젠타의 큰 흐림 광원을 제한적으로 사용한다. 글래스모피즘은 장식 카드가 아니라 브라우저, 터미널, 모듈, 캐시, DB처럼 상태를 설명하는 의미 있는 표면에만 사용한다. 브라우저·DB·서버 등 익숙한 개발 오브젝트는 단순 문자나 이모지 대신 정밀한 SVG/HTML 오브젝트로 표현한다.
기존 candidate의 diagramSpec.nodes/events 계약을 그대로 사용한다. 임의 HTML을 생성하지 말고, 800×560 도식 좌표에서 라벨과 ID가 browser/client/frontend면 브라우저, db/database/repository/sql이면 데이터 저장소, cache/redis면 캐시, terminal/cli면 터미널, 나머지는 모듈로 읽힐 수 있도록 이름을 명확히 쓴다. 연결선은 line node와 connector를 사용하되 sourceSide/targetSide/gap으로 시각 위치를 보정하려 하지 않는다. Aurora renderer가 source와 target 노드의 중심을 직접 연결하며 비스케일 3.25px 점선과 한 번만 이동하는 짧은 pulse를 그린다. 연결선이 먼저 충분히 보인 뒤 pulse가 정확히 같은 궤적 위를 지나가야 하며, pulse가 선보다 먼저 나타나면 안 된다. Archify처럼 전체 토폴로지를 계속 번쩍이게 하지 말고, 현재 설명 중인 경로만 유한하게 한 번 통과시킨다. 도식에서 현재 설명 중인 경로나 노드가 바뀔 때는 화면 전체를 흔들지 말고 도식 stage만 1.05~1.10배 정도로 가볍게 zoom하고 해당 경로 쪽으로 pan해 시선을 유도한다. headline과 자막은 카메라 변환 대상에서 제외하고, 다음 핵심으로 넘어갈 때 부드럽게 이동하거나 충분한 시간이 있으면 원래 framing으로 복귀한다.
style.safeArea는 shorts-reels를 사용한다. 모든 비-line 도식 오브젝트의 실제 렌더 박스는 Aurora stage 안에 완전히 들어와야 하고, 애니메이션 전 구간에서 서로 최소 24px 이상 떨어져야 한다. x/y/width/height/scale/rotation 이벤트 중간 상태도 같은 규칙을 만족해야 한다. 이 규칙은 권고가 아니라 strict validation에서 실패하는 하드 규칙이다.
한 장면에는 하나의 설명 흐름을 두고 오브젝트를 유지한 채 상태가 바뀌는 방식으로 설명한다. headline은 짧게, subline은 보조 설명 한 덩어리만 둔다. 자막은 화면 하단의 고정 영역에서 한두 줄 구절 단위로 유지하고 긴 semantic beat 하나를 그대로 한 자막에 넣지 않는다.
애니메이션은 deterministic해야 한다. random, requestAnimationFrame 기반 시간, 무한 반복, hover/pointer tracking을 사용하지 않는다. 오로라 광원과 edge pulse는 유한한 GSAP timeline 변화만 사용한다.
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
