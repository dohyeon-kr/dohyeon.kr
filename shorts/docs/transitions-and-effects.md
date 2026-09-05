# 트랜지션·라이트 효과 사전

조사일: 2026-09-06. 쇼츠의 연출을 미리 정의하기 위한 카탈로그다. `light`는 조명·광학 효과로 해석한다. 아래 ID는 프로젝트용 이름이며 특정 편집기의 플러그인 이름과 일치할 필요는 없다.

**구현 상태:** 전환 20종과 라이트 효과 11종을 두 영상 렌더러에 연결했다. `match-cut`은 대응 노드 검증을 통과한 인접 도식에만 허용한다. `effects`와 `transitionOptions`는 선택 필드라 기존 후보도 읽을 수 있다. 도식의 geometry와 한글 라벨은 별도 레이어로 합성한다.

## 레이어 구분

- **트랜지션:** A 장면에서 B 장면으로 넘어가는 경계의 연출.
- **효과:** 장면 안의 사진·오브젝트·배경에 적용하는 광학적 표현.
- **카메라·요소 모션:** 관점 이동과 도식의 상태 변화. 기존 `camera`, `choreography`가 담당한다.

같은 빛도 컷 경계를 가리면 `light-leak-transition`, 사진 가장자리에 머물면 `light-leak`이다. 빛이 물체 표면을 훑는 `light-sweep`과 다음 장면을 드러내는 `light-wipe`도 구분한다.

## 트랜지션 20종

시간은 새 연출을 구현할 때 사용할 프로젝트 권장 범위이며 업계 표준이나 현재 코드의 설정값이 아니다. 실제 길이는 내레이션 휴지와 장면 길이에 맞춘다.

| ID | 화면에서 일어나는 일 | 어울리는 의미 | 권장 시간 | 상태 |
| --- | --- | --- | --- | --- |
| `none` | 별도 진입 모션 없이 등장 | 같은 구조를 계속 설명 | 0초 진입 | 지원¹ |
| `fade` | 투명도가 변하며 등장·퇴장 | 차분한 연결 | 0.25–0.45초 | 지원¹ |
| `slide-up` | 아래에서 위로 짧게 이동 | 다음 단계·누적 | 0.25–0.45초 | 지원 |
| `slide-left` | 오른쪽에서 왼쪽으로 이동 | 비교·시간 진행 | 0.25–0.45초 | 지원 |
| `zoom` | 작은 크기에서 원래 크기로 진입 | 세부 내용에 집중 | 0.3–0.5초 | 지원 |
| `wipe` | 왼쪽부터 화면을 드러냄 | 논리·단계 전환 | 0.3–0.5초 | 지원 |
| `blur-dissolve` | A를 흐리며 B로 겹쳐 바꾸고 선명하게 복귀 | 생각 정리·추상에서 구체로 | 0.3–0.5초 | 지원 |
| `directional-blur` | 한 방향으로 번지며 같은 방향의 B로 연결 | 이동·진행·흐름 | 0.2–0.35초 | 지원 |
| `zoom-blur` | 중심에서 방사형으로 번지며 확대 연결 | 전체에서 핵심·세부로 | 0.2–0.4초 | 지원 |
| `defocus-refocus` | 초점을 크게 풀었다가 B에서 다시 맞춤 | 발견·관점 재정립 | 0.45–0.7초 | 지원 |
| `cross-dissolve` | A와 B를 같은 시간에 겹쳐 교체 | 가까운 주제·시간 경과 | 0.3–0.5초 | 지원 |
| `dip-to-black` | A가 검게 닫히고 B가 열림 | 단락 종료·잠깐의 쉼 | 0.3–0.6초 | 지원 |
| `dip-to-white` | A가 흰색으로 닫히고 B가 열림 | 깨달음·강한 구분 | 0.25–0.45초 | 지원 |
| `push` | A를 밀어내는 만큼 B가 화면을 차지 | 인접한 항목·다음 페이지 | 0.3–0.5초 | 지원 |
| `iris-reveal` | 특정 중심의 원형 마스크가 확장 | 한 지점에서 전체로 | 0.35–0.6초 | 지원 |
| `luma-wipe` | 매트의 밝기 순서로 B가 나타남 | 질감·광원에 맞춘 전환 | 0.35–0.6초 | 지원 |
| `match-cut` | 같은 위치·형태의 대상을 컷 전후에 유지 | 비유·공통 구조·연속성 | 컷 자체 0초 | 조건부 지원² |
| `light-wipe` | 밝은 띠가 지나가며 B를 드러냄 | 결과 공개·장 구분 | 0.3–0.5초 | 지원 |
| `light-leak-transition` | 가장자리의 빛 번짐이 컷을 덮고 사라짐 | 사진의 감성적 연결 | 0.4–0.7초 | 지원 |
| `film-burn` | 불규칙한 노출 번짐이 화면을 덮으며 교체 | 회상·아날로그 맥락 | 0.3–0.6초 | 지원 |

