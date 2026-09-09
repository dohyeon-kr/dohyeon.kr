# Presenter API v1 — candidate 작성 계약

## 혼용어의 입모양 계산

최종 음성에서 측정한 단어 타임스탬프는 그대로 유지한다. `speech-text.ts`는
입모양 계산에만 쓰는 발음을 만든다. `SDK가 → 에스디케이가`, `Bruno에서 → 브루노에서`
등 기술 용어 사전과 한글 조사를 함께 처리하며 원래 음성·자막·대본은 변경하지 않는다.
미등록 영문은 알파벳 이름, 숫자는 자릿수별 읽기(소수점은 `점`)로 근사한다.
이는 실제 발음이나 음소 정렬을 보장하는 G2P가 아니며, 근사 음절을 해당 단어의
측정 구간 안에 배분한다. 무음 구간으로 입모양을 늘리지 않는다.

정렬 진단 JSON v3의 `readings`에 원문·변환문·시간·사전/근사 방법을 기록한다.
미지원 문자는 입모양을 임의 생성하지 않고 명시적으로 실패하며 재전사하지 않는다.
타임스탬프 오류는 기존처럼 최대 한 번 재전사하고 원시 응답을 보존한다.
끄덕임만 사용하는 경우 발음 변환을 요구하지 않는다.

## 현재 디자인 변경 — 손 없는 바스트

손·전완 렌더와 손 제스처를 제거했다. 현재 action은 작은 고개 반응만 보여주며, 어깨 윤곽은 안정된 기본 자세로 유지한다. 새 candidate는 idle/explain/emphasize 중심으로 작성하고 hand=null을 사용한다. point/present 및 손·관절 필드는 v1 후보 호환용으로 남았지만 실제 가리키기/손 모양을 표시하지 않는다. `PRESENTER_CAPABILITIES.hands`는 false다. 아래 손 프리셋 표는 이전 v1 데이터 해석용이며 현재 디자인의 기능 목록이 아니다.

현재 외형은 참조 일러스트를 따라 재구성한 흑백 SVG 선화다. 길쭉한 얼굴, 가르마의 흐름, 눈꺼풀과 동공, 얇은 안경을 독립 파츠로 구성했다. 원본 래스터의 픽셀을 그대로 분리한 결과는 아니며 선의 세부 질감은 다르다. 얼굴 그라데이션은 제거하고 카라·턱 아래에만 얕은 그림자를 남겼다. 흰 배경·원형 크롭·손 없는 바스트를 유지한다. 원형 프레임은 고정하고 캐릭터 전체를 머리 윗부분 기준으로 원본 대비 1.5배 확대해 얼굴 중심의 가까운 구도를 사용한다. 얼굴과 몸의 비율은 유지하며 아래쪽 몸통을 더 많이 크롭한다.

카라 양쪽은 끊김 없는 닫힌 면이며 그림자는 그 뒤에 그린다. 카라 윗부분은 낮추고 목을 카라보다 나중에 그려 피부 앞에 옷깃이 솟지 않게 한다. 안경은 동일 규격의 둥근 사각 렌즈와 브리지로 구성하고 잉크 필터 밖에 둔다. 노딩의 미세한 세로 축소도 역보정해 프레임 비율이 찌그러지지 않는다.

선의 미세한 요철은 SVG fractal noise + displacement(scale 3.2)로 만든다. `compilePresenter`는 초당 8번 `inkFrame`을 바꿔 손그림의 line-boil 효과를 낸다. 같은 시각은 같은 seed를 사용하므로 역재생·탐색·병렬 렌더에도 재현된다. 머리와 몸통의 로컬 좌표에서 각각 처리하며, 안경·흰 배경·원형 테두리는 효과에서 제외한다. 넓은 검정 면 내부에 종이 얼룩을 추가하는 방식은 아니다. 필터는 파츠 범위로 제한해 렌더 비용을 줄인다.

구현 참고: [SVG feTurbulence](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence), [feDisplacementMap](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap).

### 직접 제어 (React / TypeScript)

```tsx
<Presenter expression="smile" motion={{nod: .6, tilt: -2, blink: 0, browLeft: -.3, browRight: 0}} mouth={{shape: 'A', intensity: .5}} />
```

