# 프론트엔드와 백엔드 개발자 협업하기

**템플릿:** Notebook Grid · 가벼운 에세이 (notebook-grid)

원본: [candidate-01.json](https://github.com/dohyeon-kr/dohyeon.kr/blob/f6ca952f85ceb6384b0393028f0f566f55e39b83/shorts/content/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/candidate-01.json)

JSON에서 자동 생성한 검토용 스토리보드입니다. 수정은 원본 JSON에 반영한 뒤 다시 생성하세요. 연출 설명은 기획 의도이며, 실제 배치·동작은 렌더된 스냅샷과 영상으로 확인합니다. 음성 생성 전이므로 재생 시간은 확정하지 않습니다.

**첫 문장:** 회사에서 백엔드 개발자와 나란히 앉아 일하고 있습니다.

**기획 의도:** 옆자리 백엔드 동료와 함께 정한 워크플로우 사례를 소개하는 에세이다. 본문 1~2장 소개 → 3~5장 SDK 변경·버전 선택 → 6~7장 Bruno 인증·요청 공유 → 8~10장 traceparent와 공동 문제 추적 → 11장 세 과정에서 나온 결정을 티켓·PR로 기록 → 12~13장 개인적 다짐으로 구성했다. 세 축은 변경을 확인하고 실제 요청을 보내며 문제가 생기면 앞뒤를 추적하는 협업 과정으로 연결된다. SDK 고정과 서버 호환성을 구분하고 원문 밖 성과를 만들지 않는다. 2장은 사용자가 최종 지정한 워크플로우를 정한 사례 소개로 전체 교체했으며 중복 소개는 제거했다. 본문 13장은 세 사례의 배경·변화·조건을 보존하기 위한 분량이다. 사진 3장은 맥락용 스톡 이미지다. viralScore는 실측이 아닌 편집 추정값이다. 시각 수정: 본문 우측 하단 상시 발표자를 복원했다. 도식 8장(3~6, 8~11), 사진 3장(1, 7, 13), 큰 타이포 2장(2, 12)으로 각 역할을 구분했다. 조사한 공식 문서는 도식 관계 검증에만 사용했고 저자의 경험이나 내레이션 사실을 추가하지 않았다.

**원문:** [프론트엔드와 백엔드 개발자 협업하기](<https://blog.dohyeon.kr/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/>)

## 1. 도입 — 프론트엔드와 백엔드 개발자 협업하기

![장면 1](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-01.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-01.png)

**내레이션**

회사에서 백엔드 개발자와 나란히 앉아 일하고 있습니다. 필요한 게 있으면 바로 물어봅니다. 이 값도 받을 수 있는지, 이 에러는 왜 나는지.

**화면 구성**

- 주 문구: 프론트엔드와 백엔드 개발자 협업하기
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 옆자리에서 수시로 묻는 원문의 상황을 연다.
- 표현 방식: 사진
- 표현 이유: 실제 저자·동료의 모습이 아닌 맥락용 스톡 사진이다. 노트 위 흰 인화지와 상단 테이프로 합성하고 원본 비율을 보존한다.
- 사진 검색어: coworkers looking laptop
- 사진 출처: [노트북을 함께 보는 동료들](<https://www.pexels.com/photo/coworkers-looking-at-a-laptop-in-an-office-8127690/>) · 라이선스 pexels

**연출 흐름**

1. 시각 요소 등장

카메라: 고정

장면 전환: 없음

**자막과 낭독 리듬**

1. 회사에서 백엔드 개발자와
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 나란히 앉아 일하고 있습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 필요한 게 있으면 바로 물어봅니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
4. 이 값도 받을 수 있는지,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. 이 에러는 왜 나는지.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 2. 핵심 메시지 — 함께 정한 워크플로우

![장면 2](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-02.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-02.png)

**내레이션**

이번에는 옆자리 백엔드 개발자와 같이 일하면서 워크플로우를 정한 몇 가지 사례에 대해 이야기하고자 합니다.

**화면 구성**

- 주 문구: 함께 정한 워크플로우
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 옆자리에서 함께 일한다는 상황에서 SDK·요청 공유·문제 추적의 세 가지 사례를 소개한다.
- 표현 방식: 문장 중심
- 표현 이유: 소개 문장은 자막으로 전달하고 중앙에는 전체 사례를 묶는 짧은 문구만 둔다.

**연출 흐름**

1. 주 문구 등장

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 이번에는 옆자리
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
2. 백엔드 개발자와
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 같이 일하면서
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 워크플로우를 정한
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
5. 몇 가지 사례에 대해
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
6. 이야기하고자 합니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 3. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-03-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-03-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-03.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-03.png)

**내레이션**

먼저 API를 코드에서 호출하는 SDK 이야기입니다. 예전에는 백엔드가 바뀌면 SDK도 프론트엔드 저장소에 바로 들어왔습니다. 편했지만, 업데이트 시점을 직접 고르기는 어려웠습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 이전: 백엔드 변경이 SDK 동기화 커밋으로 프론트엔드 저장소에 들어온다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 사각형 ‘백엔드’, 사각형 ‘프론트엔드 저장소’, 글자 ‘SDK 자동 동기화’

**연출 흐름**

- 시작: 백엔드와 프론트엔드 저장소를 표시한다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: SDK 자동 동기화 연결이 나타난다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 업데이트를 받는 시점을 직접 선택하기 어려운 구조를 보여준다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 먼저 API를 코드에서 호출하는
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. SDK 이야기입니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 예전에는 백엔드가 바뀌면
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. SDK도 프론트엔드 저장소에
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. 바로 들어왔습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
6. 편했지만, 업데이트 시점을
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
7. 직접 고르기는 어려웠습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 4. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-04-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-04-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-04.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-04.png)

**내레이션**

앱을 관리하면서는 어떤 버전을 쓸지 직접 정할 필요가 생겼습니다. 그래서 SDK를 패키지로 배포하고, 프론트엔드가 변경 내용을 확인한 뒤 필요한 버전을 설치하게 했습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 이후: SDK 패키지 발행과 필요한 버전 설치 시점을 분리한다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 선, 사각형 ‘백엔드’, 사각형 ‘SDK 패키지’, 사각형 ‘프론트엔드’, 글자 ‘확인 후 버전 선택’

**연출 흐름**

- 시작: 백엔드·패키지·프론트엔드가 분리되어 있다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 발행 연결 뒤 설치 연결과 버전 선택 문구가 나타난다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 프론트엔드가 변경을 확인한 뒤 필요한 버전을 선택한다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 확인 후 버전 선택: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 앱을 관리하면서는
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 어떤 버전을 쓸지
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 직접 정할 필요가 생겼습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
4. 그래서 SDK를 패키지로 배포하고,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. 프론트엔드가
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
6. 변경 내용을 확인한 뒤
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
7. 필요한 버전을 설치하게 했습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 5. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-05-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-05-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-05.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-05.png)

