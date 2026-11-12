# 동적 디더링 구현 계약 · HyperFrames

> 2026-11-11 「추정 해상도 향상 기법」 릴스 회고. 이 문서는 **앞으로 제작할 디더링 릴스의 필수 품질 기준**이다. 현재 영상과 기존 HyperFrames 컴파일러에 이미 구현됐다는 의미가 아니다.

## 문제와 목표

이번 릴스는 Bayer 도트가 적용됐지만, 미리 계산된 도트 구체/숫자/그래프를 단순히 `transform`, 확대, 이동, 마스킹 또는 크롭하는 장면이 많았다. **정적 도트 패턴이 움직이는 것**은 **움직이는 명암·그라데이션을 매 프레임 디더링하는 것**과 다르다.

**필수 원칙: 도형·명암·광원·그라데이션·알파가 시각적으로 변화하면, 최종 출력 좌표계에서 디더링 결과도 프레임마다 다시 계산되어야 한다.** 정적 디더링 PNG/SVG/점 배열을 변형하는 방식은 핵심 장면의 구현으로 인정하지 않는다.

## 렌더 순서

```text
HyperFrames 결정적 시각 t
  → 원본 도형의 연속 톤 생성 (shape, signed distance, light, gradient, alpha)
  → t에 따른 광원/명암/형태/크기/위치 업데이트
  → 최종 출력 해상도·좌표계에서 Bayer ordered-dithering / shader 적용
  → 결과 합성
  → 선명한 한글 타이포·눈금·설명 자막을 별도 최상단 레이어에 합성
```

**금지:** `pre-dithered.png → crop/translate/scale` 또는 `static dots.svg → GSAP transform`만으로 핵심 디더링 애니메이션을 구현하기.

**권장:** Canvas 2D + OffscreenCanvas/임시 버퍼에서 `render(timeSeconds)`를 수행하거나 WebGL/WebGPU fragment shader로 출력 픽셀마다 디더링을 계산한다. 성능에 맞춰 렌더 버퍼를 축소하더라도 의도한 픽셀/도트 크기와 정렬을 유지하고, 출력 프레임에 대한 선명한 최근접 샘플링을 사용한다. CSS `background-image: radial-gradient(...)`나 `background-clip:text`는 보조 표현만 허용한다.

## 계조·그라데이션 연출

- 단색 도형보다 **연속 톤이 분명한 입체 구체·링·브랜치·곡면**을 먼저 설계한다.
- 광원의 위치/방향, 그림자 경계, 명암 분포, 밝기 램프, 부드러운 알파 전이를 `t`에 따라 변화시켜 도트의 **밀도와 분포가 실제로 바뀌게** 한다.
- 예: 회전하는 조명에 따라 구체의 하이라이트가 이동하고, 동일 화면 위치에서 밝기 값이 달라지므로 Bayer 임계값을 통과하는 도트가 생기거나 사라진다.
- 큰 숫자·주요 구간 그래프도 원본 명암/채움 구간을 먼저 계산한 뒤 디더링한다. **작은 숫자, 눈금, 캡션, 한글 본문은 샤프하게** 남긴다.
- 그라데이션은 **디더링을 위한 의미 있는 계조 데이터**다. Monoliquid의 '장식용 그라데이션 금지' 원칙과 구분한다. 무의미한 광택/네온 장식은 계속 금지한다.

## 결정성과 시간 일관성

- HyperFrames seek/snapshot이 같은 `t`를 요청하면 **언제나 동일한 프레임**을 반환해야 한다. `Date.now()`, `Math.random()`, 실제 누적 프레임 상태, 무한 애니메이션에 의존하지 않는다.
- Bayer 8×8 임계값의 **스크린 좌표 기준 앵커와 셀 크기를 고정**한다. 도형/광원이 이동할 때 명암의 변화 때문에 점이 갱신되도록 하고, 임의의 프레임별 노이즈로 '살아 있음'을 흉내 내지 않는다.
- **객체 크롭은 화면 구성용으로 허용**하되, 디더링을 구현한 유일한 방법이어서는 안 된다. 객체의 스크린 공간 광도 변화가 없으면 '동적 디더링'으로 보지 않는다.
- 텍스트와 의미 있는 그래프 라벨의 경계는 기존 1080×1920 안전영역 기준을 그대로 따른다. 움직이는 오브젝트가 텍스트를 덮거나 판독성을 떨어뜨리지 않도록 레이어를 분리한다.