`motion`은 직접 호출용이며 candidate JSON 필드가 아니다. `nod`는 -1…1(양수는 숙임), `tilt`는 -12…12도, `blink`는 0…1, `browLeft/Right`는 -1…1(음수는 올림)이다. 실제 말하기에는 tilt ±3도 안팎을 권장한다. 저수준 `pose`의 대응 필드는 `headNod/headTilt/blink/browLeft/browRight`이며 명시한 pose 필드가 우선한다. 자동 시간 진행은 없으므로 프레임별 값을 전달하거나 `compilePresenter`를 사용한다.

`motion.inkFrame` 또는 `pose.inkFrame`으로 질감 프레임을 직접 제어할 수 있다(0 이상의 정수, 소수는 내림). 일정한 값을 유지하면 정적 질감이다. 예: `<Presenter pose={{...evaluate(t), inkFrame: 0}} />`로 정지시키거나 `inkFrame: Math.floor(t * 12)`로 초당 12번 바꾼다. 기존 candidate JSON은 수정 없이 기본 8Hz 효과를 사용한다.

기존 candidate의 `actions`는 한 번의 완만한 노딩과 작은 기울임을, `expressions`는 눈매·눈썹의 180ms 전환을 구동한다. 노딩 중 목의 윗부분이 머리를 따라가고 어깨와 카라는 고정된다. 깜빡임은 눈꺼풀 경로와 동공 클립을 함께 변경하며 안경 자체는 변형하지 않는다. 입은 기존 rest/O/I/A/M 트랙을 유지한다. 180ms보다 짧게 표정을 연속 교체하지 말고 표정당 충분한 시간을 둔다. 깊은 숙임/측면 회전을 지원하는 3D 리그는 아니다.

발표자 선택·동작·표정은 candidate 에이전트가 작성한다. 관절·어깨 곡선·손 모양은 렌더러가 처리한다. 발음 트랙은 최종 음성의 시간 정보를 가진 TTS/정렬 어댑터가 작성한다.

- 코드: `shorts/src/presenter/index.ts` (React 포함), `api.ts` (순수 데이터/시간 평가)
- 기계 판독: [presenter.schema.json](presenter.schema.json). `node scripts/export-presenter-schema.mjs`로 소스에서 생성하며 테스트가 드리프트를 검사한다.
- 생성/리뷰: `GeneratedPresenterSchema`를 `CandidateSchema`가 공유한다. 코드에 정의된 enum만 사용한다.
- HTTP 서비스나 별도 배포된 npm 패키지는 아니다. 저장소 내부 공개 TypeScript/JSON 계약이다.

## Candidate JSON

발표자가 직접 질문하거나 설명하는 것이 적합할 때 `presenter-bust`를 선택한다. 사진·도식이 더 명료한 장면을 대체하지 않는다. 기존 후보에는 자동 추가하지 않으며 `presenter: null` 또는 필드 생략은 기존 렌더를 유지한다.

```json
{
  "layout": "presenter-bust",
  "visual": {"type":"none","motif":null,"query":null,"value":null,"xLabel":null,"yLabel":null},
  "diagramSpec": null,
  "backgroundVideo": null,
  "presenter": {
    "version": 1,
    "actions": [
      {"start":0.4,"end":2.6,"name":"explain","side":null,"hand":null,"intensity":null},
      {"start":2.8,"end":5.2,"name":"point","side":"right","hand":null,"intensity":0.8}
    ],
    "expressions": [{"start":0,"end":5.2,"name":"smile"}]
  }
}
```

이것은 장면의 관련 필드만 발췌한 예다. 제목·내레이션·beats 등 나머지 candidate 필드는 기존 스키마에 맞춘다. 공통 CTA에는 사용하지 않는다. 위 예에는 최종 장면 길이 5.2초 이상이 필요하다.

생성 API에서는 strict structured output 때문에 version/actions/expressions 및 action의 side/hand/intensity를 모두 쓴다. null은 기본값이다. `enrichVisuals`에서 null을 생략형 런타임 데이터로 정규화한다. 수동 candidate/런타임에서는 `{}`도 유효한 대기 상태다.

