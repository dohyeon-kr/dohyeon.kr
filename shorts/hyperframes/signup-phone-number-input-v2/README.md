# 휴대폰 번호 입력 — 개선안 02

기존 `shorts/scripts/build-hyperframes.mjs`가 candidate의 `visual.motif: signup-phone-number-input-v2`를 만나면 사용하는 Aurora 구성입니다. 원본 candidate-01과 다른 후보의 경로는 유지됩니다. 같은 입력창에 인증·오류·완료 상태를 쌓고, spring과 확대 카메라로 변화 위치를 따라갑니다. 폼 외곽은 화면 끝까지 확장하지만 주요 글자는 화면 안에 유지합니다.

## 추가 대본 수정 — 새 음성 준비 필요

서버 설명을 강화한 현재 candidate-02는 기존 전달 영상과 문장이 다릅니다. 기존 candidate-01 음성을 삭제만 하는 명령으로는 만들 수 없으며, 준비 도구가 불일치를 거부하는 것이 정상입니다. 무음 검토는 기존 빌더에서 `--prepared` 없이 생성할 수 있습니다. 음성 포함 최종본은 현재 대본과 일치하는 새 prepared가 필요합니다.

원래 설정은 `gpt-4o-mini-tts` / `alloy` / 후처리 속도 1.25입니다. 부자연스러운 연결을 없애려면 본문 전체를 한 번에 다시 생성하고 실제 word timing으로 자막을 맞추는 방식을 권장합니다. 모델/비용 승인 및 API 접근 확인 전에는 생성하지 않습니다. CTA는 일치하는 기존 prepared 음성으로 재사용할 수 있습니다.

아래 삭제 재사용 명령은 **문장이 같은 삭제 전용 수정에만** 적용됩니다. 현재 강화 대본에 기존 음성을 억지로 붙이지 마세요.

## 기존 생성 경로에서 재현

저장소 루트 기준입니다. Node 22+, FFmpeg, Chrome이 필요합니다. 구성의 의존성은 `npm ci --prefix shorts/hyperframes/signup-phone-number-input-v2`로 설치합니다.

기존 `render.mjs --prepare-audio`가 만든 prepared manifest와 해당 `shorts/public/` 오디오가 있다면 그대로 사용합니다. 아래 준비 단계는 유료 SDK를 호출하지 않고, 문장이 동일한 beat 삭제만 허용합니다. 바뀐 문장이나 순서가 다른 문장은 재사용을 거부합니다.

```sh
node shorts/scripts/prepare-signup-reused-audio.mjs shorts/content/signup-phone-number-input/candidate-02.json --source-prepared=shorts/.tmp/signup-phone-number-input-candidate-01.json
node shorts/scripts/build-hyperframes.mjs shorts/content/signup-phone-number-input/candidate-02.json --prepared=shorts/.tmp/signup-phone-number-input-candidate-02.json
node shorts/hyperframes/signup-phone-number-input-v2/verify.mjs
shorts/hyperframes/signup-phone-number-input-v2/node_modules/.bin/hyperframes check shorts/.tmp/hyperframes/signup-phone-number-input-candidate-02 --at 2,10,17,22,27,33,41,46.3,49
shorts/hyperframes/signup-phone-number-input-v2/node_modules/.bin/hyperframes render shorts/.tmp/hyperframes/signup-phone-number-input-candidate-02 --fps 30 --quality standard --output shorts/.tmp/signup-phone-number-input-candidate-02.mp4
```

`--prepared`를 생략하면 추정 타이밍의 **무음 스토리보드**입니다. 오디오가 있는 최종 검토본에는 반드시 prepared를 지정합니다. 생성 결과는 기존 `manifest.json`, `timings.json`, `aurora-explain` composition ID와 GitHub 출력 계약을 유지하므로 릴리스 sidecar 생성 경로가 읽을 수 있습니다. 이 변경은 CI의 유료 음성 생성 정책을 자동으로 바꾸지 않습니다.

## 원본 캐시 없이 MP4만 남았을 때

정확히 일치하는 원본 candidate와 beat 단위 SRT로 prepared를 복원할 수 있습니다. 이 단계는 원본 MP4 전용 고정 타임스탬프가 아닌 SRT의 문장 일치와 실제 미디어 길이를 검사합니다.

```sh
node shorts/scripts/recover-signup-prepared.mjs shorts/content/signup-phone-number-input/candidate-01.json --video=/absolute/path/candidate-01.mp4 --srt=/absolute/path/candidate-01.srt --output=shorts/.tmp/signup-source-prepared.json
node shorts/scripts/prepare-signup-reused-audio.mjs shorts/content/signup-phone-number-input/candidate-02.json --source-prepared=shorts/.tmp/signup-source-prepared.json
```

이번 검토본은 이 복원 경로를 사용했습니다. MP4에서 추출한 음성에는 기존 BGM도 포함되어 `audioAlreadyMixed`로 중복 믹싱을 막습니다. 이 오디오를 원본 TTS 캐시로 저장하지 않습니다. 실제 TTS 캐시가 있으면 위의 기본 prepared 경로를 사용하세요.

## 검증과 범위

- candidate/대사/prepared/자막의 문장 일치 및 오디오 길이 검증. 움직임은 의미별 beat의 상대 시점에 연결됩니다.
- 회귀 테스트: `node --test shorts/tests/signup-continuous.test.mjs shorts/tests/aurora-runtime.test.mjs shorts/tests/aurora-styles.test.mjs`.
- 브라우저 검증: 본문 1초 이후 모든 30fps 프레임에서 입력창·번호 표시가 유지되고 핵심 텍스트가 화면 안에 있는지 검사합니다. 오류 뒤 흔들림과 정착도 검사합니다. 결과는 생성 프로젝트의 `output/playwright/`에 저장합니다.
- HyperFrames lint/runtime/layout/contrast 및 최종 MP4의 주요 프레임을 확인합니다. motion sidecar는 꺼져 있으며 별도 프레임 검사를 사용합니다.
- SRT 복원의 세부 자막은 기존 phrase 분할 알고리즘을 사용합니다. 새 단어 단위 강제 정렬이나 새 음성 청취 검수는 아닙니다.

Chrome 자동 탐지가 안 되면 `PRODUCER_HEADLESS_SHELL_PATH`와 `CHROME_EXECUTABLE`을 지정합니다. 새 TTS·게시·배포·병합은 이 작업에 포함되지 않습니다.
