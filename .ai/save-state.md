# Save State

### Completed
- Phase 10D: 로컬 E2E 통합 스모크 테스트 스크립트 추가
  - `scripts/smoke-test.mjs`: API 헬스/POST /tasks/GET /tasks/:id/Socket.IO 연결/replay/agent 이벤트 시퀀스 검증
  - `scripts/e2e-local.sh`: Docker Compose 기동 래퍼 + API 헬스 대기 + smoke-test 실행
  - `package.json`에 `smoke`, `smoke:skip-agent`, `e2e:local` 스크립트 추가
  - `AGENTS.md`에 "로컬 E2E 통합 테스트" 섹션 추가 (전제조건/실행법/검증항목/예상결과)
  - claude CLI 미설치 시 `--skip-agent` 자동 전환, API/Socket.IO만 검증 가능
  - 실제 실행 결과: 4개 통과 (API 실행 중 환경 기준)
- Phase 10A: `orchestrator.spec.ts` 신규 — OrchestratorService PM→서브태스크 파견 E2E 13케이스
  - PM run 정상 흐름 (서브태스크 수/agentId/prompt/workspaceId 검증)
  - ANSI escape 코드 포함 출력 파싱
  - 앞뒤 텍스트 혼재 시 JSON 배열 추출
  - PM 실패 경로 4케이스 (throw/JSON 없음/빈 배열/파싱 오류)
  - 서브태스크 부분 실패/전부 실패 시 dispatch가 resolve되는 것 검증
- API 테스트 55개 전원 통과 (기존 42 + 신규 13)
- 후보 B 1차 구현 완료: Redis pub/sub Socket.IO adapter 도입 (`WS_REDIS_ENABLED` 기반 조건부 활성화)
- `RedisIoAdapter` 추가 및 Nest bootstrap에서 Redis 연결/종료 훅 처리
- `docker-compose.yml`에 `redis` 서비스 추가, API에서 Redis adapter 기본 활성화 구성
- API 회귀 테스트 통과 (`pnpm --filter @synapse/api test` 34 passed)
- Phase 9A E2E 확장 완료: 제출 성공/제출 실패/소켓 연결 실패 배너/에이전트 로그-터미널 탭 토글 케이스 추가
- Playwright E2E 안정화: 기존 실행 중 dev 서버 재사용 환경에서도 동작하도록 케이스 보정
- `useAgentSocket`에 `?e2e_socket_error=1` 강제 에러 분기 추가 (E2E 전용)
- PixelOffice 디자인 2차 보강: 시계, 천장 조명, 정수기, 책장, 식물, 하단 오피스맵/브리핑/이벤트 보드 디테일 추가
- PixelOffice 씬을 레퍼런스 구도 기반으로 전면 교체 (HQ 간판, 회의실, 라운지, 5개 작업실, 하단 패널)
- 에이전트 상태 애니메이션은 유지하면서 새 레이아웃 좌표로 재매핑
- Web 메인 페이지 디자인 1차 리뉴얼 (레퍼런스 이미지 톤 반영)
- `globals.css` 전면 교체: 네이비 그라데이션 배경, 글래스 패널, 좌/중/우 3패널 시각 스타일 강화
- 에이전트 카드/입력 폼/로그 타임라인 스타일을 레퍼런스 레이아웃에 맞게 재정렬
- Phase 9A 시작: Playwright E2E 스모크 테스트 도입 (`@synapse/web`)
- `apps/web/playwright.config.ts` 추가 (`localhost` baseURL + Next dev webServer)
- `apps/web/e2e/issue-input.spec.ts` 추가 (POST `/tasks` route mock 기반 제출 성공 검증)
- `apps/web` 스크립트에 `test:e2e` 추가, Chromium 설치 후 E2E 1건 통과 확인
- Phase 3C: TasksModule (POST /tasks) + OrchestratorService (PM → 서브태스크 병렬 실행)
- Phase 1: 기본 이벤트 수신/저장/broadcast (POST /events)
- Phase 2: PostgreSQL persistence + Drizzle ORM 마이그레이션 + WebSocket replay
- AGENTS.md 생성 (Claude + Codex 공용 규칙 통합)
- CLAUDE.md 간소화 (AGENTS.md 참조 방식으로 변경)
- .ai/ 상태 관리 디렉터리 초기화
- Phase 3 T1: `TaskSchema`, `CreateTaskSchema` 추가 및 schemas 테스트 보강
- Phase 3 T3 일부: `node-pty`, `@xterm/xterm`, `@xterm/addon-fit` 의존성 설치
- Windows `node-pty` prebuild 확인 및 conpty 파일 배치 완료
- schemas 빌드/테스트 검증 완료
- Phase 3 T2: DB `tasks` 테이블 schema + migration 추가
- `pnpm --config.minimumReleaseAge=0 --filter @synapse/api migration:run` 성공
- API build/test, Web test 검증 완료
- Phase 3 T4: `AgentAdapter` 인터페이스 + `ClaudeAdapter(node-pty)` 구현
- `claude-adapter.spec.ts` 추가 및 API 테스트 통과 (12 passed)

