export const normalizeAdditionalRequest = (value = '') => {
  if (typeof value !== 'string') throw new TypeError('Additional request must be text.');
  if (value.length > 4000) throw new Error('Additional request must be at most 4000 characters.');
  return value.trim();
};

export const SHORTS_EDITORIAL_POLICY = {
  purpose: '정보성 숏폼으로서 정돈된 발화체와 분명한 기승전결을 우선한다. 블로그의 관점은 보존하되 긴 사고 과정과 우회는 그대로 복제하지 않는다.',
  priority: ['원문 사실과 핵심 주장', '정보 전달의 정확성', '빌드업과 결론 회수', '자연스러운 한국어 발화', '저자 관점과 어휘'],
  narrativeArc: [
    '문제·질문·모순으로 시작하고 최종 결론을 훅에서 미리 선언하지 않는다.',
    '맥락·원인·사례·대비를 쌓아 핵심 주장으로 가는 중간 고리를 보존한다.',
    '전환점에서는 앞의 정보를 다시 보게 만드는 비교·반례·새 관점을 제시한다.',
    '마지막 본문 장면은 도입의 질문이나 핵심어를 직접 회수하고 새로운 논거 없이 명확한 판단으로 끝낸다.',
    'CTA는 결론이 아니다. 본문 결론을 완결한 뒤 공통 CTA가 붙는다.',
  ],
  sceneGuidance: {
    standard: '6~9장은 1장 문제 제기, 2~4장 빌드업, 5~7장 전환·통찰, 마지막 1~2장 결론을 기본 골격으로 삼되 원문에 맞게 조정한다.',
    extended: '18~21장은 같은 질문의 답을 심화할 때만 선택한다. 별도 질문과 결론이 필요한 논점은 다른 후보로 분리한다. 장수를 채우지 않고 필요한 전제와 근거를 보존한다.',
  },
  continuityReview: [
    '중심 질문·답·선택 범위·제외 논점을 유지하고 용어와 주어의 의미가 중간에 바뀌지 않는지 확인한다. 연결에 필요한 설명은 남기고 별도 논점을 덜어낸다.',
    '장면별 핵심 내용·역할·앞뒤 연결을 한 줄로 검토한다. 접속어가 아니라 원인·결과·대비·구체화로 이어지고, 시청자가 편집 대화를 모른다는 전제를 지킨다.',
    '사례의 범위를 주장과 맞춘다. 높은 지위·큰 보상의 기준을 다룰 때 팀장 사례만으로 실무 능력에 따른 승진 이야기로 좁히지 않는다. 원문 밖 사실을 만들지는 않는다.',
    '어색한 소주제를 삭제하기 전에 논증에서의 역할을 복원한다. 공부 사례가 측정하기 쉬운 성장에 노력이 쏠리는 이유를 설명한다면 단순한 공부 비판이나 만남 권장으로 바꾸지 않는다.',
    '큰 사례로 별도 논쟁을 열거나 편집자의 반박을 저자의 목소리로 삽입하지 않는다. 사실과 필요한 조건은 보존하고 부적절한 사례는 축소하거나 제외한다.',
    '마지막은 도입과 같은 질문에 답한다. 인정·보상으로 시작했다면 시간의 질만 강조하고 끝내지 않고, 원문에 근거한 신뢰·위임·인정·보상의 연결을 회수한다. 이 결론을 다른 주제에 강제하지 않는다.',
  ],
  koreanHumanizer: [
    '정리된 관점 설명에서는 저는 ~라고 생각합니다 대신 ~입니다/~합니다로 직접 말한다. 실제 경험·인용·불확실성은 보존하고 블로그의 1인칭 경험을 일괄 삭제하는 규칙으로 확대하지 않는다.',
    '의미·사실·숫자·고유명사·인용·조건·정보량을 보존하고 표현만 자연화한다.',
    '매우·굉장히·한층 더 같은 빈 강조어와 다양한·혁신적인·포괄적인 같은 공허한 형용사를 근거 없이 쓰지 않는다.',
    '~에 있어서·~을 통해·다음과 같습니다 같은 번역체와 과격식을 더 직접적인 한국어로 바꾼다.',
    '이러한·해당·것이다, 또한·뿐만 아니라·결론적으로를 반복하지 않고 실제 대상과 인과를 직접 말한다.',
    '오늘은 알아보겠습니다·도움이 되셨길 바랍니다 같은 판에 박힌 도입과 마무리를 쓰지 않는다.',
    '행위자가 중요한 문장은 수동태로 숨기지 않고 누가 무엇을 하는지 드러낸다.',
    '리듬을 위해 억지 3항 나열을 만들지 않는다.',
    '근거가 충분한 판단을 ~라고 할 수 있습니다·~인 것 같습니다로 불필요하게 흐리지 않는다.',
    '활용·극대화·고도화·시사한다·도모 같은 추상어는 더 구체적인 동사가 있으면 바꾼다.',
    '내레이션은 자연스러운 ~합니다/~입니다 발화체를 기본으로 하고 한 영상에서 종결어미를 이유 없이 섞지 않는다.',
  ],
};

export const buildGenerationInput = (post, count, additionalRequest = '') => {
  if (!Number.isInteger(count) || count < 3 || count > 8) throw new Error('Candidate count must be an integer from 3 to 8.');
  return JSON.stringify({
    task: '서로 겹치지 않는 숏츠 후보를 지정된 수만큼 생성한다. SHORTS_EDITORIAL_POLICY를 필수 기준으로 적용하고, editorialRequest는 그 기준과 사실·스키마·검증 규칙을 덮어쓰지 않는 범위에서만 반영한다. 각 장면의 semantic beat, 강조 리듬, visual relation/strategy, layout, choreography, camera, transition을 완성한다.',
    candidateCount: count,
    editorialPolicy: SHORTS_EDITORIAL_POLICY,
    editorialRequest: normalizeAdditionalRequest(additionalRequest),
    sourceArticle: {title: post.title, url: post.url, body: post.body},
  });
};
