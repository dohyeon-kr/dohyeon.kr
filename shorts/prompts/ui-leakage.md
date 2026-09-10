Instruction-to-UI Leakage 방지 정책:

화면을 만들기 위한 내부 지시와 실제 사용자에게 보여줄 문구를 분리한다. 핵심 원칙은 **Instruction을 Copy로 번역하지 말고, Instruction을 UI로 구현한다**이다. 요구사항은 화면에 쓰는 글이 아니라 화면이 만족해야 하는 조건이다.

다음 다섯 유형을 검사한다.
1. Spec-to-Copy Leakage: 기획·요구사항 문장이 headline, subline, label, diagram text, caption 등 사용자 노출 문구로 전이됨.
2. Implementation Narration: React, API 호출, WebSocket, Grid, 컴포넌트 구조 등 사용자가 알 필요 없는 구현 방식을 화면에서 설명함.
3. Developer-Note Leakage: TODO, placeholder, 개발자 메모, 배치 지시, 애셋 사용 지시, 작업 상태가 화면에 노출됨.
4. Criteria-to-Copy Leakage: 직관적, 명확한, 사용자 친화적, 가독성 높은, 자연스러운 흐름 등 품질 평가 기준을 사용자 문구로 주장함.
5. Debug/Metadata Leakage: componentId, 상태 플래그, 내부 경로, prompt/version, layout metadata, raw error, stack trace 등 진단 정보를 화면에 노출함.

생성 규칙:
- instruction/spec 문장을 UI 문구 후보로 직접 재사용하지 않는다.
- 먼저 내부 지시의 목적을 user intent/product intent로 환원하고, 사용자가 알아야 할 정보와 다음 행동만 새로 작성한다.
- `명확하게 보여줘`는 더 명확한 레이아웃으로, `강조해줘`는 시각적 강조로, `직관적으로`는 정보 구조와 상호작용으로 구현한다. 그 표현 자체를 화면에 쓰지 않는다.
- 구현 기술은 사용자의 행동·의사결정에 실제로 필요한 경우에만 표시한다. 그렇지 않으면 기술이 주는 사용자 결과로 바꾼다.
- 내부 메모를 자연스럽게 paraphrase해서 살려두지 않는다. 사용자에게 필요 없으면 삭제한다.
- placeholder가 필요하면 내부 데이터 타입으로 표현하고 `여기에 이미지가 들어갑니다` 같은 설명문을 렌더링하지 않는다.
- 오류 문구는 raw diagnostic 대신 사용자가 이해하고 다음 행동을 정할 수 있는 메시지로 변환한다.
- headline/subline/narration/beats/diagram labels/captions/CTA 등 실제 렌더 가능한 모든 문자열에 동일하게 적용한다.

문구 생성 전 체크:
- 이 문장은 제품을 사용하는 사람에게 필요한가?
- 이 문장은 오히려 화면을 만드는 사람에게 필요한 정보인가?
- 이 문장을 없애도 사용자가 다음 행동을 정확히 할 수 있는가?
- 화면의 품질을 설명하고 있는가, 실제 정보를 전달하고 있는가?
- 구현 방식을 말하는 대신 사용자 결과를 말할 수 있는가?

의심 표현 예시: 요구사항, 기획, 레이아웃, 배치, 구현, 컴포넌트, CTA, 디자인, 가독성, 직관적, 사용자 친화적, 강조, 영역, 스타일, 인터페이스, responsive, component, layout, implementation, placeholder, TODO. 단순 문자열 매칭으로 판정하지 말고 문맥상 내부 지시가 노출되었는지 판단한다.

검수 시 실제 렌더 가능한 문자열 각각을 PASS / SPEC_LEAK / IMPLEMENTATION_LEAK / DEVELOPER_NOTE_LEAK / CRITERIA_LEAK / DEBUG_METADATA_LEAK / SUSPICIOUS 관점으로 확인한다. Leakage가 있으면 내부 지시를 예쁘게 고치는 것이 아니라 사용자 목적을 다시 추론해 UI 문구만 재작성하거나 삭제한다.

예:
- `직관적인 CTA를 배치한다` → `시작하기` 또는 문구 추가 없이 버튼 계층을 조정한다.
- `API를 호출하여 실시간으로 갱신합니다` → 필요하다면 `새 내용이 자동으로 반영됩니다`.
- `여기에 대표 이미지 배치` → 해당 이미지를 배치하되 이 문장은 렌더하지 않는다.
- `FILE_TOO_LARGE: MAX_10485760` → `10MB 이하의 파일을 업로드해주세요.`

최종 원칙: **Show the result, not the instruction.**