¹ `none`은 진입·퇴장 페이드 없는 컷이다. `fade`와 `cross-dissolve`는 같은 겹침 구현을 사용한다. 첫 장면은 검정 배경에서 열린다. 전환은 다음 장면 시작 시 이전 장면의 마지막 비주얼을 정지해 겹치는 방식이며 오디오·전체 프레임 수를 줄이지 않는다. 사진과 도식 중심의 현재 파이프라인을 위한 선택이다. 움직이는 두 영상의 핸들을 겹치는 편집 방식은 아니다.

² `match-cut`은 단일 필터가 아니라 컷 전후 피사체의 좌표·크기·형태를 맞추는 편집 규칙이다. 대응 대상이 없으면 선택하지 않는다.

### 블러 계열 선택

일반적인 ‘블러 전환’의 기본값은 `blur-dissolve`로 정한다. 이동 방향이 의미를 갖는 경우만 `directional-blur`, 확대 대상이 명확하면 `zoom-blur`, 사진의 초점 변화 자체가 의미를 가질 때는 `defocus-refocus`를 쓴다. Adobe는 방향성 블러를 이동감, 방사형 블러를 줌·회전의 표현으로 설명한다. 이 분류를 전환 설계에 적용했다. [Adobe Blur and Sharpen](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/blur-sharpen-effects.html)

블러 강도 시작값은 1080px 폭 기준 12px, 최대 24px로 제안한다. 해상도에 비례해 조정하고 효과 종료 시 정확히 0으로 돌아온다. 방향성·방사형 블러는 등방성 CSS blur와 다른 연산이므로 단순 blur+이동을 구현했다면 ‘근사 표현’으로 표기한다.

## 라이트 효과 11종

