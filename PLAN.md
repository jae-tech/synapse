# Synapse — Phase 3: 사령부 아키텍처 (웹 명령 → 서브에이전트 → 시각화)

> CEO 리뷰 결정사항 (2026-05-22): 모니터링 대시보드 → 사령부로 전면 재설계.
> 기존 API/WebSocket/UI 인프라는 재활용. 명령 발신 + 에이전트 오케스트레이션 레이어 추가.

---

## 제품 비전

웹 UI에서 이슈를 하나 던지면:
1. **AI PM 에이전트**가 이슈를 분석하고 서브태스크로 분해
2. **역할별 에이전트** (Backend, Frontend, QA 등)가 각자 Claude Code / Codex CLI로 실제 작업
3. **각 에이전트의 작업 진행**이 실시간으로 VirtualOffice 캐릭터로 시각화
4. **우측 패널**에서 각 에이전트의 터미널 출력(도구 호출, 파일 수정 과정)을 실시간 확인

**핵심 제약:**
- API 키 과금 없음 — Claude Max 구독 (`claude` CLI), Codex Pro 구독 (`codex` CLI) 사용
- 모든 AI 실행은 로컬 PC에서 subprocess로

---

## 확정된 아키텍처 결정사항 (Eng Review 포함)

| 항목 | 결정 | 이유 |
|------|------|------|
| 제품 방향 | 사령부 (명령 → 작업 → 시각화) | 모니터링만으로는 원하는 흐름 불가 |
| AI 실행 방식 | NestJS adapter 패턴 (CLI subprocess) | claude, codex, 미래 AI 플러그인 방식으로 확장 |
| 에이전트 역할 분담 | AI PM이 자동 분담 | 사용자는 이슈만 던짐, 나머지 자동화 |
| 과금 방식 | 구독형 전용 (API 키 없음) | claude CLI, codex CLI 직접 실행 |
| 우측 패널 출력 | node-pty + xterm.js | PTY로 실제 터미널 스트리밍, 작업 과정 시각화 (D6) |
| subprocess timeout | setTimeout + child.kill() | spawn() timeout 옵션은 실제로 동작 안 함 (D7) |
| 에이전트 시작 신호 | AgentRunnerService spawn 직후 emit | VirtualOffice 캐릭터 즉시 활성화 (D8) |
| fire-and-forget | TaskController에서 void dispatch() | 202 즉시 리턴, PM 실행은 백그라운드 (D11) |

---

## 새로운 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  웹 UI (포트 3010)                                                               │
│                                                                                 │
│  ┌─────────────────────────┐                                                    │
│  │  이슈 입력창 (IssueInput) │  상단 — 이슈 텍스트 입력 + '에이전트 파견' 버튼       │
│  │  [로그인 버그 수정... ]    │  fetch 실패 시 에러 메시지 표시                     │
│  └───────────┬─────────────┘                                                    │
│              │ POST /tasks                                                      │
│  ┌─────────────────────────────┬────────────────────────────────────────────┐   │
│  │  에이전트 목록 (좌측)          │ VirtualOffice - 2D 캐릭터 (중앙)            │   │
│  │  PM ● 작업중                 │  [PM●] [Backend●] [QA○]                    │   │
│  │  Backend ● 작업중            │  에이전트 spawn 즉시 캐릭터 활성화              │   │
│  │  QA ○ 대기                  │                                              │   │
│  └─────────────────────────────┴────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  에이전트 터미널 출력 (우측) — xterm.js                                       │  │
│  │  ❯ Reading auth.ts...                                                       │  │
│  │  ❯ Edit: removed unused import                                              │  │
│  │  ❯ Running tests...                                                         │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                          ↑ WebSocket (events + pty 스트림)        │
└──────────────────────────────────────────┼──────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────────────────────────────────────────────┐
│  NestJS API (포트 3011)                                                           │
│                                                                                  │
│  TaskController → void OrchestratorService.dispatch()  ← fire-and-forget        │
│  └─ 202 즉시 반환           │                                                    │
│                             ├─► PM 에이전트 실행 (이슈 분석 + 분해)                │
│                             │   └─ PM JSON 파싱 실패 → task='failed' emit        │
│                             └─► [병렬] AgentRunnerService.run()                  │
│                                    │  1. pty.spawn (node-pty)                   │
│                                    │  2. 즉시 { type:'agent:start' } broadcast   │
│                                    │  3. pty 출력 → WebSocket 스트리밍            │
│                                    │  4. setTimeout 5분 → SIGTERM → SIGKILL      │
│                                    └─► EventsService.ingest() → broadcast        │
│                                                                                  │
│  PostgreSQL (Drizzle)    WebSocket Gateway → 브라우저 실시간 업데이트               │
└──────────────────────────────────────────────────────────────────────────────────┘
            │
