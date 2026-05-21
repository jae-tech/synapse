# Synapse — AI Virtual Office

Claude Code가 일하는 모습을 실시간으로 시각화하는 로컬-퍼스트 대시보드.

## 5분 내 기동 (TTHW)

### 사전 요구사항

- Node.js 20+
- Claude Code CLI (`npm i -g @anthropic-ai/claude-code`)

### 1. 설치

```bash
npm install
```

### 2. schemas 빌드

```bash
cd packages/schemas && npm run build && cd ../..
```

### 3. 서비스 시작 (터미널 2개)

```bash
# 터미널 1 — NestJS API (포트 3011)
cd apps/api && npm run start:dev

# 터미널 2 — Next.js UI (포트 3010)
cd apps/web && npm run dev
```

### 4. 브라우저 열기

http://localhost:3010

### 5. Claude Code 연동 (두 가지 방법 중 하나)

**방법 A — hooks (자동, 권장)**

Claude Code 세션을 시작하면 `.claude/settings.json`의 hooks가 자동으로 이벤트를 전송합니다.

```bash
SYNAPSE_HOOKS_DISABLED=0 claude
```

**방법 B — stream-json pipe**

```bash
AGENT_ID=backend claude --output-format stream-json --verbose -p "작업 내용" \
  | node scripts/pipe-to-nestjs.js
```

> hooks와 pipe를 동시에 사용하면 이벤트가 중복됩니다.  
> hooks 사용 시 `SYNAPSE_HOOKS_DISABLED=1`로 pipe를 비활성화하세요.

## 아키텍처

```
Claude Code (로컬)
    ├── hooks → POST http://localhost:3011/events
    └── stream-json → pipe-to-nestjs.js → POST http://localhost:3011/events
              ↓
    NestJS (포트 3011) — 인메모리 replay buffer + WebSocket
              ↓
    Next.js (포트 3010) — 에이전트 도트 UI
```

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SYNAPSE_API_URL` | `http://localhost:3011` | API 서버 URL |
| `AGENT_ID` | `backend` | 에이전트 역할 |
| `SYNAPSE_HOOKS_DISABLED` | `0` | `1`로 설정 시 hook 이벤트 전송 중지 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3011` | 브라우저에서 접속할 API URL |

## 테스트

```bash
cd apps/api && npm test
```