**내레이션**

다만 SDK 버전을 고정해도 서버는 계속 바뀝니다. 구버전 앱과의 호환성은 여전히 함께 챙겨야 합니다. 지금은 어떤 변경이 들어왔는지 알아보기 쉬워진 점이 좋습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: SDK를 고정해도 구버전 앱이 변경된 서버에 보내는 요청의 호환성은 함께 확인한다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 사각형 ‘구버전 앱’, 사각형 ‘변경된 서버’, 글자 ‘호환성은 별도 확인’

**연출 흐름**

- 시작: 구버전 앱과 변경된 서버를 표시한다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 요청 연결과 호환성 조건을 나타낸다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: SDK 버전 선택과 서버 호환성을 구분한다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 호환성은 별도 확인: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 다만 SDK 버전을 고정해도
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 서버는 계속 바뀝니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 구버전 앱과의 호환성은
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 여전히 함께 챙겨야 합니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
5. 지금은 어떤 변경이 들어왔는지
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
6. 알아보기 쉬워진 점이 좋습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 6. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-06-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-06-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-06.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-06.png)

**내레이션**

변경 내용을 확인했다면, 실제 요청도 보내봐야 합니다. 이때 쓰기 시작한 도구가 Bruno입니다. 매번 로그인해서 토큰을 복사하던 일을, 인증 요청으로 받아 저장하고 다음 요청에 쓰도록 바꿨습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: Bruno 인증 요청에서 받은 토큰을 저장하고 후속 API 요청에서 사용한다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 선, 사각형 ‘인증 요청’, 사각형 ‘토큰 저장’, 사각형 ‘후속 요청’, 글자 ‘복사 대신 재사용’

