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

### In Progress
- Phase 4: 디자인 시스템 + UI polish (globals.css 토큰, 컴포넌트 정리, 반응형)

### Broken
- 일반 `pnpm` 명령은 현재 `minimumReleaseAge` 정책이 기존 NestJS 최신 lockfile 엔트리를 막을 수 있음
- 검증 시 임시로 `pnpm --config.minimumReleaseAge=0 ...` 사용

- Phase 3A T5: `AgentRunnerService` 구현 + `agent-runner.spec.ts` 추가 (17 passed)
- Phase 3B: Web UI 연동 완료 (web build 성공, 10 passed)
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