┌──────────────────────────────────────────────────────────────────────────────────┐
│  로컬 AI 프로세스들 (node-pty subprocess)                                          │
│                                                                                  │
│  ClaudeAdapter: pty.spawn("claude", ["--dangerously-skip-permissions"])          │
│                 → pty 출력 실시간 WebSocket 스트리밍                               │
│                                                                                  │
│  CodexAdapter: pty.spawn("codex", ["exec", "-C", workdir, "-s", "read-only"])   │
│                                                                                  │
│  각 에이전트: AGENT_ID + SYNAPSE_API_URL 환경변수 주입                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 데이터 흐름

### Task 생성 흐름
```
POST /tasks { issue: "로그인 버그 수정", workspaceId: "default" }
     │
     ▼
TaskController.create()
     │  Zod 검증
     │  db.insert(tasks)
     │  void this.orchestrator.dispatch(task)  ← fire-and-forget (D11)
     └─ return 202 Accepted  ← 즉시 반환

[백그라운드] OrchestratorService.dispatch(task)
     │
     ├─► AgentRunnerService.run('pm', pmPrompt, workspaceId)
     │        │
     │        ▼  pty.spawn("claude", [...]) (PM 에이전트)
     │        │  spawn 즉시 { type:'agent:start', agentId:'pm' } broadcast (D8)
     │        │  stdout/stderr → WebSocket pty 스트리밍
     │        │  PM 응답 JSON 파싱
     │        │  파싱 실패 → task='failed' + { type:'error' } broadcast (D9)
     │        ▼
     │        서브태스크 목록: ["backend: auth.ts 수정", "frontend: login.tsx 수정"]
     │
     ├─► [병렬] AgentRunnerService.run('backend', backendPrompt, workspaceId)
     │        │  pty.spawn claude CLI
     │        │  spawn 즉시 { type:'agent:start', agentId:'backend' } broadcast
     │        │  pty 출력 → WebSocket 스트리밍 → xterm.js 렌더링
     │
     └─► [병렬] AgentRunnerService.run('frontend', frontendPrompt, workspaceId)
              │  동일 패턴
              └─► 완료 시 { type:'agent:done' } broadcast
```

### PTY 스트리밍 흐름 (신규 — D6)
```
node-pty (서버)
     │  pty.spawn("claude", [...])
     │  pty.onData(chunk => ...)
     ▼
WebSocket Gateway
     │  socket.emit('pty:data', { agentId, data: chunk })
     ▼
xterm.js (클라이언트)
     │  term.write(data)
     └─► 브라우저 우측 패널 실시간 렌더링
```

### 이벤트 보고 흐름 (기존 유지)
```
각 에이전트 프로세스
     │  SYNAPSE_API_URL 환경변수로 자신의 서버 주소 앎
     ▼
POST /events { agentId, type, tool, payload, ... }
     │
     ├─► db.insert(events)
     └─► EventsGateway.broadcast() → WebSocket → VirtualOffice 캐릭터 움직임
```

---

## 새로 추가할 파일

| 파일 | 역할 |
|------|------|
| `packages/schemas/src/index.ts` | `TaskSchema`, `CreateTaskSchema` Zod 스키마 추가 |
| `apps/api/src/db/schema.ts` | `tasks` 테이블 추가 |
| `apps/api/src/tasks/tasks.controller.ts` | `POST /tasks` 엔드포인트 (202 fire-and-forget) |
| `apps/api/src/tasks/tasks.module.ts` | NestJS 모듈 |
| `apps/api/src/orchestrator/orchestrator.service.ts` | PM 에이전트 호출, 서브태스크 파싱 + 병렬 파견 |
| `apps/api/src/agents/agent-runner.service.ts` | node-pty subprocess 생명주기 + pty 스트리밍 관리 |
| `apps/api/src/agents/adapters/claude.adapter.ts` | `claude` CLI node-pty wrapper |
| `apps/api/src/agents/adapters/codex.adapter.ts` | `codex` CLI node-pty wrapper |
| `apps/api/src/agents/adapters/agent-adapter.interface.ts` | 어댑터 인터페이스 |
| `apps/web/components/IssueInput.tsx` | 이슈 입력 UI (에러 피드백 포함) |
| `apps/web/components/AgentTerminal.tsx` | xterm.js 에이전트 터미널 패널 (신규) |
| `apps/web/lib/useTasks.ts` | Task 전송 훅 |