**연출 흐름**

- 시작: 인증·저장·후속 요청 세 단계를 표시한다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 인증에서 저장, 저장에서 후속 요청으로 순차 연결한다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 토큰을 매번 수동 복사하던 반복을 줄인 방법을 보여준다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 복사 대신 재사용: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 변경 내용을 확인했다면,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 실제 요청도 보내봐야 합니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 이때 쓰기 시작한 도구가
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. Bruno입니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
5. 매번 로그인해서
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
6. 토큰을 복사하던 일을,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
7. 인증 요청으로 받아 저장하고
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
8. 다음 요청에 쓰도록 바꿨습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 7. 사진 — 

![장면 7](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-07.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-07.png)

**내레이션**

동료도 토큰을 복사하는 일이 사라져서 좋다고 했습니다. 요청 모음을 함께 관리하니 어떤 요청을 보냈는지도 같이 볼 수 있었습니다. 소개한 보람이 있었습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 인증 자동화의 동료 반응에서 같은 요청을 함께 확인하는 협업 방식으로 발전한다.
- 표현 방식: 사진
- 표현 이유: 개발자의 실제 모습이 아닌 맥락용 스톡 사진으로 함께 일하는 분위기를 보여준다. 흰 인화지와 반투명 테이프는 별도 합성한다.
- 사진 검색어: colleagues laptops office
- 사진 출처: [나란히 노트북으로 작업하는 동료들](<https://www.pexels.com/photo/focused-colleagues-working-on-laptops-in-office-5324853/>) · 라이선스 pexels

**연출 흐름**

1. 시각 요소 등장

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 동료도 토큰을 복사하는 일이
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 사라져서 좋다고 했습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 요청 모음을 함께 관리하니
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 어떤 요청을 보냈는지도
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. 같이 볼 수 있었습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
6. 소개한 보람이 있었습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 8. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-08-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-08-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-08.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-08.png)

**내레이션**

같은 요청을 확인하는 건 문제를 찾을 때도 도움이 됩니다. 다만 서버의 기록만으로는 프론트엔드에서 어떤 과정을 거쳐 요청을 보냈는지 알기 어려웠습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 서버 기록만 볼 때 클라이언트에서 요청 전 무슨 일이 있었는지 연결해 보기 어려웠다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 사각형 ‘클라이언트’, 사각형 ‘백엔드’, 글자 ‘요청 전 맥락’, 글자 ‘서버 기록’

**연출 흐름**

- 시작: 두 영역은 있지만 연결은 비어 있다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 클라이언트 맥락과 서버 기록을 각각 표시한다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 다음 장면에서 이어야 할 두 영역을 남긴다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 요청 전 맥락: 점차 드러남
- 서버 기록: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 같은 요청을 확인하는 건
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 문제를 찾을 때도 도움이 됩니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
3. 다만 서버의 기록만으로는
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 프론트엔드에서 어떤 과정을 거쳐
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. 요청을 보냈는지 알기 어려웠습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 9. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-09-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-09-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-09.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-09.png)

**내레이션**

그래서 프론트엔드의 요청에도 추적 정보를 붙여 백엔드 기록과 연결하기 시작했습니다. 이 정보를 전달하는 헤더가 traceparent입니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 같은 배치에서 traceparent가 전달하는 추적 정보로 클라이언트와 백엔드 기록을 연결한다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 사각형 ‘클라이언트’, 사각형 ‘백엔드’, 글자 ‘traceparent’

