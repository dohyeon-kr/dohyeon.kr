# Ghost 대표 이미지 자동 생성

Ghost 관리자와 API에서 만든 글 모두 같은 방식으로 처리한다. 15분 간격의
GitHub Actions가 저장된 글을 조회하고, 대표 이미지가 비어 있는 글의 제목과
본문을 텍스트 모델로 요약한다. 요약한 관계(순서·대조·분기)는 기존
`DiagramRenderer`로 1600×900 PNG를 만든다. 이미지 생성 API는 쓰지 않는다.
한국어 폰트, 라벨 여백, 연결선 검증을 릴스 도식 도구와 공유한다.

## 적용 범위

- `GHOST_FEATURE_IMAGES_SINCE` 이후 생성된 draft/published/scheduled 글만 조회한다.
- 본문이 80자 이상이고 마지막 저장 후 2분이 지난 글부터 처리한다.
- 대표 이미지가 있으면 API 모델 호출과 렌더를 모두 생략한다.
- 한 실행당 최대 5개. 예약 실행은 GitHub 사정으로 15분보다 늦어질 수 있다.
- 글 본문과 제목은 OpenAI 텍스트 모델에 전달한다. 생성물에 없는 성과나
  수치를 추가하지 않도록 지시하고, 길이와 관계별 노드 수를 검증한다.
- 렌더/업로드 전후로 글을 다시 조회한다. 대표 이미지가 생겼거나 제목·본문이
  바뀌면 첨부를 멈춘다. Ghost `updated_at` 충돌도 재시도로 덮어쓰지 않는다.
- 업데이트에는 이미지 URL·대체 텍스트·충돌 검사 시각만 보낸다.
  글을 발행하거나 메일을 보내지 않으며 기존 예약·Draft 상태를 유지한다.
- 생성에 실패해도 글 저장/발행을 막지 않는다. 다음 예약 실행에서 다시 시도한다.
  구조 검증은 의미 정확성 검토를 대신하지 않는다. 자동 이미지도 편집자가 확인한다.
- 이 기능이 붙인 이미지를 삭제하면 다음 검사에서 다시 만들어진다.
  삭제 상태를 유지하려면 자동화를 끄거나 다른 이미지를 지정한다.

## 활성화

1. Ghost Settings → Integrations에서 전용 Custom Integration을 만든다.
   Admin API Key를 GitHub Actions secret `GHOST_ADMIN_API_KEY`로 저장한다.
   기존 `OPENAI_API_KEY`와 `SHORTS_TEXT_MODEL` 설정을 재사용한다.
2. Repository variable `GHOST_FEATURE_IMAGES_SINCE`에 적용 시작 시각을 ISO 형식으로
   설정한다. 예: `2026-09-06T00:00:00Z`. 과거 글 전체를 의도치 않게 변경하지
   않도록 시작 시각을 생략하면 조회를 실패시킨다.
3. 워크플로우를 main에 병합한다. 특정 draft의 `post_id`를 넣고 `apply=true`로
   한 번 실행해 이미지가 붙고 Draft 상태가 유지되는지 확인한다.
4. Repository variable `GHOST_FEATURE_IMAGES_ENABLED=true`로 예약 처리를 켠다.
   비우거나 `false`로 바꾸면 중지한다.

이 설정을 마치기 전에는 코드가 있어도 자동 생성은 실행되지 않는다.
Ghost webhook이나 서버 privileged wrapper 변경 없이 동작한다.

## 로컬 미리보기와 등록 흐름 연결

```sh
node shorts/scripts/render-feature-image.mjs plan.json cover.png
GHOST_POST_ID=<id> node shorts/scripts/ghost-feature-images.mjs
GHOST_POST_ID=<id> node shorts/scripts/ghost-feature-images.mjs --apply
```

두 번째 명령은 PNG·명세를 `shorts/output/feature-images`에 저장하고 첨부하지
않는다. 세 번째 명령만 Ghost를 수정한다. 환경 변수로 두 API 키를 공급한다.
macOS에서는 `REMOTION_BROWSER_EXECUTABLE`로 설치된 Chrome 실행 파일을 지정할
수 있다. 생성 파일에는 미발행 글의 내용이 포함될 수 있어 Actions artifact에
업로드하지 않는다.

API 등록 파이프라인은 Ghost가 반환한 ID로 이 명령을 호출할 수 있다. 다만
저장 직후 2분은 편집 유예 기간이므로 기본적으로 예약 스캔에서 처리한다.

참고: [Ghost 이미지 업로드](https://docs.ghost.org/admin-api/images/uploading-an-image),
[글 수정과 updated_at](https://docs.ghost.org/admin-api/posts/updating-a-post).
