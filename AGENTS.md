# Synapse — AGENTS.md

Claude Code와 Codex CLI가 이 프로젝트에서 작업할 때 지켜야 할 규칙과 컨텍스트.

---

## 프로젝트 개요

웹 UI에서 이슈를 던지면 AI PM이 서브태스크로 분해하고, 역할별 에이전트가 실제 작업한 뒤, 그 과정을 VirtualOffice 캐릭터와 xterm.js 터미널로 실시간 시각화하는 사령부.

```
웹 UI (포트 3010)
    └── IssueInput → POST /tasks
              ↓
    NestJS API (포트 3011)
      OrchestratorService → PM 에이전트 → 서브태스크 분해
      AgentRunnerService → node-pty subprocess (claude CLI / codex CLI)
      Drizzle ORM → PostgreSQL
      Socket.IO broadcast (events + pty 스트리밍)
              ↓
    웹 UI
      VirtualOffice 캐릭터 (에이전트 상태 시각화)
      AgentTerminal — xterm.js (터미널 출력 실시간 렌더링)
```

**핵심 제약:** API 키 과금 없음. `claude` CLI (Claude Max 구독), `codex` CLI (Codex Pro 구독)를 subprocess로 실행.

---

## 모노레포 구조

```
apps/api/                NestJS API
  src/events/            POST /events, WebSocket broadcast
  src/tasks/             POST /tasks (fire-and-forget)
  src/orchestrator/      PM 에이전트 호출 + 서브태스크 파견
  src/agents/            AgentRunnerService + adapters (claude, codex)
  src/db/                Drizzle ORM, DB_TOKEN, schema.ts
  drizzle/               migration 파일
apps/web/                Next.js UI
  components/            IssueInput, VirtualOffice, AgentTerminal
  store/                 Zustand (useAgentStore)
packages/schemas/        공유 Zod 스키마 (@synapse/schemas)
scripts/                 send-event.js (hooks), pipe-to-nestjs.js
docker-compose.yml       PostgreSQL 16-alpine
```

---

## 기술 스택

| 레이어              | 기술                                          |
| ------------------- | --------------------------------------------- |
| API 프레임워크      | NestJS 11 + Fastify adapter                   |
| ORM                 | Drizzle ORM (postgres-js driver)              |
| DB                  | PostgreSQL 17                                 |
| WebSocket           | Socket.IO 4 (`@nestjs/platform-socket.io`)    |
| PTY 실행            | node-pty (서버 subprocess)                    |
| 터미널 렌더링       | xterm.js (`@xterm/xterm`, `@xterm/addon-fit`) |
| UI 프레임워크       | Next.js 16 + React 19                         |
| 상태관리            | Zustand 5                                     |
| 스키마 검증         | Zod 4                                         |
| 테스트              | Vitest 4 + supertest 7                        |
| 빌드 오케스트레이션 | Turborepo 2 + pnpm workspaces                 |
| TypeScript          | 6                                             |

---

## 개발 명령어

```bash
# 전체 의존성 설치
pnpm install

# DB 시작 (PostgreSQL)
docker compose up -d

# schemas 빌드 (최초 1회 또는 변경 시)
pnpm --filter @synapse/schemas build

# 개발 서버 전체 기동
pnpm dev

# API만 기동 (포트 3011)
pnpm --filter @synapse/api dev

# UI만 기동 (포트 3010)
pnpm --filter @synapse/web dev

# 전체 테스트
pnpm test

# API 테스트만
pnpm --filter @synapse/api test

# DB migration 실행
pnpm --filter @synapse/api migration:run

# DB migration 파일 생성 (스키마 변경 후)
pnpm --filter @synapse/api migration:generate
```

---

## 패키지 설치 규칙

- **항상 최신 버전** 설치. `^` prefix 사용, 고정 버전 금지.
- 설치 명령은 반드시 `pnpm --filter <패키지명> add <라이브러리>` 형식 사용.
- root에 직접 설치하지 않는다 (Turborepo devDependency 제외).
- workspace 내 패키지 참조는 `"link:../../packages/schemas"` 프로토콜 사용 (`workspace:*` 금지 — pnpm 10 + Node 24 조합에서 lockfile 불일치 시 resolve 버그 발생).
- root `package.json`의 `pnpm.onlyBuiltDependencies`에 postinstall이 필요한 패키지를 명시한다 (예: `node-pty`).

```bash
# 의존성 추가
pnpm --filter @synapse/api add drizzle-orm@latest postgres@latest
pnpm --filter @synapse/api add -D drizzle-kit@latest

# 제거
pnpm --filter @synapse/api remove typeorm @nestjs/typeorm

# 전체 재설치 (lockfile 재생성)
pnpm install --no-frozen-lockfile
```

---

## 포맷터 (Prettier)

루트에 공통 `.prettierrc.json`이 있다. **작업 완료 후 반드시 포맷을 실행하고 종료한다.**