**연출 흐름**

- 시작: 앞 장면의 두 영역을 같은 위치에 유지한다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 두 영역 사이 전체 연결선과 traceparent 이름이 나타난다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 요청의 앞뒤를 연결해 본다. 헤더 전체가 모든 구간에서 불변이라는 뜻은 아니다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- traceparent: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 그래서 프론트엔드의 요청에도
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 추적 정보를 붙여
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 백엔드 기록과 연결하기 시작했습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
4. 이 정보를 전달하는 헤더가
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
5. traceparent입니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 10. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-10-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-10-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-10.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-10.png)

**내레이션**

이렇게 하니 사용자 문의를 볼 때도 같은 요청을 따라가며 문제가 생긴 구간을 함께 살펴볼 수 있었습니다. 로그를 따로 열고 비슷한 시간대를 맞춰보던 수고도 줄었습니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 사용자 문의에 해당하는 같은 요청의 클라이언트와 백엔드 구간을 순서대로 살펴본다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 사각형 ‘클라이언트’, 사각형 ‘백엔드’, 글자 ‘사용자 문의’, 글자 ‘같은 요청을 따라 확인’

**연출 흐름**

- 시작: 사용자 문의와 이전 장면의 추적 구조가 있다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 클라이언트→연결→백엔드 순서로 확인 대상을 나타낸다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 어느 구간인지 살펴보는 순서이며 백엔드가 실제 원인이라는 단정이나 가짜 오류 표시는 하지 않는다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 사용자 문의: 점차 드러남
- 클라이언트: 점차 드러남
- 선: 점차 드러남
- 백엔드: 점차 드러남
- 같은 요청을 따라 확인: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 이렇게 하니 사용자 문의를 볼 때도
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 같은 요청을 따라가며
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 문제가 생긴 구간을
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 함께 살펴볼 수 있었습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
5. 로그를 따로 열고
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
6. 비슷한 시간대를 맞춰보던
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
7. 수고도 줄었습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 11. 핵심 메시지 — 

| 시작 | 변화 | 결과 |
| --- | --- | --- |
| ![시작](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-11-initial.png) | ![변화](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-11-change.png) | ![결과](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-11.png) |

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-11.png)

**내레이션**

이렇게 변경 내용을 확인하고, 요청을 보내보고, 문제를 함께 찾다 보면 바꿔야 할 부분이 나옵니다. 그때 이야기해서 정한 내용은 티켓이나 PR에 남기고 있습니다. 요청한 이유와 진행 상태를 서로 확인할 수 있도록 말입니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 대화에서 정한 변경을 티켓과 PR에 남겨 요청 맥락과 변경 상태를 확인한다.
- 표현 방식: 공간 도식
- 표현 이유: 대상과 전달·확인 관계를 직접 그려 대본의 워크플로우를 설명한다. 장식용 아이콘이나 가짜 UI·수치 없이 원문에 있는 관계만 표시한다.
- 도식 구성: 선, 선, 사각형 ‘대화’, 사각형 ‘티켓’, 사각형 ‘PR’, 글자 ‘이유·진행 상태·변경’

**연출 흐름**

- 시작: 대화·티켓·PR을 표시한다.
- 사건: 내레이션이 전달 또는 확인할 관계를 설명한다.
- 변화: 기록과 변경으로 이어지는 연결 뒤 확인할 맥락을 보여준다.
- 유지: 연결선→객체→라벨 순서. 선은 노드 외곽에서 멈추며 전체 길이의 opacity로만 등장한다. 고정 라벨은 겹치지 않고 마지막 상태를 유지한다. 도식과 하단 자막·우측 하단 발표자를 분리한다.
- 결과: 사람의 기억에만 의존하지 않고 함께 볼 수 있는 기록을 남긴다. 강제 업무 순서나 자동 연동을 주장하지 않는다.

1. 시각 요소 등장
2. 시각 요소의 변화 진행

도식에서 설정된 변화(시작 순서):