### Phase 8 완료 항목
- `.github/workflows/ci.yml` — Node.js 22 + pnpm 11 캐시, frozen-lockfile 설치, schemas 빌드, test, format:check
- node-pty 네이티브 빌드 deps (python3/make/g++) Ubuntu runner 사전 설치
- `README.md` — CI 배지 추가 (GitHub Actions 링크)

### Phase 9B 완료 항목
- `redis-io-adapter.spec.ts` 신규: RedisIoAdapter 유닛 8케이스 (connect/close/createIOServer/fallback 분기)
- `WS_REDIS_ENABLED` 환경변수 분기 테스트 추가 (활성/비활성 두 케이스)
- API 테스트 42개 전원 통과 (34 기존 + 8 신규)
- `main.ts` HOST 환경변수화 (127.0.0.1 하드코딩 → Docker 환경에서 0.0.0.0 주입 가능)
- `docker-compose.yml` api 서비스에 `HOST=0.0.0.0` 추가
- README.md: WS_REDIS_ENABLED/WS_REDIS_URL/HOST 환경변수 표 추가, Redis 서비스 URL 표시
- AGENTS.md: Redis WebSocket 어댑터 아키텍처 섹션 추가, 환경변수 표 보강, 알려진 이슈 추가

### Phase 10C 완료 항목
- `events.gateway.ts`: `handleConnection`에서 `socket.join(workspaceId)` 추가, `broadcast()`를 `server.to(workspaceId).emit()`으로 변경, `broadcastPty(workspaceId, agentId, data)` 메서드 추가
- `agents.controller.ts`: `onPtyData` 콜백을 `gateway.broadcastPty(workspaceId, agentId, chunk)` 호출로 변경
- `useAgentSocket.ts`: `workspaceId` 파라미터 추가, `query: { workspaceId }` 소켓 핸드셰이크 전달, deps `[workspaceId]`로 변경 시 재연결
- `VirtualOffice.tsx`: `useWorkspaceId()` hook 추가 (URL hash `#ws:name` 패턴), `wsInput` state, 헤더 워크스페이스 스위처 폼 UI
- `IssueInput.tsx`: `workspaceId` prop 추가, POST /tasks body에 포함
- `globals.css`: `.vo-ws-form`, `.vo-ws-label`, `.vo-ws-current`, `.vo-ws-input` 스타일 추가
- `agents-run.spec.ts`: `mockGateway`에 `broadcastPty` mock + `server.to().emit()` 체인 추가
- API 테스트 55개 전원 통과 유지

### In Progress
- (없음)

### Phase 7 완료 항목
- `README.md` 전면 재작성 — 빠른 시작, Docker Compose, API 엔드포인트 표, 환경변수 표, 기술 스택
- `AGENTS.md` 업데이트 — Phase 5~6 신규 엔드포인트, CLAUDE_BIN, PTY 버퍼, Docker 주의사항, 에이전트 상태 추적

### Phase 5+6 완료 항목
- `CLAUDE_BIN` 환경변수화 (`ClaudeAdapter`)
- `AgentsController` — `safeParse` 패턴 (Zod 에러 → 400), `GET /agents/status` 추가
- `AgentRunnerService` — `running` Map 추적, `getRunningAgents()` 공개 메서드
- `TasksService.findById()` + `TasksController GET /tasks/:id` (200/404/400)
- `test/agents-run.spec.ts` — `POST /agents/run` 7케이스 + `GET /agents/status` 2케이스
- `test/tasks.spec.ts` — `GET /tasks/:id` 3케이스 추가 (34 tests all passed)
- `apps/api/Dockerfile` — node-pty 빌드 의존성 포함 멀티스테이지 빌드
- `apps/web/Dockerfile` — Next.js standalone 멀티스테이지 빌드
- `apps/web/next.config.mjs` — `NEXT_OUTPUT=standalone` 환경변수 기반 조건부 출력
- `docker-compose.yml` — `api` + `web` 서비스 추가 (db healthcheck 의존성)

