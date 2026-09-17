# UseCase·Domain·Repository shorts candidates

- `candidate-01.json`: 8장 압축본
- `candidate-02.json`: 10장 상세본 — 트랜잭션 경계, 같은 상태를 읽는 경쟁, Read → Compute → Write 경쟁 구간, Repository atomic operation, SQL 원자화의 반대 비용을 분리해 설명

두 후보 모두 `aurora-explain` / HyperFrames용이며 공통 CTA는 렌더 파이프라인에서 자동 추가됩니다.
