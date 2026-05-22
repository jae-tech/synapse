# Next Task

### Goal
- Phase 3C — TasksModule + OrchestratorService 구현
  - T11: `POST /tasks` 엔드포인트 (TasksController + TasksModule)
  - T12: OrchestratorService — PM 에이전트 호출 + JSON 파싱 + 서브태스크 병렬 파견

### Requirements
- `apps/api/src/tasks/tasks.controller.ts` — POST /tasks (Zod 검증 → DB insert → void orchestrator.dispatch() → 202)
- `apps/api/src/tasks/tasks.module.ts` — TasksController + OrchestratorService + AgentsModule import
- `apps/api/src/orchestrator/orchestrator.service.ts`
  - `dispatch(task)` — PM 에이전트(ClaudeAdapter)를 `-p "PM: 다음 이슈를 서브태스크 JSON으로 분해해줘: ..."` 형태로 실행
  - PM 출력 JSON 파싱 실패 → task.status='failed' + type:'agent:error' 이벤트 emit (D9)
  - 파싱 성공 → 서브태스크 목록을 `Promise.allSettled`로 병렬 AgentRunnerService 실행
  - 각 서브태스크는 role에 맞는 agentId 사용 (예: 'backend', 'frontend')
- `AppModule`에 `TasksModule` import
- DB insert: `apps/api/src/db/schema.ts`의 `tasks` 테이블 사용

### Files To Inspect
- `apps/api/src/db/schema.ts` — tasks 테이블 컬럼 확인
- `apps/api/src/agents/agents.module.ts` — AgentRunnerService export 확인
- `apps/api/src/agents/agent-runner.service.ts` — run() 시그니처
- `apps/api/test/events.spec.ts` — HTTP 테스트 스타일 참고
- `AGENTS.md` §Task 흐름 — 설계 의도 재확인

### Warnings
- OrchestratorService는 PM JSON 파싱 SPOF → 반드시 try/catch + graceful fallback
- PM 프롬프트 응답 형식은 아직 미정 — 우선 `[{"role":"backend","prompt":"..."}]` 형태로 가정
- `pnpm` 명령에 `--config.minimumReleaseAge=0` 필요
- fire-and-forget: TasksController는 202 즉시 반환, orchestrator는 백그라운드 실행