### Broken
- 일반 `pnpm` 명령은 현재 `minimumReleaseAge` 정책이 기존 NestJS 최신 lockfile 엔트리를 막을 수 있음
- 검증 시 임시로 `pnpm --config.minimumReleaseAge=0 ...` 사용

- Phase 3A T5: `AgentRunnerService` 구현 + `agent-runner.spec.ts` 추가 (17 passed)
- Phase 3B: Web UI 연동 완료 (web build 성공, 10 passed)
- Phase 4: 디자인 시스템 + UI polish 완료
  - `globals.css` CSS 변수 토큰 시스템 (색상, 타이포, 간격, 반응형)
  - `VirtualOffice.tsx` 인라인 style → className 전환 (BEM 패턴)
  - `IssueInput.tsx` 포커스 상태, 에러 시각화, 모바일 터치 타겟(44px)
  - 반응형: 768px/480px 미디어쿼리 (모바일 2열 그리드, 사이드패널 하단 배치)
- Phase 3A T6: `AgentsModule` + `AgentsController(POST /agents/run)` + `AppModule` 통합
- `@synapse/schemas` payload 타입 확장 (`z.record`) + agent 이벤트 타입 3종 추가
- `EventsModule` exports 추가 (`EventsService`, `EventsGateway`)
- `zod` 직접 의존성 `@synapse/api`에 추가

### Modified Files
- `apps/api/src/events/redis-io.adapter.ts`
- `apps/api/src/main.ts`
- `apps/api/package.json`
- `apps/api/.env.example`
- `.env.example`
- `docker-compose.yml`
- `pnpm-lock.yaml`
- `apps/web/e2e/issue-input.spec.ts`
- `apps/web/lib/useAgentSocket.ts`
- `apps/web/playwright.config.ts`
- `apps/web/components/PixelOffice.tsx`
- `apps/web/app/globals.css`
- `apps/web/package.json`
- `apps/web/playwright.config.ts`
- `apps/web/e2e/issue-input.spec.ts`
- `pnpm-lock.yaml`
- `packages/schemas/src/index.ts`
- `packages/schemas/src/index.test.ts`
- `packages/schemas/package.json`
- `packages/schemas/tsconfig.json`
- `apps/api/src/db/schema.ts`
- `apps/api/drizzle/0001_create_tasks.sql`
- `apps/api/drizzle/meta/0001_snapshot.json`
- `apps/api/drizzle/meta/_journal.json`
- `apps/api/src/agents/adapters/agent-adapter.interface.ts`
- `apps/api/src/agents/adapters/claude.adapter.ts`
- `apps/api/src/agents/agent-runner.service.ts`
- `apps/api/src/agents/agents.module.ts`
- `apps/api/src/agents/agents.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/events/events.module.ts`
- `apps/api/package.json`
- `packages/schemas/src/index.ts`
- `apps/api/test/claude-adapter.spec.ts`
- `apps/api/test/agent-runner.spec.ts`
- `apps/web/components/IssueInput.tsx`
- `apps/web/components/AgentTerminal.tsx`
- `apps/web/components/VirtualOffice.tsx`
- `apps/web/store/useAgentStore.ts`
- `apps/web/lib/useAgentSocket.ts`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/vitest.config.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `pnpm.toml`
- `.ai/save-state.md`
- `.ai/next-task.md`
- `.ai/decisions.md`
- `apps/api/src/agents/adapters/claude.adapter.ts` (CLAUDE_BIN 환경변수화)
- `apps/api/src/agents/agents.controller.ts` (safeParse → 400)
- `apps/api/test/agents-run.spec.ts` (신규)
- `apps/api/.env.example`
- `.env.example`
- `apps/web/components/PixelOffice.tsx` (신규, VirtualOffice에서 동적 import)
