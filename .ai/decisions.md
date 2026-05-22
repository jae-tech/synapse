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

## 2026-05-22 — pnpm 11 build script 승인 처리

- pnpm 11은 root `package.json`의 `pnpm.onlyBuiltDependencies`를 읽지 않고 경고를 출력함
- `pnpm approve-builds @nestjs/core @swc/core esbuild sharp node-pty` 실행으로 `pnpm-workspace.yaml`의 `allowBuilds`에 실제 승인 목록 기록
- `pnpm.toml`의 `onlyBuiltDependencies`에도 `node-pty` 추가
- 현재 lockfile의 최신 NestJS 엔트리는 `minimumReleaseAge` 정책에 걸리므로 검증 명령은 `--config.minimumReleaseAge=0`을 명시해서 실행

## 2026-05-22 — Drizzle migration 정합성 보정

- 기존 `0000_create_events.sql`은 수동 index를 만들었지만 기존 Drizzle snapshot에는 index 정보가 없었음
- `apps/api/src/db/schema.ts`에 events index 정의를 추가해 이후 snapshot이 실제 DB 상태를 반영하도록 보정
- 생성 migration은 불필요한 events index drop/recreate와 payload default alter를 제거하고 `tasks` 테이블 생성만 남김

## 2026-05-22 — API build declaration emit 비활성화

- Nest API는 배포용 library가 아니므로 d.ts 산출물이 필요하지 않음
- TypeScript 6 + pnpm symlink + Drizzle builder inferred type 조합에서 TS2883 declaration-portability 진단이 발생
- `apps/api/tsconfig.json`의 `declaration`/`declarationMap`을 false로 전환하고 API build 성공 확인

## 2026-05-22 — ClaudeAdapter 구현 결정

- `apps/api/src/agents/adapters/claude.adapter.ts`는 `node-pty.spawn('claude', ['--dangerously-skip-permissions', '-p', prompt])` 형태로 실행
- PTY 청크는 `onPtyData` 콜백으로 즉시 전달해 후속 Socket streaming 경로에서 재사용 가능하게 구성
- timeout은 `setTimeout` 기반으로 `SIGTERM` 후 2초 뒤 `kill()` fallback 적용 (Node spawn timeout 미신뢰)
- 가용성 체크는 `claude --version`의 exit code(0/비0) 기준으로 판정

## 2026-05-22 — Phase 9A Playwright E2E 도입 결정

- 최초 E2E는 백엔드 종속도를 줄이기 위해 `POST /tasks`를 Playwright `page.route`로 mock 처리
- Next.js 16 dev 서버의 `allowedDevOrigins` 제한을 피하기 위해 Playwright `baseURL/webServer.url`을 `127.0.0.1`이 아닌 `localhost`로 고정
- 실행 진입점은 `@synapse/web` 스코프의 `test:e2e` 스크립트로 분리해 기존 Vitest 흐름과 독립 운영

## 2026-05-22 — Web 디자인 1차 리뉴얼 결정

- 페이지 구조는 유지하고 `apps/web/app/globals.css`를 전면 재정의해 레퍼런스 스타일(네이비 HQ 톤, 글래스 패널, 좌/중/우 하이콘트라스트)로 일괄 전환
- 중앙 PixelOffice는 기존 로직을 유지해 실시간 상태 표현 안정성을 보존하고, 레이아웃/패널 시각 톤을 우선 맞추는 단계적 접근 채택

## 2026-05-22 — PixelOffice 씬 전면 재구성 결정

- `apps/web/components/PixelOffice.tsx`를 레퍼런스 구도에 맞춰 새로 작성 (상단 HQ/회의실/라운지 + 하단 5개 작업실 + PM 영역)
- 기존 `agents` 상태 입력 인터페이스는 유지해 백엔드 이벤트 연동 영향 없이 UI 씬만 교체

## 2026-05-22 — PixelOffice 2차 디테일 보강 결정

- 레퍼런스 시각 요소를 반영해 시계/천장 조명/정수기/책장/화분/하단 정보 보드를 추가
- 씬 전체 재작성 대신 기존 1차 레이아웃에 소품과 보조 패널을 누적해 단계적으로 완성도를 끌어올리는 방식 채택

## 2026-05-22 — Phase 9A E2E 확장 안정화 결정

- `apps/web/e2e/issue-input.spec.ts`에 제출 실패/연결 실패/터미널 토글 시나리오를 추가해 핵심 사용자 플로우를 E2E로 고정
- 연결 실패 배너는 브라우저 네트워크 변동성 대신 `?e2e_socket_error=1` 강제 분기로 재현해 flaky 테스트를 제거

## 2026-05-22 — Redis pub/sub Socket.IO adapter 도입 결정

- `apps/api/src/events/redis-io.adapter.ts`를 추가해 Socket.IO adapter를 Redis(pub/sub)로 교체 가능한 구조로 확장
- `WS_REDIS_ENABLED=1`일 때만 Redis adapter를 활성화하고, 기본은 in-memory adapter로 유지해 로컬 개발 호환성 보장
- 앱 종료 시 Redis client `quit()`를 호출하도록 bootstrap 종료 훅을 연결해 연결 누수 방지
