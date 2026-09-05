# 스토리보드 리뷰 → 개선 PR

스토리보드 생성 후 **Review and improve shorts storyboard** Actions를 실행한다.

- `manifest`: 릴리즈 본문에 있는 `shorts/content/<post>/candidate-XX.json` 경로.
- `comment`: 선택 입력. 예: “도입 인용 뒤에 정말 그러면 될까라는 질문을 넣고, 4·6장은 실제 사진으로 바꿔줘.” 비우면 기본 품질 기준으로 검토한다.
- Run workflow의 브랜치에는 리뷰할 JSON이 있는 브랜치를 선택한다. 개선 PR은 해당 브랜치를 대상으로 생성된다.

기존 `OPENAI_API_KEY` secret을 사용한다. 모델은 `SHORTS_REVIEW_MODEL` → `SHORTS_TEXT_MODEL` → 기존 생성기의 기본 모델 순서다. 이미지 입력과 Structured Outputs를 지원하는 모델이어야 한다. GitHub Actions의 PR 생성 권한도 기존 후보 생성 워크플로우와 동일하게 필요하다.

1. 지정한 JSON을 검증하고 현재 코드로 원본 스토리보드를 다시 렌더한다.
2. 원문, JSON, 코멘트, 다른 후보의 사진 목록, 실제 PNG를 OpenAI Responses API에 전달한다. 도식은 시작·변화·결과 프레임을 모두 포함한다.
3. 별도 API 호출로 리뷰에 맞춰 후보를 개선한다. 생성기와 같은 스키마·프롬프트 및 creative-system 규칙을 사용한다.
4. 자막/내레이션 일치, 키워드, 카메라 구간, 도식과 사진을 검증하고 읽기용 Markdown을 갱신한다. 사진을 못 찾거나 도입 사진이 중복되면 실패하며 사진 없는 장면으로 조용히 바꾸지 않는다.
5. 개선본을 다시 렌더하고 수정 전후 이미지·원본 JSON·리뷰를 30일 보관 아티팩트로 올린다. 모든 단계가 성공한 경우에만 개선 PR을 만든다. 동일 결과이면 PR을 생성하지 않는다.
6. PR의 선택 체크가 유지된 상태로 사람이 병합하면 기존 스토리보드 워크플로우가 다시 실행된다. 최종 영상은 별도로 승인한다.

한 번 실행에 리뷰/개선 API 호출 각 1회이며 SDK의 일시 오류 재시도는 최대 2회다. 자동 반복 개선이나 자동 병합은 하지 않는다. GITHUB_TOKEN으로 생성한 PR은 다른 PR 워크플로우가 자동 실행되지 않을 수 있어, 이 워크플로우 자체에서 수정 후 렌더까지 수행한다.

정지 프레임 리뷰는 BGM/SFX 실제 재생, 음성 타이밍, 모션의 부드러움을 검증하지 못한다. 수정 후 이미지는 사람 검토용이며 AI가 다시 승인한 결과가 아니다. 렌더러 코드 수정이 필요한 문제는 후보 JSON만으로 해결할 수 없다. 실패 시 Actions 로그와 생성된 리뷰 아티팩트를 확인하고 코멘트를 구체화해 다시 실행한다.

API 구현 참고: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Images and vision](https://developers.openai.com/api/docs/guides/images-vision).