## 동작과 손

| action | 기본 손 | 기본 방향 | 사용 의도 |
| --- | --- | --- | --- |
| idle | relaxed | — | 듣기·쉼. 손은 프레임 아래 |
| explain | open | right | 차분한 설명 |
| present | palmUp | left | 예시·선택지 제시 |
| point | point | right | 선택한 방향을 가리킴 |
| emphasize | fist | right | 한 번의 작은 강조 |

`side`는 **보는 사람의 화면 기준** left/right다. `point`는 화면 객체 ID나 좌표를 추적하지 않는다. `hand`로 relaxed/open/palmUp/point/fist를 덮어쓸 수 있다. idle은 손을 내린 상태를 유지한다. intensity는 동작 크기 0…1(기본 1)이며 속도가 아니다.

각 동작은 손목 목표점, 팔 IK, 손 프리셋, 손목 회전, 고개 반응, 진입/퇴장 곡선을 포함한다. 한 번에 한 손만 움직인다. 어깨 윤곽은 위팔 방향을 따라 곡선으로 변형되어 목→어깨→소매 외곽이 이어진다. 외곽선 6 SVG units, 손목 접점은 모든 프리셋에서 동일하다.

동작당 보통 1.4초 이상을 확보하고 의미 있는 동작 1~2개를 고른다. 양끝 최대 0.7초에 손을 올리고 내리며 손목은 최대 80ms 늦게 따라온다. 짧은 구간은 램프를 줄이지만 바쁜 연속 제스처를 권장하지 않는다. 손 모양은 동작 내에서 유지하고 원 아래에서 바뀐다. 중간에 hand를 교체할 별도 트랙은 없다.

## 표정과 입

| 트랙 | 지원 값 | 제어 대상 |
| --- | --- | --- |
| expressions | neutral, smile, curious, serious, surprised | 눈 크기·눈썹·기본 입 |
| mouths | rest, O, I, A, M | 휴식 / 오 / 이 / 아 / 음·입술 닫힘 |

표정과 발화는 독립적이다. 발화 중 O/I/A/M이 기본 입보다 우선한다. `rest` 또는 빈 구간은 해당 표정의 기본 입으로 돌아간다. surprised의 기본 입은 작게 열린 놀람 표정이다. 중립 기본값은 닫힌 입이다. 눈 깜빡임은 별도로 합성된다.

mouth의 intensity는 0…1(기본 .7), 벌림 정도다. M은 intensity=0이어도 입술을 닫은 M 상태이며 rest와 다르다. O/I/A에서 0은 표정의 기본 입으로 돌아간다. 현재 입·표정은 모양 프리셋 교체이며 발음 사이의 연속 메시 모핑/정교한 조음 모델은 아니다.

```tsx
import {Presenter, compilePresenter} from './presenter';

// 정적 상태: 디자인/개별 컴포넌트 사용
<Presenter action="explain" hand="open" expression="smile"
  mouth={{shape: 'A', intensity: .7}} />;

// 동영상: 렌더 manifest의 확정된 장면 길이로 한 번 컴파일
const evaluate = compilePresenter({
  actions: [{start: .4, end: 2.6, name: 'explain'}],
  expressions: [{start: 0, end: 3, name: 'smile'}],
  mouths: [{start: 1, end: 1.2, shape: 'O', intensity: .7}],
}, 3);
<Presenter pose={evaluate(frame / fps)} />;
```

정적 props는 즉시 목표 포즈를 보여준다. 시간에 따른 자연스러운 이동은 compilePresenter를 사용한다. 저수준 pose는 디버그/수동 제작용이며 candidate에는 쓰지 않는다. 기존 rig.ts의 poseAt/envelope API는 호환용이고 새 에이전트 계약은 api.ts다.

## 시간·검증