### 기존 유지 파일

| 파일 | 역할 |
|------|------|
| `apps/api/src/events/*` | 이벤트 수신/저장/broadcast (변경 없음) |
| `apps/api/src/db/*` | Drizzle ORM, DB_TOKEN (schema.ts에 tasks 테이블 추가) |
| `apps/web/components/VirtualOffice.tsx` | 캐릭터 시각화 (변경 최소화) |
| `apps/web/store/useAgentStore.ts` | Zustand 상태 (변경 없음) |
| `scripts/send-event.js` | hooks 전송 (변경 없음) |

---

## 핵심 인터페이스 설계

### Zod 스키마 (packages/schemas)
```ts
// TaskSchema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  issue: z.string().min(1).max(2000),
  workspaceId: z.string().default('default'),
  status: z.enum(['pending', 'running', 'done', 'failed']),
  createdAt: z.string().datetime(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = TaskSchema.pick({ issue: true, workspaceId: true });
```

### AgentAdapter 인터페이스
```ts
// agent-adapter.interface.ts
export interface AgentAdapter {
  readonly name: string;  // 'claude' | 'codex'
  run(prompt: string, options: AgentRunOptions): Promise<AgentResult>;
  isAvailable(): Promise<boolean>;  // CLI 설치 여부 확인
}

export interface AgentRunOptions {
  workdir: string;
  agentId: string;
  workspaceId: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onPtyData?: (chunk: string) => void;  // PTY 스트리밍 콜백 (D6)
}

export interface AgentResult {
  stdout: string;
  exitCode: number;
  durationMs: number;
}
```

### ClaudeAdapter (D6 node-pty + D7 setTimeout 적용)
```ts
// claude.adapter.ts
import * as pty from 'node-pty';

@Injectable()
export class ClaudeAdapter implements AgentAdapter {
  readonly name = 'claude';

  async run(prompt: string, options: AgentRunOptions): Promise<AgentResult> {
    const startMs = Date.now();
    return new Promise((resolve, reject) => {
      const child = pty.spawn('claude', [
        '--dangerously-skip-permissions',
        '-p', prompt,
      ], {
        name: 'xterm-color',
        cwd: options.workdir,
        env: {
          ...process.env,
          AGENT_ID: options.agentId,
          SYNAPSE_API_URL: process.env.SYNAPSE_API_URL ?? 'http://localhost:3011',
          ...options.env,
        },
      });

      let stdout = '';

      child.onData((chunk: string) => {
        stdout += chunk;
        options.onPtyData?.(chunk);  // 브라우저로 실시간 스트리밍
      });

      // D7: spawn() timeout 옵션은 동작 안 함 → setTimeout + kill 패턴 사용
      const timeoutMs = options.timeoutMs ?? 300_000;
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => child.kill(), 2000);  // SIGKILL fallback
      }, timeoutMs);

      child.onExit(({ exitCode }) => {
        clearTimeout(timer);
        resolve({ stdout, exitCode: exitCode ?? 1, durationMs: Date.now() - startMs });
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = pty.spawn('claude', ['--version'], { name: 'xterm', env: process.env });
      child.onExit(({ exitCode }) => resolve(exitCode === 0));
    });
  }
}
```

