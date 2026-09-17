# Candidate 02 · 상세 버전

`candidate-01.json`의 8장 압축본을 유지하고, `candidate-02.json`에서는 동시성과 원자화 파트를 더 자세히 나눴습니다.

- UseCase / Domain의 테스트 관점
- 상태의 Read → Orchestrate → Compute → Write 생명주기
- Engine을 필수 계층이 아닌 선택 도구로 보는 관점
- UseCase 단위의 트랜잭션 경계
- 같은 상태를 읽는 두 요청의 경쟁 시작점
- Read → Compute → Write 사이의 경쟁 구간
- Repository `tryDecrease()` 같은 atomic operation
- SQL 원자화를 과도하게 밀었을 때 Persistence Layer가 비즈니스 규칙을 흡수하는 비용
- Domain computation과 atomic state change를 구분해 경계를 선택하는 결론

사진 없이 `aurora-explain`의 지속 오브젝트와 유한한 상태 변화 중심으로 구성합니다.
