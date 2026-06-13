# PROCESS_CARDS.md

## 프로세스 카드 1 — 초기 scaffold
- 프로젝트: 레크레이션 운영/점수 관리 앱
- 목표: 정적 웹앱 기본 구조 생성
- 지정 구현자: Codex
- 코드 경로: `/Volumes/hongsMacSSD/coding/appdev/recreation-scoreboard/`
- 허용 범위: 신규 파일 생성, 기본 HTML/CSS/JS scaffold
- 금지 범위: 외부 유료 서비스 연동, 비밀값 하드코딩
- 검증: 정적 서버로 `index.html`, `control.html`, `display.html` 진입 확인
- 완료 조건: 3개 페이지 골격 확인 가능

## 프로세스 카드 2 — 데이터 구조
- 목표: Game/Repertoire/Session/Record 상태 모델 구현
- 지정 구현자: Claude Code
- 허용 범위: 상태 모델, 샘플 데이터, 타입 정의
- 검증: 고정 배점 게임과 문제당 배점 게임 샘플 데이터 렌더링 확인
- 완료 조건: 게임/레퍼토리/세션 관계와 배점 방식 구분이 명확함

## 프로세스 카드 3 — 진행화면 및 점수 로직
- 목표: 승패/동점/응원점수/반복 진행 처리
- 지정 구현자: Codex
- 검증: 샘플 세션으로 점수 누적 테스트, 최근 배점 취소/수동 수정 테스트, 퀴즈형 게임의 문제당 배점 테스트
- 완료 조건: 총점과 기록이 정확히 누적되고, 오입력 정정과 퀴즈형 배점이 가능함

## 프로세스 카드 4 — 관객용 display
- 목표: 읽기 전용 점수판 구현
- 지정 구현자: OpenCode/MiniMax
- 검증: 큰 글씨, 최근 기록, 조작 요소 없음 확인
- 완료 조건: 단독 열람 가능한 `display.html`

## 프로세스 카드 5 — JSON 온라인 저장/불러오기
- 목표: GitHub JSON 기반 저장 흐름 연결
- 지정 구현자: Claude Code
- 검증: 저장 후 display 화면 반영 확인
- 완료 조건: static 배포 환경에서 온라인 읽기/쓰기 설계 완성

## 프로세스 카드 6 — 데모 배포 및 검증
- 목표: Netlify 또는 Vercel 데모 배포
- 지정 구현자: Codex + 코파 검수
- 검증: control 입력 → display 반영, 최근 기록/총점 확인
- 완료 조건: 실사용 가능한 데모 URL 확보