## 구현 의사코드 (프레임 독립)

```js
function renderDither(timeSeconds, outputWidth, outputHeight) {
  // 1. shape/light/gradient are pure functions of time and screen coordinates.
  const source = renderContinuousTone({ timeSeconds, outputWidth, outputHeight });

  // 2. Quantize the CURRENT source at the output grid, not a cached dither image.
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const luminance = source.lumaAt(x, y); // 0..1, after light/gradient
      const alpha = source.alphaAt(x, y);     // 0..1
      const threshold = (BAYER_8x8[y % 8][x % 8] + 0.5) / 64;
      const ink = luminance * alpha >= threshold ? 255 : 0;
      writeDitherPixel(x, y, ink);
    }
  }

  // 3. Overlay crisp typography AFTER the dither pass.
  compositeSharpLabelsAndKoreanCopy();
}
```

이 코드는 **의사코드**다. 실제 성능을 위해 점 단위 샘플링·WebGL shader·Canvas 버퍼 최적화를 선택할 수 있다. 밝기/알파 합성 방식과 역상 팔레트는 장면별로 명시한다.

## 검수: 정적 디더링과 동적 디더링 구별

1. **동일 시점 재현성:** 서로 다른 실행에서 동일한 `t`를 렌더하면 결과가 일치한다.
2. **동적 계조 증거:** 카메라/도형 위치가 같거나 비교 가능한 구간에서 광원/그라데이션만 바꿔도 점의 출현·소멸/밀도 변화가 관찰된다. 단순 평행이동·확대만 보이면 실패.
3. **의미 있는 변화:** 밝은 곳은 점이 조밀하고 어두운 곳은 성기며, 중간톤의 패턴이 계조 변화에 따라 갱신된다. 무작위 깜박임만 늘어나는 경우 실패.
4. **샘플링:** 시작·중간·종료뿐 아니라 조명/그라데이션 변화가 가장 큰 중간 프레임을 스냅샷으로 비교한다.
5. **가독성:** 한글 본문/설명 자막/작은 숫자/눈금은 선명하게 유지하고, 실제 글리프·상자 경계/릴스 안전마진을 검수한다.
6. **출력:** HyperFrames `lint`, `check`, `snapshot`, 최종 MP4 프레임/오디오 검증을 통과해야 한다. CLI의 일반 레이아웃 검사는 '진짜 동적 디더링'을 자동 증명하지 못하므로 위의 시각 검수를 추가한다.

## 기존 프리셋 및 적용 범위

- [hyperframes-reel-preset.json](hyperframes-reel-preset.json): 후속 수동 제작용 디더링 설정.
- [README.md](README.md): 서사, 안전영역, 나레이션과 품질 게이트.
- [Monoliquid v2 DESIGN](../../hyperframes/monoliquid-v2/DESIGN.md): 공통 디자인 규칙.

**2026-11-13 현재:** `style.reelProfile`이 명시된 새 Monoliquid v2 릴스는
`shorts/hyperframes/monoliquid-v2/reel-dither.js`를 통해 **사진과 지원되는 구체/링/blob 심벌**에
seek-safe Bayer 동적 디더링을 적용한다. 문서만 존재하던 이전 상태와 달리 해당 경로는
HyperFrames 컴파일러에 연결되었다. 단, 범용 `diagramSpec` 노드/복잡한 그래프의 동적
디더링, 실제 게시물 시각 유사도 자동 채점, 전면적인 3D 회전은 여전히 미구현이다.
기존 영상은 변경되지 않으며, 테스트 통과가 실제 시각 품질의 자동 보증은 아니다.