### AgentRunnerService (D8: spawn 직후 이벤트 emit)
```ts
// agent-runner.service.ts
@Injectable()
export class AgentRunnerService {
  constructor(
    private readonly gateway: EventsGateway,
    private readonly eventsService: EventsService,
  ) {}

  async run(agentId: string, options: {
    adapter: AgentAdapter;
    prompt: string;
    workspaceId: string;
    timeoutMs?: number;
  }): Promise<AgentResult> {
    // D8: spawn 직전에 'agent:start' 이벤트 emit → VirtualOffice 즉시 활성화
    await this.eventsService.ingest({
      agentId,
      type: 'agent:start',
      payload: { workspaceId: options.workspaceId },
      timestamp: new Date().toISOString(),
      workspaceId: options.workspaceId,
    });

    return options.adapter.run(options.prompt, {
      workdir: process.cwd(),
      agentId,
      workspaceId: options.workspaceId,
      timeoutMs: options.timeoutMs,
      onPtyData: (chunk) => {
        // PTY 청크 → WebSocket pty:data 이벤트로 브라우저 전송
        this.gateway.server?.emit('pty:data', { agentId, data: chunk });
      },
    });
  }
}
```

### TaskController (D11: fire-and-forget — 202 즉시 반환)
```ts
// tasks.controller.ts
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
  ) {}

  @Post()
  @HttpCode(202)
  async create(@Body() body: unknown): Promise<{ id: string }> {
    const result = CreateTaskSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    const [task] = await this.db.insert(tasks).values({
      issue: result.data.issue,
      workspaceId: result.data.workspaceId ?? 'default',
      status: 'pending',
    }).returning();

    // D11: fire-and-forget — dispatch()를 await하지 않음
    // await 하면 PM 실행(수분) 동안 클라이언트 fetch가 블로킹됨
    void this.orchestrator.dispatch(task);

    return { id: task.id };
  }
}
```

### OrchestratorService (핵심 로직)
```ts
@Injectable()
export class OrchestratorService {
  constructor(
    private readonly agentRunner: AgentRunnerService,
    private readonly eventsService: EventsService,
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
  ) {}

  async dispatch(task: Task): Promise<void> {
    await this.db.update(tasks)
      .set({ status: 'running' })
      .where(eq(tasks.id, task.id));

    // 1. PM 에이전트로 이슈 분석
    const pmResult = await this.agentRunner.run('pm', {
      adapter: this.claudeAdapter,
      prompt: buildPmPrompt(task.issue),
      workspaceId: task.workspaceId,
    });

    // 2. PM 응답에서 서브태스크 파싱 (JSON 형식)
    const subtasks = parsePmResponse(pmResult.stdout);

    if (!subtasks || subtasks.length === 0) {
      // D9: PM 파싱 실패 fallback
      await this.db.update(tasks).set({ status: 'failed' }).where(eq(tasks.id, task.id));
      await this.eventsService.ingest({
        agentId: 'pm',
        type: 'error',
        payload: { reason: 'PM 응답 파싱 실패', raw: pmResult.stdout.slice(0, 500) },
        timestamp: new Date().toISOString(),
        workspaceId: task.workspaceId,
      });
      return;
    }

    // 3. 서브태스크를 병렬로 에이전트에 파견
    await Promise.allSettled(subtasks.map((sub) =>
      this.agentRunner.run(sub.agentId, {
        adapter: this.resolveAdapter(sub.preferredAdapter),
        prompt: sub.prompt,
        workspaceId: task.workspaceId,
      })
    ));

    await this.db.update(tasks).set({ status: 'done' }).where(eq(tasks.id, task.id));
  }
}
```

### IssueInput (D10: 에러 피드백 추가)
```tsx
// apps/web/components/IssueInput.tsx
'use client';
import { useState } from 'react';

export function IssueInput() {
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);  // D10

  async function handleSubmit() {
    if (!issue.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, workspaceId: 'default' }),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setIssue('');
    } catch (e) {
      // D10: fetch 실패 시 사용자에게 명시적 피드백
      setError('에이전트 파견 실패. 서버 연결을 확인하세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <textarea
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
        placeholder="이슈를 입력하세요... (예: 로그인 페이지 XSS 버그 수정)"
        rows={3}
        disabled={submitting}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleSubmit} disabled={submitting || !issue.trim()}>
        {submitting ? '처리 중...' : '에이전트 파견'}
      </button>
    </div>
  );
}
```

---

## PM 에이전트 프롬프트 설계

PM 에이전트는 이슈를 받아 **JSON 형식의 서브태스크 목록**을 반환해야 합니다.

```
System: 당신은 소프트웨어 팀의 PM입니다. 이슈를 분석하고 역할별 서브태스크로 분해하세요.
반드시 다음 JSON 형식으로만 응답하세요:
{
  "subtasks": [
    {
      "role": "backend",
      "agentId": "backend-1",
      "prompt": "구체적인 작업 지시사항",
      "preferredAdapter": "claude"
    }
  ]
}
가능한 role: pm, backend, frontend, qa, reviewer, devops

User: {issue}
```

