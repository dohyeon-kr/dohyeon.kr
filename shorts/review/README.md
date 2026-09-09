# 오답노트 HTML 배치 검수

협업 candidate를 실제 `ShortVideo` / NotebookScene / DiagramRenderer / presenter 구성으로 보는 자립형 HTML 편집기입니다. 외부 폰트·사진 요청 없이 파일을 브라우저에서 열 수 있습니다. 현재 협업 candidate 전용이며 물리 시뮬레이션 문서는 지원하지 않습니다.

```sh
npm --prefix shorts install --ignore-scripts --no-audit --no-fund
node shorts/scripts/prepare-notebook-assets.mjs --preview-photo
npm --prefix shorts run review:html
# shorts/out/notebook-review.html
npm --prefix shorts run review:typecheck
node --test shorts/tests/notebook-review.test.mjs
```

화면에서 장면을 선택하고 사진·도식·제목·자막 영역 또는 개별 도식 객체를 드래그합니다. 우하단 핸들이나 숫자 입력으로 크기를 바꿉니다. 사진과 페이지 영역은 비율을 유지합니다. 도식의 위치 애니메이션은 이동량만큼 함께 옮깁니다. 커넥터는 직접 드래그하지 않고 연결 객체를 움직입니다.

스티커 팔레트에서 추가하고 메모를 수정하거나 제거할 수 있습니다. 기존 객체를 부착 대상으로 지정하고 지원되는 겹침 프리셋을 선택합니다. 지침·API 탭에는 장면별 논의 메모, 전체 디자인 지침, 선택한 객체의 필드를 표시합니다.

브라우저 로컬 저장은 최선 노력 방식입니다. `검수 JSON 저장`으로 파일을 내보내고 대화에 첨부하면 같은 배치를 이어서 논의할 수 있습니다. 다른 브라우저에서는 `불러오기`를 사용합니다. 원본 candidate가 달라진 검수 파일은 거부합니다. 실시간 동기화나 공동 편집 서버는 없습니다.

## 검수 계약 v1

- `candidate.scenes[].diagramSpec`: 기존 제작 인터페이스. 원본 내레이션·출처·장면 식별은 보존합니다.
- `layouts["sceneIndex:element"] = {dx,dy,scale}`: 검수 전용 페이지 배치 제안. 아직 제작 manifest 스키마에 포함되지 않습니다.
- `notes[sceneIndex]`: 장면별 논의 메모.
- `guidelines`: 함께 정할 디자인 지침.
- `sourceFingerprint`: 원본 JSON 직렬화 값. 이 프로토타입의 버전 일치 검사이며 서명이나 인증 기능은 아닙니다.
- 페이지 좌표는 1080×1920 좌상단, 도식 좌표는 800×560 객체 중심입니다. 페이지 요소의 scale 범위는 0.25–2입니다.

## 검사와 제작 렌더의 차이

무음이며 길이와 자막 타이밍은 추정치입니다. TTS, word-timestamp lip sync는 실행하지 않습니다. 공통 CTA는 편집하지 않습니다. 각 장면을 독립 재생하므로 장면 간 전환 연결 검수는 최종 렌더에서 합니다.

편집 중 잘못된 겹침도 보여야 하므로 HTML 빌드에서만 `physics.ts`의 도형 겹침 예외와 DOM layout hook을 검수 어댑터로 대체합니다. 프로덕션 소스·Actions·엄격한 렌더 검증은 수정하지 않습니다. 인스펙터가 **원래의** `assertDiagramLayout`과 `layoutSampleTimes`로 도식 중간 상태를 검사하고 페이지 영역 이탈·충돌을 경고합니다. 임의 페이지 scale 이후 글자 최소 크기나 presenter 충돌, 최종 폰트 ink bounds는 이 프로토타입의 승인 게이트가 아닙니다. API 합의 후 제작 코드에 반영하고 실제 렌더로 검수해야 합니다.

배치 경고가 있어도 검수 JSON은 저장할 수 있습니다. 제작용 manifest 저장/업로드를 자동 수행하지 않습니다. `generate_previews` 수동 체크박스 정책은 그대로입니다.

검증: HTML 번들 생성, 제작/편집기 타입 검사, JSON 왕복·출처 버전 및 내레이션 보존·잘못된 부착 대상 거부·초기 도식 중간 상태 테스트 통과. 현재 환경의 브라우저는 로컬 HTML 접근을 차단하므로 실제 드래그·파일 입출력에 대한 브라우저 E2E 확인은 미완료입니다.