- 모든 시간은 **장면 시작 기준 초**, `[start,end)`이다. 시작 포함·종료 제외.
- 트랙 사이 동시 사용은 허용한다. 같은 트랙의 구간 중첩은 금지한다. 입력 순서와 무관하게 검증한다.
- 빈 구간은 이전 값을 유지하지 않고 기본 상태로 돌아간다. 배열은 actions/expressions 각각 최대 40, mouths 최대 4,000개다.
- 알 수 없는 필드/enum, 버전, 비유한 값, 음수, 역전/길이 0, 실제 장면 범위 초과는 오류다. 시간·입력 오류를 조용히 잘라내지 않는다.
- 생성/리뷰에서는 구조·중첩·최대 600초를 검사한다. 실제 길이는 TTS/렌더 준비 후 다시 검사한다. TTS가 예상보다 짧으면 동작 타임라인을 수정해야 한다.
- 무음 스토리보드는 authored cue의 마지막 시점까지 프리뷰를 연장한다. 이는 최종 음성이 그 길이라는 뜻이 아니다.
- 모든 포즈는 시간의 결정적 함수다. 되감기·병렬 프레임 렌더에 누적 상태나 랜덤을 사용하지 않는다.

## TTS 어댑터 경계

`phonemesToMouthCues(tokens, duration)`는 **타임스탬프가 이미 있는** 기본 한글 자모/IPA를 O/I/A/M/rest로 매핑한다. 시간은 재생 속도 조정이 끝난 최종 오디오 기준이어야 한다. 알 수 없는 기호는 오류를 내므로 공급자별 정규화 어댑터에서 명시적으로 매핑한다. 전체 한국어 음운 규칙이나 임의 문장 자동 정렬기가 아니다.

```ts
const mouths = phonemesToMouthCues([
  {start: .5, end: .65, symbol: 'ㅁ'},
  {start: .65, end: .9, symbol: 'ㅏ'},
], finalAudioDuration);
const presenter = {...candidate.presenter, mouths};
validatePresenter(presenter, finalSceneDuration);
```

장면별 presenter-bust는 타임스탬프를 확보한 어댑터가 presenter.mouths를 채울 때 이를 소비한다. 우측 하단 overlay의 선택적 TTS 연결은 아래 계약을 따른다. candidate 에이전트가 발음 시점을 지어내거나 음량만으로 O/I/A/M을 판별하지 않는다.

## 레이아웃·검수

`presenter-bust`는 두 렌더 테마에서 같은 흰 페이지를 사용한다. 1080×1920 기준 제목 y=230, 보조 문구 y=550, 원형 캐릭터 540×540 (x=270,y=680), 자막 y=1370에 분리한다. 사진/도식/영상 배경/비교 문구는 함께 지정할 수 없다. camera.motion=static, effects=[]를 사용한다. 장면 전환은 기존 transition으로 지정한다. 제목/보조 문구/자막의 실제 한글 폭과 시각 영역 침범은 폰트 로딩 후 DOM 검사로 확인한다. 내용이 넘치면 문구를 줄인다.

`PresenterCases`: 동작/손/표정/입 비교 시트. `PresenterRigPreview`: 12초 수동 입모양 데모(음성 없음). `PresenterCandidatePreview`와 `DarkPresenterCandidatePreview`: 양 렌더 경로의 한글 페이지 검수. CI는 정지 프레임과 동작 MP4를 출력한다. 발음 타이밍 검수와 시각 검수는 별도다.

## 영상 전체 우측 하단 발표자

전사 공급자의 단어 시각은 어댑터에서 최대 20ms의 겹침·음성 경계 오차만 보정하며 원본과 보정 내역을 기록한다. 음성 범위 안의 길이 0인 단어는 해당 단어의 애니메이션 입력만 생략하고 원본·생략 이유를 기록한다. 음성과 자막은 유지하며 단어 길이를 지어내지 않는다. 모든 단어가 길이 0이거나, 역전, 순서 오류, 큰 겹침이 있으면 전사를 한 번 더 요청한다. 두 번째도 실패하면 렌더를 중단한다. 렌더러의 엄격한 트랙 검증은 유지한다. 각 응답은 검증 전에 alignment JSON에 저장하며, 최종 렌더 워크플로우는 실패해도 진단 JSON을 artifact로 남긴다. 재시도는 추가 전사 비용이 발생할 수 있으며 새 TTS 음성을 생성하지 않는다.

