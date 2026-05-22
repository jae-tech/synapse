# Decisions

## 2026-05-22 — Phase 3 아키텍처 결정 (D1~D11)

| # | 결정 | 이유 |
|---|------|------|
| D1 | 제품 방향: 모니터링 → 사령부 전환 | 웹에서 명령 → 에이전트 작업 → 시각화 흐름 원함 |
| D2 | AI 실행: NestJS adapter 패턴 (CLI subprocess) | claude, codex 등 플러그인 방식 확장 가능 |
| D3 | 에이전트 역할 분담: AI PM 자동 분담 | 사용자는 이슈만 입력, 나머지 자동화 |
| D4 | 과금 방식: 구독형 전용 (API 키 없음) | claude CLI (Claude Max), codex CLI (Codex Pro) |
| D5 | subprocess timeout: setTimeout + child.kill() | spawn() timeout 옵션은 Node.js에서 동작 안 함 |
| D6 | 우측 패널: node-pty + xterm.js | PTY로 실제 터미널 스트리밍 |
| D7 | SIGTERM → 2초 후 SIGKILL fallback | SIGTERM 무시 가능성 대비 |
| D8 | 에이전트 시작 신호: spawn 직후 emit | VirtualOffice 캐릭터 즉시 활성화 |
| D9 | PM 실패 fallback: task='failed' + error 이벤트 | PM SPOF graceful degradation |
| D10 | IssueInput 에러 피드백: setError + 메시지 표시 | fetch 실패 시 사용자에게 명시적 피드백 |
| D11 | fire-and-forget: void dispatch() | 202 즉시 반환, PM 실행은 백그라운드 |

## 2026-05-22 — 문서 구조 결정

- **AGENTS.md**: Claude Code + Codex CLI 공용 프로젝트 규칙 (단일 소스)
- **CLAUDE.md**: Claude Code 전용 Skill routing만 포함, 나머지는 AGENTS.md 참조
- **.ai/**: 구현 진행 상태 추적 (save-state, next-task, decisions)
