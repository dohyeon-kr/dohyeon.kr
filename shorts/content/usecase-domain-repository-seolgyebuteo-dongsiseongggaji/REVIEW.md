# 제작·연결성 검토

- 원문: https://blog.dohyeon.kr/usecase-domain-repository-seolgyebuteo-dongsiseongggaji/
- 템플릿: `aurora-explain`, HyperFrames.
- `candidate-01.json`은 8장 압축본으로 유지한다.
- `candidate-02.json`은 10장 상세본이다.
- 상세본은 트랜잭션 경계, 같은 상태를 읽는 두 요청, Read → Compute → Write 경쟁 구간, Repository atomic operation, SQL 원자화의 반대 비용을 각각 분리한다.
- 사진은 사용하지 않고 Aurora의 지속 오브젝트와 연결선 상태 변화로 설명한다.
- 원문에 없는 성능 수치나 운영 경험을 추가하지 않는다.
- 공통 CTA는 최종 렌더 파이프라인에서 자동 추가한다.
