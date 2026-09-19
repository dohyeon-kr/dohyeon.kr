# UseCase·Domain·Repository 설계부터 동시성까지

**템플릿:** Aurora Explain · HyperFrames (aurora-explain)

원본: [candidate-01.json](https://github.com/dohyeon-kr/dohyeon.kr/blob/9b7a9dede77749dc8d8fa36cb12eea09ba8910bf/shorts/content/usecase-domain-repository-seolgyebuteo-dongsiseongggaji/candidate-01.json)

JSON에서 자동 생성한 검토용 스토리보드입니다. 수정은 원본 JSON에 반영한 뒤 다시 생성하세요. 연출 설명은 기획 의도이며, 실제 배치·동작은 렌더된 스냅샷과 영상으로 확인합니다. 음성 생성 전이므로 재생 시간은 확정하지 않습니다.

**첫 문장:** 기능 하나 고치는데, 이 로직은 어디에 둬야 할까요?

**기획 의도:** 백엔드 구조 설명부터 바로 시작하지 않고, 기능을 수정할 때 로직의 위치가 애매해지는 익숙한 문제를 커버로 먼저 제시한다. 이후 UseCase·Domain·Repository의 책임을 나누는 흐름이 상태의 복원·계산·기록과 동시성 문제로 이어지는 과정을 도식 중심으로 설명한다. 마지막에는 문장을 반복하는 카드 대신 Layer × N과 Restore → Compute → Record의 대비 도식으로 ‘계층 수보다 책임 경계’라는 결론을 시각화한다.

**원문:** [UseCase·Domain·Repository 설계와 동시성 처리](<https://blog.dohyeon.kr/usecase-domain-repository-seolgyebuteo-dongsiseongggaji/>)

## 1. 도입 — 기능 하나 고치는데, 이 로직은 어디에 둬야 할까요?

![장면 1](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-01.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-01.png)

**내레이션**

백엔드 코드를 고치다 보면 비슷한 고민이 반복됩니다. 이 로직은 UseCase에 둘지, Domain에 둘지, Repository에 둘지 애매해집니다.

**화면 구성**

- 주 문구: 기능 하나 고치는데, 이 로직은 어디에 둬야 할까요?
- 배치: 도식을 중앙에 배치
- 전달할 관계: 하나의 기능 변경이 UseCase, Domain, Repository 세 선택지로 갈라진다.
- 표현 방식: 공간 도식
- 표현 이유: 전문 용어 설명 전에 익숙한 선택 문제를 한 장으로 보여준다.
- 도식 구성: 사각형 ‘기능 수정’, 사각형 ‘UseCase’, 사각형 ‘Domain’, 사각형 ‘Repository’, 선, 선, 선

**연출 흐름**

- 시작: 기능 수정 하나가 왼쪽에 나타난다.
- 사건: 이 로직을 어디에 둘지 묻는다.
- 변화: UseCase, Domain, Repository 세 방향으로 얇은 연결선이 갈라지며 선택의 애매함을 보여준다.
- 유지: 설명 문구를 늘리지 않고 세 선택지만 남긴다.
- 결과: 시청자가 백엔드 계층 이름보다 먼저 ‘로직의 위치가 애매한 경험’에 공감하도록 만든다.

1. 추가 연출 지시: show-change
2. 추가 연출 지시: branch-options

도식에서 설정된 변화(시작 순서):

- 기능 수정: 커짐
- 선: 점차 드러남
- 선: 점차 드러남
- 선: 점차 드러남

카메라: 고정

장면 전환: 없음

라이트 효과:

- 경로를 흐르는 빛 · 대상 to-usecase · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 to-domain · 970ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 to-repository · 1390ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **백엔드 코드를 고치다 보면 비슷한 고민이 반복됩니다.**
   - 강조 강 · 자연스럽게 · 뒤에 120ms 쉼
   - 강조 단어: **기능 수정** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: change
2. **이 로직은 UseCase에 둘지, Domain에 둘지, Repository에 둘지 애매해집니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **어디에** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: placement-question

## 2. 도입 — 역할을 나누기 시작하면, 상태의 흐름이 보입니다.

![장면 2](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-02.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-02.png)

**내레이션**

처음에는 백엔드 계층의 역할을 어떻게 나눌지 고민했습니다. 그런데 상태를 누가 복원하고, 계산하고, 기록하는지 구분하기 시작하면서 동시성 문제까지 이어졌습니다.

**화면 구성**

- 주 문구: 역할을 나누기 시작하면, 상태의 흐름이 보입니다.
- 보조 문구: Request → UseCase → Engine → Repository
- 배치: 도식을 중앙에 배치
- 전달할 관계: 기존 Request → UseCase → Engine → Repository 흐름을 먼저 보여준다.
- 표현 방식: 공간 도식
- 표현 이유: 원문의 아키텍처 흐름을 Aurora의 의미 오브젝트와 연결선으로 직접 설명한다.
- 도식 구성: 사각형 ‘Request’, 사각형 ‘UseCase’, 사각형 ‘Engine’, 사각형 ‘Repository’, 선, 선, 선

**연출 흐름**

- 시작: Request부터 Repository까지 네 개의 핵심 오브젝트만 보여준다.
- 사건: 상태를 누가 복원하고 계산하고 기록하는지 묻는다.
- 변화: 요청 흐름의 연결선이 순서대로 켜지고 마지막에 DB가 등장한다.
- 유지: 계층 순서와 하단 자막 영역은 고정한다.
- 결과: 계층 이름 자체보다 상태가 이동하는 흐름을 먼저 보이게 한다.

1. 주 문구 등장
2. 추가 연출 지시: reveal-request-flow

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 선: 점차 드러남
- Repository: 커짐

카메라: 고정

장면 전환: 없음

라이트 효과:

- 경로를 흐르는 빛 · 대상 request-flow · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 domain-flow · 970ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 persist-flow · 1390ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **처음에는 백엔드 계층의 역할을 어떻게 나눌지 고민했습니다. 그런데 상태를 누가 복원하고, 계산하고, 기록하는지 구분하기 시작하면서 동시성 문제까지 이어졌습니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **동시성**
   - 연출 의도: request-flow

## 3. 비교 — UseCase는 흐름을, Domain은 규칙을 봅니다.

![장면 3](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-03.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-03.png)

**내레이션**

Domain Test는 State에서 Rule을 거쳐 Result가 맞는지를 봅니다. UseCase Test는 Read, Orchestrate, Write, Side Effect의 흐름을 봅니다.

**화면 구성**

- 주 문구: UseCase는 흐름을, Domain은 규칙을 봅니다.
- 보조 문구: UseCase = 흐름 · Domain = 규칙
- 배치: 도식을 중앙에 배치
- 비교: Domain · State → Rule → Result ↔ UseCase · Read → Orchestrate → Write → Side Effect
- 전달할 관계: UseCase Test와 Domain Test가 보는 대상을 나눈다.
- 표현 방식: 공간 도식
- 표현 이유: 원문의 Domain Test와 UseCase Test 구분을 두 개의 의미 오브젝트로 압축한다.
- 도식 구성: 사각형 ‘UseCase’, 사각형 ‘Domain’, 선

**연출 흐름**

- 시작: UseCase와 Domain 두 개의 패널이 나란히 놓인다.
- 사건: 각 계층을 테스트할 때 보는 질문을 비교한다.
- 변화: UseCase에서 Domain으로 연결되는 선이 켜진다.
- 유지: UseCase와 Domain을 하나의 책임으로 합치지 않는다.
- 결과: UseCase는 흐름, Domain은 규칙이라는 차이를 남긴다.

1. 추가 연출 지시: show-usecase
2. 추가 연출 지시: connect-domain

도식에서 설정된 변화(시작 순서):

- UseCase: 점차 드러남
- 선: 점차 드러남
- Domain: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 orchestrate · 550ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **Domain Test는 State에서 Rule을 거쳐 Result가 맞는지를 봅니다. UseCase Test는 Read, Orchestrate, Write, Side Effect의 흐름을 봅니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **책임** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: orchestrate

## 4. 핵심 메시지 — 상태를 누가 읽고, 계산하고, 기록할까요?

![장면 4](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-04.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-04.png)

**내레이션**

Repository가 상태를 복원하고, UseCase가 흐름을 조율하고, Domain이 계산하고, 다시 Repository가 기록하도록 책임을 나눴습니다.

**화면 구성**

- 주 문구: 상태를 누가 읽고, 계산하고, 기록할까요?
- 보조 문구: Restore → Compute → Record
- 배치: 도식을 중앙에 배치
- 전달할 관계: 상태를 복원하고 계산하고 기록하는 책임을 분리한다.
- 표현 방식: 공간 도식
- 표현 이유: 상태가 계층 사이를 이동하는 순서를 직접 보여주는 것이 핵심이다.
- 도식 구성: 사각형 ‘Repository · Read’, 사각형 ‘UseCase’, 사각형 ‘Domain’, 사각형 ‘Repository · Write’, 선, 선, 선

**연출 흐름**

- 시작: Repository Read, UseCase, Domain, Repository Write가 한 줄에 놓인다.
- 사건: 상태의 생명주기를 순서대로 설명한다.
- 변화: 복원, 계산, 기록 연결이 차례로 켜진다.
- 유지: 각 단계의 책임 주체는 고정한다.
- 결과: Domain에서 저장 책임을 제거했을 때 얻는 순수성을 보여준다.

1. 추가 연출 지시: restore
2. 추가 연출 지시: compute
3. 추가 연출 지시: record

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 선: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 restore · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 compute · 970ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 record · 1390ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **Repository가 상태를 복원하고, UseCase가 흐름을 조율하고, Domain이 계산하고, 다시 Repository가 기록하도록 책임을 나눴습니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **상태**
   - 연출 의도: state-lifecycle

## 5. 핵심 메시지 — Engine은 필수 계층이 아니라, UseCase가 선택하는 도구입니다.

![장면 5](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-05.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-05.png)

**내레이션**

Engine은 반드시 통과해야 하는 계층이 아니었습니다. Domain computation이 필요할 때 UseCase가 선택하는 도구로 보는 편이 자연스러웠습니다.

**화면 구성**

- 주 문구: Engine은 필수 계층이 아니라, UseCase가 선택하는 도구입니다.
- 보조 문구: 필요할 때만 Engine
- 배치: 도식을 중앙에 배치
- 전달할 관계: UseCase가 계산 필요 여부에 따라 Engine 또는 Repository operation을 선택한다.
- 표현 방식: 공간 도식
- 표현 이유: 원문의 Engine에 대한 결론을 분기 구조로 보여준다.
- 도식 구성: 사각형 ‘UseCase’, 사각형 ‘Engine · Domain computation’, 사각형 ‘Repository · Atomic operation’, 선, 선

**연출 흐름**

- 시작: UseCase에서 Repository로 가는 직접 경로와 Engine을 거치는 경로를 동시에 둔다.
- 사건: Domain computation이 필요한 경우만 Engine을 선택한다고 설명한다.
- 변화: Engine 경로가 켜진 뒤 직접 Repository 경로도 함께 남는다.
- 유지: Engine을 항상 통과하는 필수 계층처럼 표현하지 않는다.
- 결과: Engine을 UseCase가 상황에 따라 선택하는 도구로 재정의한다.

1. 추가 연출 지시: show-usecase
2. 추가 연출 지시: choose-engine
3. 추가 연출 지시: show-direct-operation

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- Engine · Domain computation: 커짐
- 선: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 choose-engine · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 direct-operation · 970ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **Engine은 반드시 통과해야 하는 계층이 아니었습니다. Domain computation이 필요할 때 UseCase가 선택하는 도구로 보는 편이 자연스러웠습니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **Engine**
   - 연출 의도: optional-engine

## 6. 핵심 메시지 — 순수한 Domain 바깥에는 동시성의 창이 생깁니다.

![장면 6](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-06.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-06.png)

**내레이션**

Domain을 순수하게 만들면 테스트는 쉬워집니다. 하지만 상태를 읽고 다시 기록하는 사이에 다른 요청이 끼어들 수 있습니다.

**화면 구성**

- 주 문구: 순수한 Domain 바깥에는 동시성의 창이 생깁니다.
- 보조 문구: Read → Compute → Write
- 배치: 도식을 중앙에 배치
- 전달할 관계: 두 요청이 같은 상태를 읽고 같은 저장 지점으로 수렴한다.
- 표현 방식: 공간 도식
- 표현 이유: 동시성 문제를 추상 문장보다 두 요청의 병렬 흐름으로 보여준다.
- 도식 구성: 사각형 ‘Request A’, 사각형 ‘Request B’, 사각형 ‘Read → Compute’, 사각형 ‘Read → Compute’, 사각형 ‘Same State’, 선, 선, 선, 선

**연출 흐름**

- 시작: 두 요청이 같은 상태를 동시에 읽는 두 갈래 흐름을 보여준다.
- 사건: 상태 복원과 기록 사이의 시간 창을 강조한다.
- 변화: Request A와 Request B의 연결이 같은 DB로 수렴한다.
- 유지: 두 요청 모두 같은 초기 상태를 읽었다는 관계를 유지한다.
- 결과: Domain을 순수하게 만들수록 외부 상태의 동시성 경계가 중요해진다는 문제를 보여준다.

1. 추가 연출 지시: read-a
2. 추가 연출 지시: read-b
3. 추가 연출 지시: write-a
4. 추가 연출 지시: write-b

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 선: 점차 드러남
- 선: 점차 드러남
- Same State: 커짐

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 read-a · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 read-b · 970ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 write-a · 1390ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 write-b · 1810ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **Domain을 순수하게 만들면 테스트는 쉬워집니다. 하지만 상태를 읽고 다시 기록하는 사이에 다른 요청이 끼어들 수 있습니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **동시성** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: concurrency-race

## 7. 핵심 메시지 — 단순한 경쟁은 원자적 연산으로 줄일 수 있습니다.

![장면 7](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-07.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-07.png)

**내레이션**

경쟁 조건이 핵심인 단순 변경이라면 Repository의 atomic operation을 직접 호출하는 편이 더 자연스러울 수 있습니다.

**화면 구성**

- 주 문구: 단순한 경쟁은 원자적 연산으로 줄일 수 있습니다.
- 보조 문구: Repository · tryDecrease()
- 배치: 도식을 중앙에 배치
- 전달할 관계: 동시에 들어온 요청을 DB의 원자적 변경 연산으로 모은다.
- 표현 방식: 공간 도식
- 표현 이유: 원문에 등장하는 tryDecrease 형태를 실제 흐름으로 표현한다.
- 도식 구성: 사각형 ‘Request A’, 사각형 ‘Request B’, 사각형 ‘Repository · tryDecrease()’, 사각형 ‘Atomic Update’, 선, 선, 선

**연출 흐름**

- 시작: 두 요청이 하나의 Repository atomic operation으로 모인다.
- 사건: tryDecrease 같은 원자적 변경을 Repository가 제공하는 경우를 설명한다.
- 변화: Repository에서 DB로 향하는 단일 연결만 활성화된다.
- 유지: 비즈니스 규칙 전체를 SQL에 넣는 것으로 과장하지 않는다.
- 결과: 단순한 경쟁 조건은 저장소의 원자적 연산으로 줄일 수 있음을 보여준다.

1. 추가 연출 지시: merge-requests
2. 추가 연출 지시: atomic-write

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- Repository · tryDecrease(): 커짐
- 선: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 atomic-a · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 atomic-b · 970ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 atomic-write · 1390ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **경쟁 조건이 핵심인 단순 변경이라면 Repository의 atomic operation을 직접 호출하는 편이 더 자연스러울 수 있습니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **atomic operation**
   - 연출 의도: atomic-operation

## 8. 핵심 메시지 — 원자화를 너무 밀면, 책임이 다시 흐려질 수 있습니다.

![장면 8](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-08.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-08.png)

**내레이션**

반대로 모든 변경을 Repository의 atomic SQL로 밀어 넣으면 동시성은 단순해질 수 있지만, Persistence Layer가 Application의 비즈니스 로직을 흡수하기 시작합니다.

**화면 구성**

- 주 문구: 원자화를 너무 밀면, 책임이 다시 흐려질 수 있습니다.
- 보조 문구: 동시성 단순화 ↔ 책임 집중
- 배치: 도식을 중앙에 배치
- 전달할 관계: 동시성 단순화와 Persistence Layer의 책임 증가를 함께 본다.
- 표현 방식: 공간 도식
- 표현 이유: Repository가 커지는 관계만 보여주고 원자화를 선악으로 단정하지 않는다.
- 도식 구성: 사각형 ‘UseCase · Orchestration’, 사각형 ‘Repository · SQL + Rules?’, 선

**연출 흐름**

- 시작: UseCase와 Repository를 나란히 두고 Repository 쪽을 더 큰 오브젝트로 보여준다.
- 사건: 모든 변경을 atomic SQL로 밀어 넣었을 때의 반대 비용을 설명한다.
- 변화: Repository 오브젝트가 강조되며 책임이 한쪽으로 쏠리는 모습을 만든다.
- 유지: atomic SQL 자체를 나쁜 선택으로 단정하지 않는다.
- 결과: 동시성 단순화와 책임 집중 사이의 트레이드오프를 남긴다.

1. 추가 연출 지시: connect
2. 추가 연출 지시: emphasize-repository

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- Repository · SQL + Rules?: 커짐

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 absorb · 550ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **반대로 모든 변경을 Repository의 atomic SQL로 밀어 넣으면 동시성은 단순해질 수 있지만, Persistence Layer가 Application의 비즈니스 로직을 흡수하기 시작합니다.**
   - 강조 강 · 자연스럽게 · 뒤에 180ms 쉼
   - 강조 단어: **트레이드오프** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: responsibility-absorption

## 9. 마무리 — 설계의 기준은 계층 수가 아니라 경계입니다.

![장면 9](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-09.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/b66c0035d206ea9ef83e70511136862a5b3b6242/usecase-domain-repository-seolgyebuteo-dongsiseongggaji-candidate-01-scene-09.png)

**내레이션**

결국 계층을 더 만드는 게 핵심은 아닙니다. 상태를 누가 복원하고, 계산하고, 기록하는지 그 경계를 분명히 하는 게 기준입니다.

**화면 구성**

- 주 문구: 설계의 기준은 계층 수가 아니라 경계입니다.
- 배치: 도식을 중앙에 배치
- 전달할 관계: Layer × N과 Restore → Compute → Record 책임 경계를 대비한다.
- 표현 방식: 공간 도식
- 표현 이유: 문장 반복 대신 최소한의 도식으로 결론을 시각화한다.
- 도식 구성: 사각형 ‘Layer × N’, 사각형 ‘Restore’, 사각형 ‘Compute’, 사각형 ‘Record’, 선, 선

**연출 흐름**

- 시작: 왼쪽에 Layer × N을 작게 두고, 오른쪽에 Restore, Compute, Record 세 책임 경계를 배치한다.
- 사건: 계층을 더 만드는 것보다 상태의 생명주기 경계를 분명히 하는 기준을 강조한다.
- 변화: Layer × N은 어두워지고 Restore → Compute → Record 연결이 순서대로 활성화된다.
- 유지: 결론 문장을 카드 안에서 다시 반복하지 않는다.
- 결과: 계층 수보다 책임 경계가 중요하다는 결론을 도식 하나로 끝낸다.

1. 추가 연출 지시: dim-layer-count
2. 추가 연출 지시: reveal-boundaries

도식에서 설정된 변화(시작 순서):

- Layer × N: 점차 흐려짐
- 선: 점차 드러남
- 선: 점차 드러남
- Record: 커짐

카메라: 고정

장면 전환: 서서히 전환

라이트 효과:

- 경로를 흐르는 빛 · 대상 restore-compute · 550ms부터 1200ms · 강도 1
- 경로를 흐르는 빛 · 대상 compute-record · 970ms부터 1200ms · 강도 1

**자막과 낭독 리듬**

1. **결국 계층을 더 만드는 게 핵심은 아닙니다.**
   - 강조 강 · 자연스럽게 · 뒤에 120ms 쉼
   - 강조 단어: **계층 수** (자막에 해당 단어 없음 — 확인 필요)
   - 연출 의도: layers
2. **상태를 누가 복원하고, 계산하고, 기록하는지 그 경계를 분명히 하는 게 기준입니다.**
   - 강조 강 · 여운을 두어 · 뒤에 260ms 쉼
   - 강조 단어: **경계**
   - 연출 의도: boundary-over-layer-count

## 게시 문구

UseCase, Domain, Repository를 나누는 일은 폴더를 예쁘게 정리하는 문제가 아니었습니다. 상태를 누가 읽고, 누가 계산하고, 누가 기록하는지 정하기 시작하면 트랜잭션과 동시성 경계까지 함께 보이기 시작합니다.  원문: https://blog.dohyeon.kr/usecase-domain-repository-seolgyebuteo-dongsiseongggaji/

#백엔드 #소프트웨어설계 #동시성 #Spring #Kotlin