```bash
# 전체 포맷 (작업 종료 전 필수)
pnpm format

# CI / 확인용 (변경 없이 검사만)
pnpm format:check
```

### 포맷 설정 (`.prettierrc.json`)

| 옵션           | 값      |
| -------------- | ------- |
| `semi`         | `true`  |
| `singleQuote`  | `true`  |
| `trailingComma`| `"all"` |
| `printWidth`   | `100`   |
| `tabWidth`     | `2`     |
| `arrowParens`  | `"always"` |

### 규칙

- 모든 `.ts`, `.tsx`, `.js`, `.mjs` 파일 대상.
- `node_modules`, `dist`, `.next`, `*.lock` 은 제외 (`.prettierignore` 참조).
- 포맷 실행 없이 코드를 커밋하지 않는다.
- IDE 저장 시 자동 포맷을 권장하나, 최종 확인은 `pnpm format`으로 한다.

---

## 코드 작성 규칙

### 주석

- **한국어로 작성**한다.
- 번역하면 어색한 기술 용어(라이브러리명, 프레임워크 개념, 약어 등)는 영어 원문을 유지한다.
- 예: `// replay 순서 보정 (DESC → ASC)`
- 예: `// DB 장애 시 빈 배열 fallback`
- 예: `// WebSocket broadcast — 저장 실패 시 전송하지 않음`
- WHY가 명확하지 않을 때만 주석을 단다. 코드 자체로 알 수 있는 내용은 주석 생략.

### 커밋 메시지

