# Next Task

### Goal
- Phase 3A T5 구현 — AgentRunnerService(node-pty 생명주기 + spawn 즉시 emit)

### Requirements
- `apps/api/src/agents/agent-runner.service.ts` 신규 구현
- 에이전트 실행 직전에 `agent:start` 이벤트 ingest (D8)
- adapter `run()`의 `onPtyData`를 `pty:data` Socket emit으로 중계
- timeout/exit 동작은 adapter 결과를 그대로 반영
- 이후 orchestrator에서 adapter 선택 주입이 가능하도록 의존성 구조 단순 유지

### Files To Inspect
- `PLAN.md` — AgentRunnerService 설계 섹션
- `apps/api/src/events/events.gateway.ts` — emit/broadcast 패턴 참고
- `apps/api/src/events/events.service.ts` — DI/service 스타일 참고
- `apps/api/test/` — Vitest + Nest TestingModule mock 스타일 참고
- `apps/api/src/agents/adapters/` — 새 adapter 인터페이스/구현 참고

### Warnings
- `pnpm` 일반 실행은 현재 supply-chain `minimumReleaseAge` 정책으로 실패할 수 있음
- 필요한 pnpm 명령에는 `--config.minimumReleaseAge=0`을 붙여 검증 완료
- pnpm 11은 root `package.json`의 `pnpm.onlyBuiltDependencies`를 무시함
- 실제 build script 승인은 `pnpm-workspace.yaml`의 `allowBuilds`와 `pnpm.toml`에 반영됨
- `AGENTS.md`에는 이번 세션 전부터 formatting 변경이 남아 있음
- API `nest build`는 Drizzle builder 타입의 TS2883 declaration-portability 진단 때문에 `apps/api/tsconfig.json`에서 declaration emit을 비활성화함
