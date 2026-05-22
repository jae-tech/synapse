# Save State

### Completed
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
