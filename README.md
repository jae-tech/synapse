# Synapse — AI Virtual Office

웹 UI에서 이슈를 입력하면 AI PM이 서브태스크로 분해하고, 역할별 에이전트(`claude` CLI)가 실제 코드를 작성하며, 그 과정을 픽셀아트 오피스와 실시간 터미널로 시각화하는 플랫폼.

```
IssueInput → POST /tasks → OrchestratorService → PM 에이전트 (claude CLI)
                                                       ↓
                                              서브태스크 병렬 파견
                                         (backend / frontend / qa / ...)
                                                       ↓
                                    node-pty PTY → pty:data Socket 이벤트
                                                       ↓
                         VirtualOffice 픽셀아트 캐릭터 + AgentTerminal 터미널
```

---

## 빠른 시작

### 로컬 개발

```bash
# 1. 의존성 설치
pnpm install

# 2. PostgreSQL 시작
docker compose up -d db

# 3. 환경변수 설정
cp .env.example apps/api/.env
# CLAUDE_BIN 등 필요에 따라 수정

# 4. DB 마이그레이션
pnpm --config.minimumReleaseAge=0 --filter @synapse/api migration:run

# 5. schemas 빌드
pnpm --filter @synapse/schemas build

# 6. 개발 서버 기동 (API :3011 + Web :3010)
pnpm dev
```

브라우저에서 `http://localhost:3010` 접속.

### Docker Compose (풀스택)

```bash
# 전체 스택 빌드 + 실행 (db + api + web)
docker compose up --build

# 백그라운드 실행
docker compose up --build -d
```

| 서비스 | URL |
|--------|-----|
| Web UI | http://localhost:3010 |
| API    | http://localhost:3011 |

> **claude CLI를 컨테이너 안에서 실행하려면** `docker-compose.yml`의 `api` 서비스에 `CLAUDE_BIN` 환경변수를 추가하고, claude 바이너리가 포함된 이미지를 직접 빌드해야 합니다.

---

## 환경변수

### API (`apps/api/.env`)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3011` | API 서버 포트 |
| `DATABASE_URL` | `postgresql://synapse:synapse@localhost:5432/synapse` | PostgreSQL 연결 URL |
| `CORS_ORIGIN` | `http://localhost:3010` | 허용할 CORS origin |
| `CLAUDE_BIN` | `claude` (PATH 탐색) | Claude CLI 바이너리 경로 |
| `SYNAPSE_API_URL` | `http://localhost:3011` | 에이전트 → API 콜백 URL |
| `REPLAY_BUFFER_SIZE` | `50` | WebSocket 재연결 시 재전송할 이벤트 수 |

### Web (`apps/web/.env.local`)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3011` | 브라우저에서 접속할 API URL |

템플릿: `.env.example`, `apps/api/.env.example`, `apps/web/.env.local.example`

---

## API 엔드포인트

| 메서드 | 경로 | 응답 | 설명 |
|--------|------|------|------|
| `POST` | `/events` | 201 | 에이전트 이벤트 수신 + DB 저장 + WebSocket broadcast |
| `POST` | `/tasks` | 202 | 이슈 저장 → OrchestratorService 백그라운드 파견 |
| `GET`  | `/tasks/:id` | 200/404/400 | 태스크 상태 조회 |
| `POST` | `/agents/run` | 202 | 에이전트 직접 실행 (fire-and-forget) |
| `GET`  | `/agents/status` | 200 | 현재 실행 중인 에이전트 목록 |

**WebSocket 이벤트** (Socket.IO):

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `replay` | 서버→클라이언트 | 연결 시 최근 이벤트 일괄 전송 |
| `agent_event` | 서버→클라이언트 | 실시간 에이전트 이벤트 |
| `pty:data` | 서버→클라이언트 | PTY 터미널 출력 스트리밍 |

---

## 모노레포 구조

```
apps/
  api/                   NestJS 11 + Fastify (포트 3011)
    src/
      events/            POST /events, WebSocket gateway
      tasks/             POST /tasks, GET /tasks/:id
      agents/            POST /agents/run, GET /agents/status
                         AgentRunnerService, ClaudeAdapter (node-pty)
      orchestrator/      PM 에이전트 호출 → 서브태스크 병렬 파견
      db/                Drizzle ORM, DB_TOKEN, schema.ts
    drizzle/             마이그레이션 SQL 파일
    test/                Vitest + supertest 통합 테스트 (34 cases)
  web/                   Next.js 16 + React 19 (포트 3010)
    components/
      VirtualOffice      3패널 레이아웃 (에이전트 목록 / 맵 / 로그)
      PixelOffice        2층 픽셀아트 빌딩 + 캐릭터 애니메이션
      AgentTerminal      ANSI→HTML 렌더러 + 자동 스크롤
      IssueInput         이슈 입력 폼 (Ctrl+Enter 제출)
    store/               Zustand (useAgentStore, ptyBuffers)
    lib/                 useAgentSocket (Socket.IO, replay dedup)
packages/
  schemas/               공유 Zod 스키마 (@synapse/schemas)
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| API | NestJS 11 + Fastify adapter |
| ORM | Drizzle ORM (postgres-js driver) |
| DB | PostgreSQL 17 |
| WebSocket | Socket.IO 4 (`@nestjs/platform-socket.io`) |
| PTY 실행 | node-pty |
| 터미널 렌더링 | ANSI→HTML 커스텀 파서 (xterm.js 미사용, SSR 안전) |
| UI | Next.js 16 + React 19 |
| 상태관리 | Zustand 5 |
| 스키마 검증 | Zod 4 |
| 테스트 | Vitest 4 + supertest 7 |
| 빌드 | Turborepo 2 + pnpm workspaces |
| 컨테이너 | Docker Compose (api / web / db 멀티스테이지) |

---

## 개발 명령어

```bash
pnpm dev                                           # 전체 개발 서버
pnpm test                                          # 전체 테스트
pnpm format                                        # Prettier 포맷

pnpm --filter @synapse/api test                    # API 테스트
pnpm --filter @synapse/api migration:run           # DB 마이그레이션
pnpm --filter @synapse/api migration:generate      # 마이그레이션 파일 생성
pnpm --filter @synapse/schemas build               # schemas 빌드
```

---

## 전제 조건

- **Node.js 22+** (node-pty 네이티브 빌드 필요)
- **pnpm 11+** (`corepack enable` 또는 직접 설치)
- **Docker** (PostgreSQL, 전체 스택 실행 시)
- **claude CLI** — `npm install -g @anthropic-ai/claude-code` 후 `CLAUDE_BIN` 환경변수 확인

Windows에서 node-pty를 빌드하려면 Visual Studio Build Tools (C++ 워크로드) 설치가 필요합니다.