- 선: 점차 드러남
- 선: 점차 드러남
- 이유·진행 상태·변경: 점차 드러남

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 이렇게 변경 내용을 확인하고,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 요청을 보내보고,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 문제를 함께 찾다 보면
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 바꿔야 할 부분이 나옵니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
5. 그때 이야기해서 정한 내용은
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
6. 티켓이나 PR에 남기고 있습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
7. 요청한 이유와 진행 상태를
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
8. 서로 확인할 수 있도록 말입니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 12. 핵심 메시지 — 계속 물어보겠지만

![장면 12](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-12.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-12.png)

**내레이션**

앞으로도 궁금한 게 생기면 옆자리 동료에게 물어볼 것 같습니다. 다만 문서에 있는 건 먼저 읽고, 함께 정한 건 잘 남겨야겠습니다.

**화면 구성**

- 주 문구: 계속 물어보겠지만
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 대화를 이어가면서 읽기와 기록을 챙기겠다는 개인적 판단이다.
- 표현 방식: 문장 중심
- 표현 이유: 개인적인 관찰과 다짐은 짧은 문구와 여백으로 전달한다. 설명을 위한 도식을 억지로 추가하지 않는다.

**연출 흐름**

1. 주 문구 등장

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 앞으로도 궁금한 게 생기면
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
2. 옆자리 동료에게
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 물어볼 것 같습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼
4. 다만 문서에 있는 건
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
5. 먼저 읽고,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
6. 함께 정한 건
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
7. 잘 남겨야겠습니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 13. 마무리 — 

![장면 13](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-13.png)

[장면 이미지 열기](https://raw.githubusercontent.com/dohyeon-kr/dohyeon.kr/40be9f99c1a82cd22f7511a573cbac3e20e86e00/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi-candidate-01-scene-13.png)

**내레이션**

편하게 물어볼 수 있다는 이유로, 그 사람의 기억에 너무 기대지는 않도록 말입니다.

**화면 구성**

- 주 문구: 
- 배치: 노트 그리드 · 사진은 흰 인화지 여백과 반투명 테이프, 비교는 2단, 도식은 넓은 중앙 영역
- 발표자: 우측 하단 원형 바스트 상시 표시 (본문 전환 유지). 최종 TTS 단어 타임스탬프에 맞춘 입 모양과 발화 구간 노딩. 단어 내부 음절 타이밍은 근사이며 실제 음성 검수 필요. 무음 미리보기에서는 입·노딩 트랙을 만들지 않음.
- 전달할 관계: 처음의 편하게 묻는 상황을 동료 기억에 대한 배려로 회수한다.
- 표현 방식: 사진
- 표현 이유: 실제 저자·동료의 모습이 아닌 맥락용 스톡 사진이다. 노트 위 흰 인화지와 상단 테이프로 합성하고 원본 비율을 보존한다.
- 사진 검색어: person writing notebook desk
- 사진 출처: [책상에서 노트에 기록하는 손](<https://www.pexels.com/photo/person-writing-on-notebook-7260632/>) · 라이선스 pexels

**연출 흐름**

1. 시각 요소 등장

카메라: 고정

장면 전환: 서서히 전환

**자막과 낭독 리듬**

1. 편하게 물어볼 수
   - 강조 중 · 자연스럽게 · 뒤에 0ms 쉼
2. 있다는 이유로,
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
3. 그 사람의 기억에
   - 강조 중 · 자연스럽게 · 뒤에 80ms 쉼
4. 너무 기대지는 않도록 말입니다.
   - 강조 중 · 자연스럽게 · 뒤에 180ms 쉼

## 게시 문구

옆자리 백엔드 동료와 함께 정한 워크플로우 사례입니다. SDK 버전을 선택하고, Bruno로 요청을 공유하고, 연결된 트레이스로 문제를 살펴봅니다. 함께 이야기해서 정한 내용은 기록으로 남깁니다.  원문: https://blog.dohyeon.kr/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/

#프론트엔드 #백엔드 #개발자협업 #개발자에세이