수동 manifest 최상위에 다음 옵션을 지정한다. 장면의 `presenter`는 null로 두고 사진·도식 레이아웃을 유지한다.

```json
{
  "presenterOverlay": {
    "position": "bottom-right",
    "hideOnCommonCta": true,
    "lipSync": "word-timestamps",
    "nod": "speech"
  }
}
```

- 1080×1920 기준 x=700, y=1320, 190×190 원형. 본문 전환 효과 밖에 한 번만 표시하고 자막은 왼쪽 공간에 예약한다. 텍스트/예약 영역과의 충돌을 프레임마다 검사한다.
- `hideOnCommonCta=true`이면 `commonPage=blog-cta-v1`이 시작되는 프레임부터 숨긴다. 본문 마지막 장과 CTA를 구분하며 페이지 번호에 의존하지 않는다. 생략하면 기존 CTA 포함 표시를 유지한다.
- `lipSync=word-timestamps`는 최종 재생 속도가 적용된 TTS MP3를 Whisper `whisper-1`, `verbose_json`, `timestamp_granularities=['word']`, `language=ko`로 전사한다. 최종 파일의 실측 길이를 사용한다. 원본 음성 시점을 속도 조절 뒤 그대로 사용하는 오류를 피한다.
- 단어의 시작/끝은 음성에서 얻고, 단어 내부는 한글 음절을 균등 분배해 모음 입형과 양순음 닫힘을 근사한다. **음소 수준 강제 정렬이나 정확한 한국어 발음 모델이 아니다.** 받침 연음·축약·음절 길이 차이와 전사 오류는 실제 음성 재생으로 검수한다. 현재 어댑터는 완성형 한글 단어를 지원하며 영어·숫자 표기는 조용히 추측하지 않고 오류를 낸다.
- `nod=speech`는 발화 구간에서만 절제된 노딩을 생성한다. 쉼과 문장 경계로 구간을 나누고 1.6초 이하의 고개 반응을 한 번씩 넣는다. 반복 루프를 깔지 않는다. 깜빡임과 선화 시간은 영상 전체에서 연속적이다.
- 무음 스토리보드는 음성 분석 API를 호출하지 않으며 입·노딩 시간을 만들어내지 않는다. `lipSync`/`nod` 생략 또는 `none`은 기존 대기 상태를 유지한다.
- 최종 render scene의 `overlayPresenter`는 공개 PresenterSpec의 mouths/actions 트랙을 사용한다. candidate JSON에는 생성하지 않는다. 실제 음성이 있는데 필수 트랙이 없으면 렌더를 중단한다. 누락·역전·겹침·범위 초과 타임스탬프도 오류다.
- 각 장면의 `scene-XX-presenter-alignment.json`에 최종 MP3 SHA-256, 모델, 단어 시각, 생성 트랙과 근사 방식 정보를 기록한다. 기존 OPENAI_API_KEY를 사용하며 해당 모드의 최종 TTS 렌더에서 장면당 전사 요청 한 번이 추가된다. 숨긴 CTA에는 전사 요청을 보내지 않는다.
- 기계 판독 계약은 `src/presenter/overlay.ts`의 PresenterOverlaySchema. 기존 presenter-bust와 동시에 사용할 수 없다. 생성 모델의 장면별 presenter 계약과 별개인 수동 manifest 옵션이다.

참고: [OpenAI 단어 타임스탬프 문서](https://developers.openai.com/api/docs/guides/speech-to-text#timestamp-granularities). 로컬 단위 테스트와 합성 타이밍을 쓴 렌더 검수는 실제 TTS의 청취 검수를 대체하지 않는다.


### 찢어진 종이 프레임

상시 발표자에서 `presenterOverlay.frame`은 `circle`(생략 시 기존 모습) 또는
`torn-paper-blue`를 선택한다. 위치·예약 영역·표정·입/노딩 트랙·CTA 숨김 규칙은 같다.
새 프레임은 투명 캐릭터와 구멍 뒤 그림자, 앞쪽 종이 접힘을 별도 벡터 레이어로 합성한다.
테두리 밖으로 나온 머리까지 기존 발표자 예약 박스 안에 들어가도록 한다.