- **한국어로 작성**한다. 번역하면 어색한 기술 용어는 영어 원문 유지.
- prefix는 영어(`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- 형식: `<prefix>: <한국어 설명 (기술 용어는 영어)>`
- 예시:
  - `feat: TaskController fire-and-forget 패턴 추가`
  - `fix: replay 순서 역정렬 버그 수정`
  - `chore: pnpm workspace 의존성 정리`

### TypeScript

- `strictNullChecks`, `noImplicitAny`는 현재 `false` — 점진적 개선 대상, 새 파일에서는 명시적 타입을 쓴다.
- `reflect-metadata`는 `main.ts`에서 반드시 첫 번째로 import (NestJS DI 의존).
- Drizzle 쿼리는 `db.insert/select/update/delete` 체인만 사용. raw SQL 금지.
- TypeORM, `@nestjs/typeorm`, `pg` 패키지는 제거됨 — 다시 추가하지 않는다.

---

## 아키텍처 결정사항

### DB 레이어

- ORM: **Drizzle ORM** (`drizzle-orm/postgres-js` + `postgres` driver)
- 스키마 정의: `apps/api/src/db/schema.ts`
- DB Provider: `apps/api/src/db/db.module.ts` — `@Global()` NestJS 모듈, `DB_TOKEN` Symbol로 주입
- Migration: `apps/api/drizzle/` 디렉터리, `drizzle-kit generate/migrate` 사용

### 이벤트 흐름 (POST /events)

1. `POST /events` → Zod 검증 → `EventsService.ingest()`
2. `db.insert(events).values(...)` — 실패 시 503, broadcast 하지 않음
3. `EventsGateway.broadcast(event)` — 저장 성공 후에만 실행
4. WebSocket 연결 시 `getRecentEvents()` → DESC 50개 조회 → `reverse()` → `replay` emit

### Task 흐름 (POST /tasks)

1. `POST /tasks` → Zod 검증 → `db.insert(tasks)` → `void orchestrator.dispatch(task)` → **202 즉시 반환**
2. [백그라운드] `OrchestratorService.dispatch()` — PM 에이전트 실행
3. PM JSON 파싱 실패 → `task.status='failed'` + `type:'error'` 이벤트 broadcast
4. 파싱 성공 → 서브태스크를 `Promise.allSettled`로 병렬 파견

### PTY 스트리밍

- `node-pty.spawn()` → `onData(chunk)` → `socket.emit('pty:data', { agentId, data })`
- 클라이언트: `pty:data` 이벤트 수신 → `xterm.js.write(data)`
- subprocess timeout: `spawn()` timeout 옵션은 동작 안 함. 반드시 `setTimeout + child.kill('SIGTERM')` → 2초 후 `child.kill()` (SIGKILL) 패턴 사용.

### replay 순서 보정

`ORDER BY created_at DESC LIMIT 50` 으로 최신 N개를 가져온 뒤, in-memory `reverse()`로 ASC 순서를 복원한다. `ASC LIMIT`은 오래된 50개를 반환하므로 사용하지 않는다.

---

## 테스트

### 프레임워크

- Vitest (모든 패키지 공통)
- supertest — HTTP integration test (`apps/api`)
- NestJS `@nestjs/testing` TestingModule — DI mock

### 테스트 위치

```
apps/api/test/events.spec.ts             HTTP POST /events 테스트
apps/api/test/events-service.spec.ts    EventsService 유닛 테스트
apps/api/test/tasks.spec.ts             HTTP POST /tasks 테스트
apps/api/test/orchestrator.spec.ts      OrchestratorService 유닛 테스트
apps/api/test/agent-runner.spec.ts      AgentRunnerService 유닛 테스트
apps/api/test/claude-adapter.spec.ts    ClaudeAdapter 유닛 테스트
apps/web/components/IssueInput.test.tsx IssueInput 컴포넌트 테스트
apps/web/store/useAgentStore.test.ts    Zustand store 테스트
packages/schemas/src/index.test.ts      Zod 스키마 테스트
```

### Drizzle mock 패턴

```ts
function makeSelectChain(rows) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

const mockDb = {
  insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
  select: vi.fn().mockReturnValue(makeSelectChain([])),
};
// Provider: { provide: DB_TOKEN, useValue: mockDb }
```

---

## 환경변수

| 변수                     | 기본값                                                | 설명                                |
| ------------------------ | ----------------------------------------------------- | ----------------------------------- |
| `PORT`                   | `3011`                                                | API 서버 포트                       |
| `DATABASE_URL`           | `postgresql://synapse:synapse@localhost:5432/synapse` | PostgreSQL 연결 URL                 |
| `CORS_ORIGIN`            | `http://localhost:3010`                               | 허용할 CORS origin                  |
| `NEXT_PUBLIC_API_URL`    | `http://localhost:3011`                               | 브라우저에서 접속할 API URL         |
| `SYNAPSE_API_URL`        | `http://localhost:3011`                               | hooks/pipe 스크립트용 API URL       |
| `AGENT_ID`               | `backend`                                             | hooks 전송 시 사용할 agentId        |
| `SYNAPSE_HOOKS_DISABLED` | `0`                                                   | `1`로 설정 시 hook 이벤트 전송 중지 |

---

## 알려진 이슈 / 주의사항

- **workspace 패키지 참조**: `workspace:*` 대신 `link:../../packages/schemas` 사용. pnpm 10 + Node 24에서 lockfile 불일치 시 resolve 실패 버그가 있다.
- **reflect-metadata**: `main.ts`의 첫 번째 import여야 한다. NestJS decorator metadata가 이에 의존한다.
- **DB migration 후 서버 재시작**: `drizzle-kit migrate` 실행 후 반드시 API 서버를 재시작한다. Drizzle은 런타임 자동 마이그레이션을 지원하지 않는다.
- **스키마 변경 시**: `packages/schemas`를 수정하면 `pnpm --filter @synapse/schemas build`를 먼저 실행해야 API와 Web이 변경 사항을 인식한다.
- **node-pty (Windows)**: 네이티브 빌드가 필요하다. `windows-build-tools` 또는 Visual Studio Build Tools 설치 필요. root `package.json`의 `pnpm.onlyBuiltDependencies`에 `node-pty` 추가.

---

## 워크스페이스 상태 관리 (.ai/)

의미 있는 구현 작업을 마칠 때마다 반드시 `.ai/` 상태 파일을 업데이트한다.

### 업데이트 순서

1. `.ai/save-state.md` — 현재 구현 상태 기록
2. `.ai/next-task.md` — 다음 작업 목표 기록
3. `.ai/decisions.md` — 중요한 결정사항 추가

### .ai/save-state.md 형식

```markdown
### Completed

- 완료된 작업 목록

### In Progress

- 현재 진행 중인 작업

### Broken

- 알려진 문제점

### Modified Files

- 변경된 파일 경로 목록
```

### .ai/next-task.md 형식

```markdown
### Goal

- 다음 구현 목표

### Requirements

- 제약 조건과 기대 결과

### Files To Inspect

- 참고해야 할 파일 목록

### Warnings

- 위험한 영역 또는 주의사항
```

### 규칙

- `.ai/` 파일을 오래된 상태로 두지 않는다.
- 작업 완료 후 상태 업데이트 없이 태스크를 끝내지 않는다.
- 요약은 간결하고 구조화되게 유지한다. 문단보다 bullet point를 선호한다.
- `.ai/` 디렉터리가 없으면 작업 시작 전에 먼저 생성한다.

## 세션 종료 규칙

세션 종료 전 반드시:

1. `pnpm format` 실행 — 포맷되지 않은 코드를 남기지 않는다
2. `.ai/save-state.md` 업데이트
3. `.ai/next-task.md` 업데이트
4. `.ai/decisions.md` 업데이트
5. 다른 에이전트가 이전 대화 없이 이어받을 수 있는 상태인지 검증

포맷 또는 상태 파일 업데이트 없이 작업을 종료하지 않는다.

## Handoff

토큰 제한 또는 세션 종료 시:

- 현재 진행 상태 요약
- 다음 우선 작업
- 위험 요소
- 수정 파일
- 실패 원인

을 `.ai/next-task.md` 또는 `.ai/handoffs/latest.md`에 기록한다.
