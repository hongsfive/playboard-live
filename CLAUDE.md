# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**Playboard Live** — 레크레이션 행사 현장 운영/점수 관리 웹앱. 빌드 도구나 패키지 매니저 없이 순수 HTML/CSS/JS로 구성된 정적 웹앱이다.

## 실행

빌드 단계 없음. 정적 파일을 로컬 서버로 서빙하면 된다.

```bash
# 아무 정적 서버로 실행 (Python 예시)
python3 -m http.server 8080

# 또는 npx serve
npx serve .
```

브라우저에서 `http://localhost:8080` 접속. `index.html` → `control.html` → `display.html` 순으로 진입 확인.

## 파일 구조

```
index.html      # 홈: 운영/관객 화면 진입점
control.html    # 운영 화면: 게임리스트·레퍼토리·세션·진행·기록 5탭 구성
display.html    # 관객용 읽기 전용 점수판 (별도 화면으로 띄움)
assets/app.js   # 공유 데이터 레이어 (localStorage CRUD + 도메인 로직)
assets/style.css
docs/PRD.md
docs/PROCESS_CARDS.md
docs/VERIFY.md
```

## 아키텍처

### 데이터 레이어 (`assets/app.js`)

`window.App`으로 export되는 단일 공유 모듈. 모든 페이지가 `<script src="assets/app.js">` 로 로드한다.

**저장소**: localStorage 기반. `STORAGE_KEYS` 상수로 키 관리.

**도메인 객체** (각각 CRUD 메서드 포함):
- `App.Game` — 게임 라이브러리
- `App.Repertoire` / `App.RepertoireItem` — 레퍼토리 (게임 순서 묶음)
- `App.Session` — 실제 행사 진행 단위 (팀명, 연결된 레퍼토리, 상태)
- `App.Record` — `SessionGameRecord`: 게임 1회 진행 결과

**점수 계산**:
- `App.calculatePoints(resultType, pointsUsed)` — 고정 배점 게임 (left_win / right_win / draw_zero / draw_half / bonus_left / bonus_right)
- `App.calculateQuizPoints(pointsPerQuestion, correctCountLeft, correctCountRight)` — 퀴즈형 문제당 배점
- `App.inferScoringMode(data)` — 카테고리/이름 기반 배점 방식 자동 추론 (`per_question` vs `fixed_per_game`)

**세션 흐름**:
- `App.Session.setActive(id)` / `getActive()` 로 활성 세션 1개 관리
- `completedItemIds[]`로 완료된 레퍼토리 아이템 추적
- `Session.getScores(sessionId)` — 전체 Record 합산

### 페이지 간 통신

별도 서버/API 없음. 모든 페이지가 동일 localStorage를 읽고 `display.html`은 주기적 polling으로 갱신한다.

### control.html 탭 구조

5개 탭 (`data-tab` 속성): `games` → `repertoire` → `sessions` → `progress` → `records`

탭 전환은 JS로 `.active` 클래스 토글. 각 탭은 `renderXxx()` 함수로 렌더링.

## 도메인 규칙

- 게임리스트·레퍼토리는 세션 없이도 편집 가능 (세션이 없어도 control.html 사용 가능)
- 세션은 레퍼토리를 참조하며, 팀 이름·점수 입력은 세션 단계에서만 필요
- 동일 게임 반복 가능, 총점은 누적
- `Record.deleteLatest()` / `deleteLatestByItem()` 로 최근 배점 취소 지원
- 동점 처리: `draw_zero`(0점) 또는 `draw_half`(절반) 중 운영자가 선택
- 응원점수: `bonus_left` / `bonus_right` resultType으로 개별 추가 (+10/+20/+30)

## 샘플 데이터

`App.seedSampleData()` — DOMContentLoaded 시 자동 실행. 게임이 이미 있으면 skip.
localStorage를 초기화하면 샘플 12개 게임과 레퍼토리 1개가 재생성된다.

## 배포

정적 파일 그대로 Netlify 또는 Vercel에 배포. 별도 빌드 설정 불필요.
