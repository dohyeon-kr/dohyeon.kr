# 제작·검증 기록

- 원문: https://blog.dohyeon.kr/peuronteuendeuwa-baegendeu-gaebalja-hyeobeobhagi/
- 템플릿: `notebook-grid` (가벼운 에세이)
- 작성: Codex에서 저장소의 생성·검토 지침을 읽고 직접 작성. 유료 생성 API와 모델 3단계 워크플로는 실행하지 않음.
- 범위: 옆자리 대화 → Bruno 인증·요청 공유 → 대화 뒤 기록 → 개인적 다짐. SDK 버전 관리·트레이싱·Electron 제작은 별도 논점으로 제외.
- 결과: 본문 9장 + `withBlogCta`로 추가한 공통 CTA 1장. JSON이 원본이며 `candidate-01.md`와 `README.md`는 저장소 스크립트로 생성.

## 확인한 항목

- 원문 근거 인용 9개의 원문 포함 여부, 도입·발전·전환·결론 순서.
- 확정 대본과 장면 내레이션 일치, 모든 자막 beats와 내레이션 일치.
- `CandidateSchema`, 템플릿 선택, 장면 모션·발표자 계약, 공통 CTA 단일 삽입.
- 렌더러의 `fitCopy`로 제목·비교 문구의 최소 크기, 자막 최대 두 줄의 보수적 텍스트 배치 확인. 실제 렌더 검증은 아님.
- 개인의 경험을 보편적 성과로 단정하지 않음. Bruno 무료 사용 횟수·SDK 운영 효과처럼 선택 범위 밖의 주장은 포함하지 않음.

## 사진

사진 4장은 글쓴이나 실제 동료·사무실의 사진이 아닌 맥락용 스톡 이미지다. 사진 위 글자·인화지·테이프는 이미지에 굽지 않고 템플릿이 별도 합성한다. 기존 `shorts/content`의 동일 Pexels ID 재사용은 없었다.

| 장면 | 원출처 | 제작자 |
| --- | --- | --- |
| 1 | https://www.pexels.com/photo/coworkers-looking-at-a-laptop-in-an-office-8127690/ | Ivan S |
| 3 | https://www.pexels.com/photo/man-and-woman-working-using-laptop-8518616/ | Artem Podrez |
| 5 | https://www.pexels.com/photo/focused-colleagues-working-on-laptops-in-office-5324853/ | Anna Shvets |
| 9 | https://www.pexels.com/photo/person-writing-on-notebook-7260632/ | Los Muertos Crew |

2026-09-09에 원출처의 사진 설명·제작자·다운로드 링크와 https://www.pexels.com/license/ 사용 조건을 확인했다. 이미지 URL·출처·라이선스를 JSON에 기록했다. Openverse 검색 및 로컬 Pexels 이미지 다운로드가 HTTP 403으로 제한되어 실제 파일 확보·디코딩·육안 확인은 완료하지 못했다. 사진을 아이콘으로 대체하지 않았다.

## 남은 검수

- 사진 파일 다운로드와 실제 표시 확인.
- 노트 종이·인화지·테이프 합성, 사진 비율, 한글 받침·겹침 및 중간 프레임.
- 실제 TTS 길이, 자막 노출 시간, 음성·BGM·효과음.

이번 요청 범위는 스크립트 JSON 생성이다. 스토리보드 이미지, 미리보기 영상, TTS 및 최종 렌더는 실행하지 않았다. 상태는 `candidate`이며 영상 승인을 뜻하지 않는다.