---

## DB 스키마 추가 (tasks 테이블)

```ts
// apps/api/src/db/schema.ts에 추가
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  issue: text('issue').notNull(),
  workspaceId: varchar('workspace_id', { length: 50 }).notNull().default('default'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 테스트 계획 (Eng Review — D9 반영)

### 기존 테스트 (Phase 2, 유지)
- `apps/api/test/events.spec.ts` — POST /events 5개 케이스
- `apps/api/test/events-service.spec.ts` — DESC→ASC, DB 오류 fallback
- `apps/web/store/useAgentStore.test.ts` — Zustand store
- `packages/schemas/src/index.test.ts` — Zod 스키마

### Phase 3 신규 테스트

#### apps/api/test/tasks.spec.ts (HTTP 통합)
```ts
// POST /tasks 테스트
describe('POST /tasks', () => {
  it('유효한 이슈 → 202 + { id: uuid }');
  it('빈 issue → 400');
  it('issue 2001자 → 400');
  it('DB 저장 실패 → 503');
});
```

#### apps/api/test/orchestrator.spec.ts (유닛, D9 핵심)
```ts
// OrchestratorService.dispatch() 테스트
describe('OrchestratorService.dispatch', () => {
  it('PM 정상 응답 → subtasks 파싱 → 병렬 에이전트 실행');
  it('PM JSON 파싱 실패 → task.status=failed + error 이벤트 emit');  // D9 필수
  it('PM 빈 subtasks → task.status=failed');                          // D9 필수
  it('서브에이전트 하나 exitCode!=0 → 나머지 계속 실행 (Promise.allSettled)');
});
```

#### apps/api/test/agent-runner.spec.ts (유닛)
```ts
describe('AgentRunnerService.run', () => {
  it('spawn 직후 { type:"agent:start" } emit (D8)');
  it('타임아웃 시 SIGTERM 전송 (D7)');
  it('onPtyData 콜백 호출');
});
```

#### apps/api/test/claude-adapter.spec.ts (유닛)
```ts
describe('ClaudeAdapter', () => {
  it('isAvailable() — claude --version 성공 → true');
  it('isAvailable() — 미설치 → false');
});
```

#### apps/web/components/IssueInput.test.tsx (컴포넌트)
```ts
describe('IssueInput', () => {
  it('fetch 성공 → input 초기화');
  it('fetch 실패 → 에러 메시지 표시 (D10)');
  it('submitting 중 버튼 disabled');
  it('빈 input → 버튼 disabled');
});
```

---

## NOT in scope (이번 Phase 3)

| 항목 | 이유 | 우선순위 |
|------|------|---------|
| 에이전트 실행 취소/중단 UI | 구현 복잡도 높음, 추후 Phase 4 | P2 |
| Task 목록/히스토리 페이지 | 현재 이슈는 기능 동작이 우선 | P2 |
| Codex adapter 완성 | Claude adapter 먼저, Codex는 추후 추가 | P2 |
| 인증/권한 | 로컬-퍼스트, 단일 사용자 가정 | P3 |
| 에이전트 타임아웃 UI 피드백 | 서버 로그로 우선 대응 | P3 |
| 서브태스크 시각화 트리 | VirtualOffice 캐릭터로 우선 대응 | P3 |
| 멀티 워크스페이스 | 단일 'default' workspaceId로 우선 | P3 |
| xterm.js 테마/폰트 커스터마이징 | 기본 테마로 우선 | P3 |
| PTY 세션 재연결 (새로고침 후 복원) | Phase 4에서 대응 | P3 |

---

## What Already Exists (재활용)

| 기존 코드 | 재활용 방식 |
|----------|-----------|
| `POST /events` + EventsService | 변경 없음 — 에이전트 진행상황 수신 |
| WebSocket Gateway + broadcast | pty:data 이벤트 추가만 — 기존 broadcast 유지 |
| VirtualOffice 캐릭터 UI | agent:start 이벤트 수신 시 캐릭터 활성화 트리거만 추가 |
| Drizzle ORM + DB_TOKEN | schema.ts에 tasks 테이블만 추가 |
| useAgentStore Zustand | 변경 없음 — 이벤트 수신 로직 그대로 |
| send-event.js hooks | 변경 없음 — 에이전트가 그대로 사용 |
| AGENT_ID 환경변수 패턴 | subprocess 실행 시 동일 패턴 적용 |
| AgentEventSchema (agentId regex) | agent:start 타입 추가만 필요 |

---

## 실패 모드 분석

| 코드패스 | 실패 시나리오 | 처리 | 테스트 |
|---------|-------------|------|--------|
| `claude` CLI 미설치 | `isAvailable()` → false → 503 with 명시적 에러 | 필수 | claude-adapter.spec.ts |
| PM 에이전트 응답 JSON 파싱 실패 | parsePmResponse에서 catch → task='failed' + error 이벤트 | 필수 | orchestrator.spec.ts (D9) |
| PM 빈 subtasks | 빈 배열 → task='failed' + error 이벤트 | 필수 | orchestrator.spec.ts (D9) |
| 에이전트 subprocess 타임아웃 | setTimeout 5분 후 SIGTERM → SIGKILL → error 이벤트 | 필수 | agent-runner.spec.ts (D7) |
| DB tasks 테이블 insert 실패 | 503 반환, 에이전트 실행 안 함 | 필수 | tasks.spec.ts |
| 서브에이전트 실패 (exitCode != 0) | Promise.allSettled — 나머지 에이전트 계속, 개별 error 이벤트 | 필수 | orchestrator.spec.ts |
| fetch 실패 (IssueInput) | setError → 에러 메시지 표시, 중복 제출 방지 | 필수 | IssueInput.test.tsx (D10) |
| `codex` CLI 미설치 | adapter fallback → claude로 재시도 | P2 | — |
| node-pty 빌드 실패 (Windows) | 설치 가이드 README에 명시 | 필수 | — |

**Critical gap 없음** — 모든 실패 모드에 처리 로직 + 테스트 케이스가 있음.

---

## 의존성 추가 목록

```bash
# node-pty (서버) — 네이티브 빌드 필요
pnpm --filter @synapse/api add node-pty@latest
pnpm --filter @synapse/api add -D @types/node-pty@latest

