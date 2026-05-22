# Next Task

### Goal
- Phase 3 구현 시작 — T1(schemas) + T3(node-pty 의존성 설치) 병렬 착수

### Requirements
- `packages/schemas/src/index.ts`에 `TaskSchema`, `CreateTaskSchema` Zod 스키마 추가
- `pnpm --filter @synapse/api add node-pty@latest` + Windows node-gyp 빌드 확인
- `pnpm --filter @synapse/web add @xterm/xterm@latest @xterm/addon-fit@latest`
- root `package.json`의 `pnpm.onlyBuiltDependencies`에 `node-pty` 추가

### Files To Inspect
- `packages/schemas/src/index.ts` — 기존 스키마 구조 확인
- `apps/api/package.json` — 현재 의존성 확인
- `apps/web/package.json` — 현재 의존성 확인
- `package.json` (root) — `pnpm.onlyBuiltDependencies` 확인

### Warnings
- node-pty는 네이티브 빌드 필요 (Windows: Visual Studio Build Tools 또는 windows-build-tools)
- `workspace:*` 프로토콜 금지, `link:` 프로토콜 사용
- schemas 변경 후 반드시 `pnpm --filter @synapse/schemas build` 실행
