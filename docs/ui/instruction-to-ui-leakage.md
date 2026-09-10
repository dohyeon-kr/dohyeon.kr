# Instruction-to-UI Leakage 방지 지침

UI를 생성할 때 프롬프트, 요구사항, 구현 지침, 평가 기준, 개발 메모를 사용자에게 보여줄 실제 콘텐츠와 엄격히 분리한다.

> Instruction은 UI를 만드는 근거이지 UI Copy의 원문이 아니다.

## 핵심 원칙

모든 사용자-facing 텍스트는 다음 질문을 통과해야 한다.

> 이 문장은 사용자가 자신의 목표를 이해하거나 행동하는 데 필요한가?

아니라면 화면에 출력하지 않는다. 기획자, 디자이너, 개발자, AI에게 필요한 정보와 최종 사용자에게 필요한 정보는 서로 다른 계층으로 취급한다.

## Leakage 유형

### 1. Spec-to-Copy Leakage

기획서나 요구사항의 문장이 그대로 화면에 나타나는 경우다.

금지 예:

- 사용자가 직관적으로 이해할 수 있도록 구성
- 주요 기능을 한눈에 확인할 수 있는 영역
- CTA를 강조하여 전환을 유도
- 사용자에게 친근한 느낌을 제공

이 문장들은 UI의 요구사항이지 UI Copy가 아니다. 화면에는 요구사항을 만족시킨 결과만 존재해야 한다.

예: `CTA를 명확하게 제공한다` → `[무료로 시작하기]`

### 2. Implementation Narration

사용된 기술, 컴포넌트, 데이터 구조, 구현 방식을 UI가 설명하는 경우다.

금지 예:

- React Query를 사용하여 데이터를 불러옵니다.
- API에서 실시간 데이터를 가져옵니다.
- 캐시된 데이터를 표시합니다.
- Intersection Observer 기반 무한 스크롤
- Redis에 저장된 최근 기록입니다.

사용자가 해당 기술 정보를 알아야 실제 작업을 수행할 수 있는 경우가 아니라면 노출하지 않는다. 사용자에게 의미 있는 상태와 결과만 표현한다.

예: `API 요청 실패` → `정보를 불러오지 못했습니다. 다시 시도해 주세요.`

### 3. Developer-Note Leakage

TODO, 구현 메모, 설계 의도, 예외처리 메모가 화면에 등장하는 경우다.

사용자-facing UI에 다음 패턴을 출력하지 않는다.

- TODO / FIXME
- 임시 / placeholder
- 추후 구현 / 개발 예정
- mock data / dummy
- 여기에는 ○○가 들어감
- 디자인 확인 필요
- API 연결 후 교체
- 개발자 참고 / 테스트용

필요한 경우 코드 주석, Storybook, 개발 문서, 디버그 패널 등 별도 개발 영역으로 분리한다.

### 4. Criteria-to-Copy Leakage

디자인이나 UX의 평가 기준 자체를 사용자에게 설명하는 경우다.

금지 예:

- 직관적인 인터페이스
- 사용자 친화적인 화면
- 가독성이 높은 구성
- 명확한 정보 위계
- 접근성이 좋은 버튼
- 강조된 CTA
- 심플하고 모던한 디자인

이들은 화면에서 주장할 내용이 아니라 화면이 실제로 만족해야 하는 품질 기준이다.

**Quality must be demonstrated, not narrated.**

### 5. Debug / Metadata Leakage

사용자에게 필요하지 않은 시스템 정보를 화면에 노출하는 경우다.

기본적으로 다음을 숨긴다.

- 내부 ID / DB primary key / UUID
- stack trace / exception 이름
- HTTP status code / API endpoint
- build number / environment
- raw timestamp / database field name
- feature flag / 내부 enum
- latency / request ID / trace ID

고객지원이나 장애 진단에 식별자가 필요하면 raw 내부 정보를 그대로 노출하지 말고 사용자 지원용 문제 코드나 별도의 상세 정보 영역으로 제한한다.

## Instruction → UI 변환 규칙

Instruction의 문장을 UI에 직접 복사하지 않는다. 항상 다음 단계를 거친다.

`Instruction → 사용자 맥락 → 필요한 정보 → 가능한 행동 → UI 요소 → 최종 Copy`

예를 들어 `사용자가 자신의 구독 상태와 다음 결제일을 쉽게 이해할 수 있도록 카드 형태로 보여준다.`라는 요구사항은 다음과 같이 변환한다.