# xterm.js (클라이언트)
pnpm --filter @synapse/web add @xterm/xterm@latest @xterm/addon-fit@latest
```

> **Windows 주의:** node-pty는 node-gyp 빌드가 필요합니다.
> `npm install --global windows-build-tools` 또는 Visual Studio Build Tools 설치 필요.
> root `package.json`의 `pnpm.onlyBuiltDependencies`에 `node-pty` 추가.

---

## 구현 태스크

### Phase 3A — 백엔드 (API)

- [ ] **T1 (P1, CC: ~10min)** — schemas — TaskSchema, CreateTaskSchema Zod 스키마 추가
  - 파일: `packages/schemas/src/index.ts`
  - 검증: `pnpm --filter @synapse/schemas build` 성공

- [ ] **T2 (P1, CC: ~5min)** — DB — tasks 테이블 스키마 추가 + migration 생성
  - 파일: `apps/api/src/db/schema.ts`, `apps/api/drizzle/`
  - 검증: `pnpm --filter @synapse/api migration:run` 성공

- [ ] **T3 (P1, CC: ~15min)** — 의존성 설치 — node-pty + @xterm/xterm
  - 검증: `pnpm install` 성공, node-pty 네이티브 빌드 완료

- [ ] **T4 (P1, CC: ~15min)** — AgentAdapter 인터페이스 + ClaudeAdapter (node-pty 버전)
  - 파일: `apps/api/src/agents/adapters/agent-adapter.interface.ts`, `claude.adapter.ts`
  - 검증: `isAvailable()` + run() 테스트 통과

- [ ] **T5 (P1, CC: ~20min)** — AgentRunnerService — node-pty 생명주기 + spawn 즉시 emit (D8)
  - 파일: `apps/api/src/agents/agent-runner.service.ts`
  - 검증: spawn 직후 agent:start 이벤트 emit 테스트

- [ ] **T6 (P1, CC: ~20min)** — OrchestratorService — PM 호출 + 파싱 + 병렬 파견 + PM 실패 fallback (D9)
  - 파일: `apps/api/src/orchestrator/orchestrator.service.ts`
  - 검증: PM 실패 → task=failed 테스트 통과

- [ ] **T7 (P1, CC: ~10min)** — TaskController + TaskModule — fire-and-forget POST /tasks (D11)
  - 파일: `apps/api/src/tasks/tasks.controller.ts`, `tasks.module.ts`
  - 검증: `curl -X POST /tasks` → 202 즉시 반환

- [ ] **T8 (P1, CC: ~5min)** — app.module.ts에 TaskModule 등록
  - 파일: `apps/api/src/app.module.ts`
  - 검증: 서버 재시작 후 `/tasks` 라우트 노출

### Phase 3B — 프론트엔드 (UI)

- [ ] **T9 (P1, CC: ~15min)** — IssueInput 컴포넌트 — 에러 피드백 포함 (D10)
  - 파일: `apps/web/components/IssueInput.tsx`
  - 검증: fetch 실패 시 에러 메시지 표시, 중복 제출 방지

- [ ] **T10 (P1, CC: ~20min)** — AgentTerminal 컴포넌트 — xterm.js + pty:data WebSocket
  - 파일: `apps/web/components/AgentTerminal.tsx`
  - 검증: pty:data 이벤트 수신 → xterm.js 렌더링

- [ ] **T11 (P1, CC: ~10min)** — 3패널 레이아웃 통합 (IssueInput + VirtualOffice + AgentTerminal)
  - 파일: `apps/web/app/page.tsx` 또는 메인 레이아웃
  - 검증: 와이어프레임 기준 UI 렌더링

### Phase 3C — 테스트

- [ ] **T12 (P1, CC: ~20min)** — tasks.spec.ts, orchestrator.spec.ts, agent-runner.spec.ts, claude-adapter.spec.ts
  - PM fallback (D9), setTimeout kill (D7), agent:start emit (D8) 케이스 필수

- [ ] **T13 (P1, CC: ~10min)** — IssueInput.test.tsx (에러 피드백 D10)

### Phase 3D — 통합 테스트

- [ ] **T14 (P1, CC: ~15min)** — 종단간: 이슈 입력 → PM 분석 → 에이전트 실행 → 캐릭터 이동 + pty 스트리밍
  - 검증: VirtualOffice 캐릭터 활성화 + AgentTerminal 출력 확인

- [ ] **T15 (P2, CC: ~10min)** — CodexAdapter 구현 (codex CLI 설치된 경우)
  - 파일: `apps/api/src/agents/adapters/codex.adapter.ts`

---

## 병렬 구현 전략 (Worktree)

| 단계 | 모듈 | 의존성 |
|------|------|--------|
| T1 | packages/schemas | — |
| T2 | apps/api/src/db | T1 |
| T3 | 의존성 설치 | — |
| T4 | apps/api/src/agents/adapters | T3 |
| T5 | apps/api/src/agents | T4 |
| T6 | apps/api/src/orchestrator | T5 |
| T7-T8 | apps/api/src/tasks | T6 |
| T9-T11 | apps/web/components | T7 (API 엔드포인트 필요) |
| T12-T13 | apps/api/test, apps/web | T6, T9 |

**Lane A (백엔드):** T1 → T2 → T4 → T5 → T6 → T7 → T8
**Lane B (패키지 설치):** T3 (독립 — Lane A와 병렬)
**Lane C (프론트엔드):** T9 → T10 → T11 (Lane A T7 완료 후 시작)
**Lane D (테스트):** T12 → T13 → T14 (Lane A+C 완료 후)

Lane A + B 병렬 시작 → Lane C 시작 → Lane D 시작.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | 범위 & 전략 | 1 | ISSUES_OPEN → CLEAR | 전면 재설계 결정, 방향 전환 확정 |
| Codex Review | `/codex review` | 독립 2차 의견 | 0 | — | — |
| Eng Review | `/plan-eng-review` | 아키텍처 & 테스트 (필수) | 1 | CLEAR (PLAN) | 11개 결정 (D1-D11), 0 critical gap |
| Design Review | `/plan-design-review` | UI/UX 갭 | 0 | — | — |
| DX Review | `/plan-devex-review` | 개발자 경험 갭 | 0 | — | — |

**UNRESOLVED:** 0 (D1~D11 모두 결정 완료)
**VERDICT:** CEO + ENG CLEARED — 구현 시작 가능. node-pty Windows 빌드 주의.