모든 항목은 렌더러에서 선택할 수 있다. 기본 색은 흰색·중성 회색이다. 기존 모노크롬 톤에서는 컬러 누광·무지개 플레어를 기본값으로 사용하지 않는다. Adobe의 효과 목록과 생성·스타일 효과 문서를 참고하되 아래 사용처·강도는 이 프로젝트의 제안이다. [Modern effects](https://helpx.adobe.com/premiere/desktop/add-video-effects/types-of-effects/effects.html), [Generate effects](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/generate-effects.html), [Stylize effects](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/stylize-effects.html)

| ID | 정의·사용처 | 기본 연출 | 주요 조절값 |
| --- | --- | --- | --- |
| `light-sweep` | 표면을 빛이 훑음. 핵심 숫자·결과 오브젝트 공개 | 0.6초 동안 한 번, 대상 내부로 마스킹 | angle, width, softness, intensity |
| `light-leak` | 화면 가장자리로 부드러운 빛이 유입. 사진의 분위기 | 1.2초 완만한 등장·퇴장 | edge, spread, color, opacity, seed |
| `glow` | 대상의 밝은 부분 주변에 광채. 활성 노드·최종 결과 | 0.5초 상승 후 안정 | threshold, radius, intensity |
| `bloom` | 강한 하이라이트가 넓게 번짐. 역광 사진 | 사진 하이라이트에만 약하게 | threshold, radius, intensity |
| `lens-flare` | 광원이 렌즈에 들어온 듯한 반사 패턴 | 사진 속 광원에 맞춰 0.8초 | sourceX, sourceY, scale, intensity |
| `light-streak` | 길고 얇게 뻗는 빛줄기. 짧은 결과 강조 | 0.4초 동안 한 번 | angle, length, thickness, intensity |
| `light-rays` | 광원에서 퍼지는 광선. 공간·방향 표현 | 배경에서 1.2초 완만하게 | origin, spread, length, density |
| `spotlight` | 선택 영역만 밝히고 주변을 어둡게 함 | 0.6초에 걸쳐 대상에 집중 | target, radius, feather, dimAmount |
| `glint` | 작은 반짝임이 짧게 나타남. 도달점·성취 표시 | 0.25초 동안 한 지점 한 번 | position, size, rayCount, intensity |
| `rim-light` | 외곽선을 따라 빛을 더함. 배경과 대상 분리 | 대상 등장 시 0.5초 | mask, width, softness, intensity |
| `flow-glow` | 라인을 따라 이동하는 펄스 중심에 방사형 광채. 데이터·신호·에너지 전달 | 1초에 한 경로 통과, 도착 후 소멸 | pathId, progress, coreRadius, haloRadius, intensity, trailLength |

`glow`는 국소 강조, `bloom`은 사진의 하이라이트 번짐으로 용도를 나눈다. 이는 프로젝트 내부 구분이며 도구마다 두 용어와 구현이 겹칠 수 있다. `spotlight`와 `rim-light`는 마스크·명암 합성으로도 만들 수 있는 연출 프리셋이다.

## 경로를 흐르는 빛: `flow-glow`

사용자 제안: 라인을 흐르는 펄스 주위에 방사형 그라디언트를 붙여 발광을 표현한다. 정적인 장식보다 데이터 전달·신호 전파·에너지 이동처럼 원래 도식의 의미를 강화하는 효과를 우선한다.

세 층을 같은 경로 좌표에 맞춘다.

1. **기본 라인:** 낮은 명도로 경로를 계속 보여준다.
2. **펄스 중심:** 작은 밝은 점 또는 짧은 선분으로 현재 위치를 선명하게 표시한다.
3. **광채:** 중심에서 가장 밝고 가장자리에서 투명해지는 방사형 그라디언트를 펄스와 함께 이동한다. 라인 바깥으로도 번지게 하되 라벨 위를 덮지 않는다.

1080px 폭 기준 제안 시작값은 라인 두께 3px, 중심 반지름 4px, 광채 반지름 24px다. 그라디언트는 중심 alpha 0.55 → 반경 35%에서 0.18 → 가장자리에서 0으로 감쇠시킨다. 실제 장면에서 조정할 설계값이며 렌더 검증된 값은 아니다. 중심과 광채 강도는 별도로 조절한다. 중심까지 함께 흐리면 초점이 없는 얼룩처럼 보일 수 있다.

펄스와 광채는 하나의 `progress`로 위치를 계산한다. 곡선에서도 속도를 일정하게 하려면 경로의 누적 길이에 따라 위치를 구한다. 선택적 꼬리는 화면의 가로 방향이 아니라 지나온 경로를 따라 짧게 남기고 감쇠시킨다. 도착 시 광채를 줄이고, 필요하면 도착 노드의 `glow`로 강조를 이어간다.

합성 순서는 배경 → 기본 라인 → 광채 → 펄스 중심 → 라벨·자막이다. `screen`은 어두운 배경에서 시작값으로 쓰고, 밝은 배경에서는 중심과 라인의 대비를 별도로 확보한다. 광채 반경만큼 여백을 두어 컨테이너 경계에서 잘리지 않게 한다. 라인 자체의 얇은 마스크에 광채를 가두지 않는다.

기본은 전달 이벤트당 한 번 통과하며, 지속 흐름을 설명할 때만 반복한다. 반복 시 끝에서 시작으로 되돌아가는 점이 보이지 않도록 끝에서 사라지고 시작에서 다시 나타나게 한다. 확인 프레임은 시작·경로 중간·곡선 꼭짓점·노드 도착·소멸이며, 여러 펄스가 겹칠 때의 과도한 밝기와 인접 한글 라벨의 가독성도 확인한다.

## 사전 설정 계약

장면의 `transition`은 위 ID를 받는다. 선택 필드 `transitionOptions`는 `durationMs`(0–1200, 기본 400), `intensity`(0–1, 기본 0.35), `direction`(left/right/up/down), `origin`([x,y], 각 0–1), `matchTarget`을 받는다. easing은 smoothstep으로 고정한다. 짧은 장면에서는 완료 프레임을 장면 마지막 프레임 안으로 제한한다. `none`과 `match-cut`은 durationMs를 무시하고 즉시 컷한다. direction은 방향성 블러·wipe·push·light-wipe, origin은 iris·zoom-blur에 적용한다.

장면의 선택 필드 `effects`는 최대 4개이며, 각 항목은 `type`, `target`, `startMs`, `durationMs`(100ms 이상), `intensity`(0–1), `color`(#RRGGBB), `seed`(0–65535)를 받는다. `target`은 `background`, `photo`, `visual`, 또는 도식 노드 ID다. 시간은 장면 시작 기준이며 영상 끝을 넘어간 부분은 재생되지 않는다. 시작·끝에서 강도를 0으로 감쇠시킨다.

수동 후보 편집에서는 `radius`, `coreRadius`, `trailLength`, `origin`, `repeat`를 추가할 수 있다. radius는 glow/bloom/rim-light/flow-glow, coreRadius와 trailLength는 flow-glow, origin은 flare/streak/rays/spotlight/glint가 사용한다. seed는 누광의 시작 위치를 고정한다. 이외의 카탈로그 조절값은 향후 확장 항목이며 현재 JSON에 넣으면 검증 오류로 처리한다.

`flow-glow`는 line 또는 circle 노드에만 적용한다. line은 현재 프레임의 방향·길이·회전·위치를 따라 펄스가 이동하고, circle은 이미 설정된 노드 이동을 따른다. 현재 도식 문법은 직선을 지원한다. 경로 샘플러는 여러 선분의 길이를 따라 이동할 수 있지만 곡선 편집 필드는 아직 노출하지 않는다. 다른 노드 대상 효과는 glow/bloom/rim-light/light-sweep에 한정한다. 텍스트 노드는 대상이 될 수 없다. photo는 사진 장면에서만, visual은 도식·상징·숫자 장면에서만 사용한다.

빛 오버레이는 `screen`, spotlight의 감광은 normal로 고정한다. blendMode는 외부 필드로 받지 않는다. intensity는 0.15부터 조정하되 작은 펄스의 flow-glow는 0.8–1.0부터 확인한다. `spotlight`의 주변 감광은 별도 normal/multiply 마스크로 처리한다. `glow`/`bloom`은 하이라이트 추출 및 블러 연산이 먼저 필요하다. 한 가지 blend mode만 지정해서 모든 효과를 흉내 내지 않는다.

아래는 실제 후보 장면에 추가할 수 있는 필드다. 도식에 `connection`이라는 line 노드가 있어야 한다.

```json
{
  "transition": "blur-dissolve",
  "transitionOptions": {"durationMs": 400, "intensity": 0.35},
  "effects": [{
    "type": "flow-glow",
    "target": "connection",
    "startMs": 700,
    "durationMs": 1800,
    "intensity": 1,
    "color": "#ffffff",
    "seed": 17,
    "radius": 36,
    "coreRadius": 5,
    "trailLength": 38
  }]
}
```

## 선택·조합 규칙

- 같은 도식의 상태 변화는 좌표와 연결 관계를 유지한다. 전환으로 전후 비교를 가리지 않는다.
- 블러와 라이트 효과의 기본 대상은 사진·비주얼이다. 자막과 한글 라벨은 선명하게 유지하고 광원보다 위에 합성한다. 전체 장면 블러는 텍스트가 없는 짧은 경계 구간에만 쓴다.
- 기본값은 전환 1개와 선택적 라이트 효과 1개다. 강한 전환과 강한 플레어를 같은 순간에 중첩하지 않는다.
- `blur-dissolve` + 결과 등장 후 `light-sweep`, `match-cut` + 낮은 `glow`, 사진 `cross-dissolve` + 가장자리 `light-leak`를 시작 조합으로 제안한다.
- `film-burn`, `dip-to-white`, `lens-flare`는 서사상 이유가 있는 장면에만 선택한다. 기본 자동 선택은 끈다. 반복 섬광을 프리셋으로 만들지 않는다.
- glow 반경 때문에 한글 받침·인접 노드가 붙어 보이지 않는지, 최대 광량에서 흰 글자가 사라지지 않는지 확인한다. 자세한 기준은 [한글 간격과 겹침 방지](creative-system.md#한글-간격과-겹침-방지)를 따른다.

## 렌더 확인과 구현 범위

- `MotionEffectsPreview`: 한글 도식과 flow-glow, 블러, 라이트 와이프를 보여주는 1080×1920 무음 데모.
- `MotionEffectsGallery`: 전환 20종과 효과 11종 전체 갤러리.
- `DarkMotionEffectsPreview`: 대체 테마의 동일 연출 확인.
- `FlowGlowPreview`: 도식 단독 확인. Motion Canvas와 Remotion은 공통 SVG 광채·라벨 레이어를 사용한다.
- `node scripts/verify-motion-render.mjs`로 중간 프레임, 두 테마, 두 도식 엔진과 실패 시 대체 엔진, 최종 데모를 렌더한다. 설치된 Chrome을 사용하려면 `CHROME_EXECUTABLE`을 지정한다. 결과는 `shorts/out/motion-effects/`에 저장되며 음성 API는 호출하지 않는다.

방향성 블러는 SVG의 비등방성 Gaussian blur다. 줌 블러는 중심 확대 샘플 6개를 합성하는 근사 방식이며 물리적 셔터 시뮬레이션은 아니다. defocus는 Gaussian blur로 렌즈 초점 변화를 근사한다. luma-wipe는 절차적으로 만든 선형 밝기 매트이며 외부 텍스처 입력은 없다. film-burn과 flare/leak/rays는 모노크롬 그래픽 연출이다. 실제 촬영 필름·렌즈 시뮬레이션이나 외부 플러그인을 사용하지 않는다.

기존 `diagramFramesPath` PNG는 라벨이 합쳐져 있으므로 현재 분리 합성에서는 사용하지 않고 live geometry를 재평가한다. Motion Canvas 복잡도에 따라 렌더가 느려질 수 있다. 도식의 노드 라벨은 항상 효과 위에 합성한다. 기존 프리셋 차트 자체에 포함된 축 글자 등은 별도 도식 라벨 레이어가 아니므로 강한 visual 전체 효과보다 특정 도식 노드를 대상으로 선택한다.

`match-cut`은 인접한 diagram-centered 장면의 같은 노드 ID에 대해 이전 최종 상태와 다음 초기 상태의 형태·좌표·크기·회전·scale·opacity가 일치해야 한다. 다른 레이아웃의 사진 대응 컷은 지원하지 않는다. 잘못된 전환 ID·대상·범위는 조용한 fade 대체 대신 렌더 전에 오류로 알린다.

전환의 광원·매트 활용 근거: [Adobe Transition effects](https://helpx.adobe.com/after-effects/desktop/apply-effects-and-animation-presets/list-of-effects/transition-effects.html). 이 문서의 분류, 조합과 수치 기본값은 해당 자료를 참고한 프로젝트 설계안이며 Adobe 또는 Remotion의 공식 권장값은 아니다.
