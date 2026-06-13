# PRD.md

## 제품명
레크레이션 운영/점수 관리 앱

## 한 줄 설명
게임 라이브러리, 행사 레퍼토리, 현장 진행, 관객용 점수판을 하나로 묶은 레크레이션 운영 웹앱.

## 구조 원칙
- 게임리스트와 레퍼토리는 세션과 무관하게 미리 정리할 수 있어야 한다.
- 세션은 실제 행사 진행 단위이며, 팀 이름/점수/기록 입력은 세션 단계에서만 필요하다.
- 따라서 준비 단계에서 팀 이름을 먼저 강제하지 않는다.

## MVP 범위
### 포함
- 게임리스트 CRUD
- 레퍼토리 생성/수정
- 게임 순서 배치
- 예상 총 시간 계산
- 준비물 목록 요약
- 세션 생성
- 세션 없이 게임리스트/레퍼토리 편집
- 진행화면 갤러리
- 승/패/동점/응원점수 입력
- 동일 게임 반복 기록
- 총점 자동 계산
- 관객용 별도 URL 화면
- JSON 기반 온라인 불러오기/저장
- 최근 배점 취소 또는 수동 수정 기능

### 제외
- 로그인/권한 관리
- 여러 운영자의 동시 편집 충돌 해결
- 앱스토어 배포
- AI 자동 게임 추천
- 실시간 멀티유저 협업 고도화

## URL 구조
- `/index.html`
- 홈 요약, 세션 생성/선택, 레퍼토리 생성 진입
- `/control.html`
- 세션 없이도 게임리스트/레퍼토리 편집 가능, 세션 선택 후 진행/기록 사용
- `/display.html`

## 점수 규칙
- 좌팀 승: 좌팀에 배점 전부 반영
- 우팀 승: 우팀에 배점 전부 반영
- 동점: 매 판마다 `양팀 0점` / `양팀 절반 점수` 중 운영자가 선택
- 응원점수: 좌/우 팀 개별 추가 (+10 / +20 / +30)
- 동일 게임 반복 가능, 총점은 누적
- 운영자가 실수로 넣은 최근 배점을 취소할 수 있어야 함
- 저장된 기록의 점수/결과를 수동 수정할 수 있어야 함
- 기본 배점 방식은 `게임 1회당 고정 배점`
- 스피드 퀴즈 / 넌센스 퀴즈 / 몸으로 말해요 같은 퀴즈형 게임은 `문제당 배점` 지원 필요
- 퀴즈형 게임은 문제 수/정답 수 기반으로 점수가 누적될 수 있어야 함

## 데이터 모델
### Game
- id
- name
- category
- description
- howToPlay
- estimatedMinutes
- materialsText
- minPlayers
- recommendedPlayers
- scoreEnabled
- scoringMode
- defaultPoints
- defaultPointsPerQuestion
- difficulty
- energyLevel
- tags[]
- notes

### Repertoire
- id
- title
- description
- audienceType
- createdAt
- updatedAt

### RepertoireItem
- id
- repertoireId
- gameId
- orderIndex
- active
- customPoints
- customEstimatedMinutes
- customNote

### Session
- id
- repertoireId
- title
- date
- leftTeamName
- rightTeamName
- status
- createdAt
- updatedAt

### SessionGameRecord
- id
- sessionId
- repertoireItemId
- roundNumber
- resultType
- questionCount
- correctCountLeft
- correctCountRight
- pointsUsed
- leftPoints
- rightPoints
- note
- playedAt

## 배포 방향
- 정적 웹앱
- Netlify 또는 Vercel
- GitHub JSON 파일 기반 온라인 저장
- 운영자 1명 공식 입력, 관객은 읽기 전용
