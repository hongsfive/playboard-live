# CHANGELOG

Playboard Live 개발 이력 및 현재 기능 정리.

---

## 현재 상태 (2026-06-24 기준)

**배포 URL**: https://playboard-live.netlify.app  
**스택**: 순수 HTML/CSS/JS 정적 앱 + Firebase Realtime DB + Netlify

---

## 구현된 주요 기능

### 핵심 운영 기능
- **게임 라이브러리** — 게임 CRUD, 카테고리/배점방식/난이도/에너지레벨 등 메타데이터
- **레퍼토리** — 게임 순서 묶음, 예상 시간·준비물 자동 계산, 아이템 활성/비활성 토글
- **세션** — 팀명 설정, 레퍼토리 연결, 활성 세션 1개 관리
- **진행 탭** — 현재 게임 카드 상단 고정, 결과 입력 (승/패/동점/퀴즈/대표선수), 보너스 +n 모달
- **기록 탭** — 세션 전체 기록 열람, 최근 배점 취소

### 점수 계산
- `fixed_per_game` 모드: 좌승/우승/동점0/동점절반/보너스좌/보너스우
- `per_question` 모드: 퀴즈형 — 문제당 배점 × 정답 수
- 카테고리/게임명 기반 배점 방식 자동 추론 (`inferScoringMode`)
- 보너스: +10/+20/+30 프리셋 또는 직접 입력 모달

### 음악 플레이어 (운영 화면 ↔ 관객 점수판 동기화)
- **서버 트랙**: `/audio/manifest.json` 기반 곡 목록, 18곡 내장
- **로컬 업로드**: 기기에서 MP3 파일 직접 추가 (ObjectURL, 해당 기기에서만 재생)
- **재생 제어**: 재생/정지, 이전/다음, 반복 없음/한 곡 반복/전체 반복
- **멘트 모드**: 🎙 버튼으로 볼륨을 설정값(5~50%)으로 페이드 다운 → 마이크 멘트 후 복귀
  - 멘트 볼륨 슬라이더: 음악 탭에서 조절, localStorage 저장
  - 음악 정지 상태에서는 멘트 버튼 무반응 (실수 재생 방지)
- **현재 재생 표시**: 연두색 바에 곡명 + 남은 재생시간 표시
- **크로스 디바이스 동기화**: `rec_music_state` localStorage → Firebase 즉시 push → display.html polling

### Firebase 연동
- **Realtime Database**: localStorage를 Firebase에 즉시(`_fbPushNow`) 또는 디바운스(`_fbSchedulePush`) 동기화
- **익명 인증**: UID 기반 데이터 격리 (다른 운영자 데이터 분리)
- **관객 화면 접속**: `display.html?uid=<uid>` 또는 6자리 룸코드 `display.html?code=<code>`
- **세션 삭제 tombstone**: 삭제된 세션 ID를 tombstone으로 기록 → Firebase sync 후 재생성 방지

### UI / 모바일 최적화
- **운영/편집 모드 분리**: 헤더에 ▶운영 / ✎편집 버튼, 운영 모드는 진행·기록·음악 탭만 노출
- **하단 점수 표시바** (`progressBottomBar`): 현재 세션명 + 팀별 총점 + 🎙/⏹ 퀵버튼
  - 모바일: 세션명(1줄) + 점수·버튼(2줄) 2행 레이아웃
  - 🎙 활성 시 인디고 배경 + 색상으로 상태 표시
- **타이머 바** (`timerBar`): 최하단 고정, 남은 시간 표시, 10초 미만 긴급 깜빡임
- **sticky 레이아웃**: 헤더(48px) → 탭 메뉴 순서로 모바일 정확히 밀착 (빈 줄 없음)
- **홈 화면**: 다크 히어로 + 도트 그리드, 활성 세션 초록 뱃지, 카드 hover 글로우

### 관객 점수판 (display.html)
- 팀명/점수/현재 게임/진행률/최근 기록 폴링(2초) 렌더링
- 타이머 표시 (500ms 폴링)
- 음악 동기화: audio unlock 버튼 → 운영 화면과 동일 트랙 재생/페이드/멘트 볼륨 적용
- 룸코드로 접속 시 UID 자동 해석

---

## 파일 구조

```
index.html        홈 — 운영/관객 진입점, 활성 세션 상태 표시
control.html      운영 화면 — 5탭 (게임리스트·레퍼토리·세션·진행·기록) + 음악 탭
display.html      관객 점수판 — 읽기 전용
assets/app.js     공유 데이터 레이어 (App.Game/Repertoire/Session/Record + Firebase)
assets/style.css  전체 스타일
audio/            서버 트랙 MP3 (track_001~track_018)
audio/manifest.json  트랙 메타데이터 (순서·제목·아티스트)
docs/             PRD, PROCESS_CARDS, VERIFY, CHANGELOG
```

---

## 주요 기술 결정 및 제약

| 항목 | 결정 | 이유 |
|------|------|------|
| 빌드 도구 없음 | 순수 HTML/JS | 배포 단순화, 현장 편의 |
| localStorage + Firebase | 오프라인 우선 + 크로스 디바이스 | 네트워크 불안정 대비 |
| `_fbPushNow` (즉시 push) | 음악 명령에만 적용 | 600ms 디바운스 시 display 페이드 지연 문제 |
| tombstone 방식 세션 삭제 | Firebase sync 후 재생성 방지 | 세션 불사조 버그 근본 해결 |
| 로컬 음악 = ObjectURL | 서버 업로드 없이 바로 재생 | 해당 기기에서만 재생됨 (크로스 디바이스 미지원) |
| 관객 화면 polling 2초 | WebSocket 대신 단순 폴링 | 정적 호스팅 환경 제약 |

---

## 알려진 제약

- **로컬 업로드 곡**은 업로드한 기기에서만 재생됨 (다른 기기에서는 manifest에 있는 서버 트랙만 재생)
- **동시 편집 충돌** 미지원 — 운영자 1명 기준 설계
- **PWA 오프라인** 미지원 — Firebase 연결 필요