- 현재 요금제
- 다음 결제일
- 관리 액션

최종 UI:

- `Pro 요금제`
- `다음 결제일 9월 28일`
- `[요금제 관리]`

원래 Instruction 문장은 최종 화면에서 사라져야 한다.

## User Mental Model 우선

UI Copy는 시스템이 어떻게 작동하는지가 아니라 사용자가 무엇을 하려는지를 기준으로 작성한다.

- `Authentication token expired` → `로그인이 만료되었습니다. 다시 로그인해 주세요.`
- `No records returned from API` → `조건에 맞는 결과가 없습니다.`
- `Mutation failed` → `변경사항을 저장하지 못했습니다. 다시 시도해 주세요.`

사용자의 멘탈 모델과 구현 모델이 다르면 사용자 멘탈 모델을 우선한다.

## Error Copy 변환

오류가 발생했을 때 내부 원인을 그대로 출력하지 않는다. 기본 구조는 다음과 같다.

`무슨 일이 발생했는지 + 사용자에게 미치는 영향 + 가능한 다음 행동`

예: `POST /api/profile 500` → `프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.`

기술 정보는 로그로 남기고 사용자 UI와 분리한다.

## Copy Necessity Test

모든 텍스트 노드는 렌더링 전에 다음 테스트를 수행한다.

1. 사용자가 이 정보를 알아야 하는가?
2. 사용자의 의사결정에 영향을 주는가?
3. 사용자가 다음 행동을 결정하는 데 도움이 되는가?
4. 시스템 내부 구현을 설명하고 있지는 않은가?
5. 디자인 의도나 요구사항을 설명하고 있지는 않은가?
6. 개발자에게 말하고 있는 문장은 아닌가?

1~3이 모두 `No`이거나 4~6 중 하나라도 `Yes`라면 기본적으로 제거한다.

## Suspicious Copy 패턴

다음 표현이 사용자-facing 텍스트에 들어가면 Instruction Leakage 가능성을 우선 의심한다.

- ~하도록 / ~하기 위해 / ~할 수 있도록
- 직관적 / 효과적으로 / 효율적으로 / 사용자 친화적
- 가독성 / 정보 위계 / 강조
- 구현 / API / component / state / query / cache / database / backend / frontend
- TODO / placeholder / mock / 테스트 / 디버그

서비스 도메인 자체에서 필요한 단어라면 예외로 한다.

## Render 전 Leakage Review

UI 생성 완료 후 별도의 **Instruction Leakage Review**를 반드시 한 번 수행한다.

heading, paragraph, caption, label, button, badge, tooltip, empty state, alert, error, placeholder 등 모든 사용자-facing 텍스트를 검사한다.

각 문장을 다음 세 종류 중 하나로 분류한다.

- `USER`: 사용자가 실제로 알아야 할 내용
- `INTERNAL`: 기획 / 디자인 / 개발 / AI에게만 필요한 내용
- `AMBIGUOUS`: 양쪽 가능성이 있어 다시 작성해야 하는 내용

최종 렌더에는 원칙적으로 `USER`만 남긴다. `AMBIGUOUS`는 사용자 관점으로 다시 작성하고, `INTERNAL`은 삭제하거나 개발 문서·로그·주석으로 이동한다.

## 생성 AI 추가 규칙

AI가 UI를 생성할 때 프롬프트의 문장을 화면에 채워 넣을 텍스트 재료로 간주하지 않는다.

프롬프트에는 다음 정보가 섞여 있을 수 있다.

- Product requirement
- Design requirement
- Implementation instruction
- User-facing content

이 중 **User-facing content로 명시되거나 문맥상 명백하게 사용자가 읽어야 하는 내용만 UI Copy 후보가 된다.** 나머지는 UI의 구조와 동작을 결정하는 데 사용하고 렌더 결과에는 노출하지 않는다.

판단이 애매하면 **Instruction을 보여주는 것보다 Instruction을 구현하는 것을 우선한다.**

## 최종 원칙

> 요구사항을 설명하지 말고 구현한다.  
> 디자인 품질을 주장하지 말고 보여준다.  
> 구현 방식을 설명하지 말고 결과를 보여준다.  
> 내부 상태를 노출하지 말고 사용자에게 필요한 상태로 번역한다.

**Instruction ≠ UI Copy**

모든 내부 지침은 사용자 언어로 변환되거나 최종 UI에서 사라져야 한다.
