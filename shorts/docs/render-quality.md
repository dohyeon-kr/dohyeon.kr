# 렌더 9·10번 품질 개선

대상: 프론트엔드 경계 candidate-03, 경계 없는 기여 candidate-02.

## 확인한 원인

- 두 MP4의 MEDIA 파일에는 사진 출처가 없었다. JSON의 사진 장면은 image=null이었고, 렌더러가 사선 배경으로 대체했다.
- semantic beat의 쉼 구간에서 별도 legacy caption으로 돌아가 문구와 크기가 순간적으로 바뀌었다. 강조 여부와 글자 수에 따라 크기·테두리·패딩·scale도 바뀌었다.
- 제목이 아래에서 위로 자라 도식과 겹쳤다. 연결선은 세로 길이를 무시했고 긴 라벨은 노드 밖으로 나왔다.
- BGM 메타데이터는 두 영상 모두 pulse-96 믹싱을 기록했다. 기존 음악은 48~73Hz 저음 위주이고 내레이션 구간 gain=0.08이라 휴대폰에서 약하게 들릴 수 있었다. 효과음은 없었다.

## 변경

도식, 제목·보조 문구, 자막을 별도 세로 영역에 배치한다. 제목은 영역 폭·높이에 맞춰 줄바꿈하고, 자막은 38px 고정 크기로 표시하며 쉼에는 직전 의미 단위를 유지한다. 강조 단어는 반전 색상으로 표현한다.

두 도식 엔진에서 세로선과 노드 라벨 줄바꿈을 동일하게 처리한다. 두 후보의 끊어진 연결선, 긴 라벨, 경계선을 함께 수정한다.

세 사진 장면에 다음 출처를 명시한다. 사진은 맥락을 보여주는 자료이며 글쓴이의 실제 경험 사진이 아니다.

- [코딩하는 손 — Lukas Blazek](https://www.pexels.com/photo/person-encoding-in-laptop-574071/)
- [빈 회의실 — Aheed Baithul Nafia](https://www.pexels.com/photo/conference-table-and-chairs-in-an-empty-office-17739892/)
- [협업 장면 — fauxels](https://www.pexels.com/photo/people-working-in-front-of-the-computer-3184357/)

[Pexels License](https://www.pexels.com/license/) 확인: 2026-09-05. 사진은 렌더 시 내려받으며 원본 이미지 파일을 저장소에 재배포하지 않는다. 사진 확보 실패 시 TTS 전에 중단한다. 이후 후보 생성에서도 Openverse 결과가 없을 때 문맥이 일치하는 검토된 사진을 사용한다.

BGM에 중·고음 배음과 엇박 리듬을 추가하고 gain을 내레이션 중 0.16 / 비음성 구간 0.40으로 조정한다. 장면 전환과 도식 등장에 짧은 합성 효과음을 넣고 BGM 문서에 각 효과음 시각을 기록한다. `SHORTS_SFX=none`으로 효과음만 끌 수 있고, `SHORTS_BGM_TRACK=none`과 함께 지정하면 완전 무음이다.

CI candidate-review는 두 후보의 모든 장면 PNG와 음성 없는 540×960 동영상(BGM·효과음 포함)을 만든다. 실제 TTS가 포함된 최종본은 수정된 스토리보드를 확인한 뒤 기존 승인 렌더 워크플로우로 만든다.
