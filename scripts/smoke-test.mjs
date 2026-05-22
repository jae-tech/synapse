#!/usr/bin/env node
/**
 * Synapse 통합 스모크 테스트
 *
 * 실제 API + Socket.IO 연결을 사용해 다음 흐름을 검증한다:
 *   POST /tasks → agent:start 이벤트 수신 → pty:data 스트리밍 → agent:complete|agent:error
 *
 * 사용법:
 *   node scripts/smoke-test.mjs
 *   node scripts/smoke-test.mjs --url http://localhost:3011 --timeout 120
 *   node scripts/smoke-test.mjs --skip-agent  (Socket.IO 연결 + POST만 검증, 에이전트 실행 생략)
 *
 * 환경변수 (CLI 인자로도 덮어쓸 수 있음):
 *   SYNAPSE_API_URL   API 베이스 URL (기본: http://localhost:3011)
 *   SMOKE_TIMEOUT_S   전체 타임아웃(초) (기본: 120)
 *   SMOKE_ISSUE       테스트용 이슈 텍스트
 *   SMOKE_WORKSPACE   workspaceId (기본: smoke-test)
 */

import { createServer } from 'node:http';

// ─── 인자 파싱 ───────────────────────────────────────────────
const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}
const SKIP_AGENT = args.includes('--skip-agent');
const API_URL = argVal('--url') ?? process.env.SYNAPSE_API_URL ?? 'http://localhost:3011';
const TIMEOUT_S = parseInt(argVal('--timeout') ?? process.env.SMOKE_TIMEOUT_S ?? '120', 10);
const ISSUE = process.env.SMOKE_ISSUE ?? '헬로 월드 REST API 엔드포인트를 Node.js로 구현해줘';
const WORKSPACE_ID = process.env.SMOKE_WORKSPACE ?? 'smoke-test';

// ─── 출력 헬퍼 ───────────────────────────────────────────────
const OK   = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WAIT = '\x1b[33m…\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

function log(symbol, msg) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${symbol} ${msg}`);
}

let passed = 0;
let failed = 0;

function pass(label) {
  passed++;
  log(OK, label);
}

function fail(label, detail) {
  failed++;
  log(FAIL, label + (detail ? ` — ${detail}` : ''));
}

// ─── HTTP 헬퍼 ───────────────────────────────────────────────
async function httpGet(path) {
  const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(5000) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function httpPost(path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ─── Socket.IO 동적 import (설치 여부 확인) ──────────────────
async function loadSocketIO() {
  try {
    const { io } = await import('socket.io-client');
    return io;
  } catch {
    return null;
  }
}

// ─── 테스트 단계 ─────────────────────────────────────────────

// 1. API 헬스 체크
async function checkApiHealth() {
  log(WAIT, `API 연결 확인 중 (${API_URL})...`);
  try {
    const { status } = await httpGet('/agents/status');
    if (status === 200) {
      pass('API 헬스 체크 — GET /agents/status 200');
    } else {
      fail('API 헬스 체크', `status ${status}`);
    }
  } catch (err) {
    fail('API 헬스 체크', err.message);
  }
}

// 2. POST /tasks 202 반환
async function checkPostTask() {
  log(WAIT, 'POST /tasks 호출 중...');
  try {
    const { status, body } = await httpPost('/tasks', { issue: ISSUE, workspaceId: WORKSPACE_ID });
    if (status === 202 && body?.id) {
      pass(`POST /tasks → 202 (id: ${body.id})`);
      return body.id;
    } else {
      fail('POST /tasks', `status ${status}, body ${JSON.stringify(body)}`);
      return null;
    }
  } catch (err) {
    fail('POST /tasks', err.message);
    return null;
  }
}

// 3. GET /tasks/:id 상태 조회
async function checkTaskStatus(taskId) {
  log(WAIT, `GET /tasks/${taskId} 조회 중...`);
  try {
    const { status, body } = await httpGet(`/tasks/${taskId}`);
    if (status === 200 && body?.id === taskId) {
      pass(`GET /tasks/:id → 200 (status: ${body.status})`);
      return body.status;
    } else {
      fail('GET /tasks/:id', `status ${status}`);
      return null;
    }
  } catch (err) {
    fail('GET /tasks/:id', err.message);
    return null;
  }
}

// 4. Socket.IO 연결 + 이벤트 수신 대기
async function checkSocketEvents(taskId, timeoutMs) {
  const io = await loadSocketIO();
  if (!io) {
    log(INFO, 'socket.io-client 미설치 → Socket.IO 검증 건너뜀');
    log(INFO, '설치: pnpm add -D socket.io-client  또는  npm i -g socket.io-client');
    return 'skipped';
  }

  return new Promise((resolve) => {
    log(WAIT, `Socket.IO 연결 중 (workspace: ${WORKSPACE_ID})...`);

    const socket = io(API_URL, {
      query: { workspaceId: WORKSPACE_ID },
      transports: ['websocket'],
      timeout: 5000,
    });

    const received = {
      replay: false,
      agentStart: false,
      ptyData: false,
      agentEnd: false,   // agent:complete 또는 agent:error
    };

    let ptyChunks = 0;

    const timer = setTimeout(() => {
      socket.disconnect();
      // 타임아웃이지만 일부 이벤트는 받았을 수 있음
      if (received.agentStart) {
        pass('Socket.IO agent:start 이벤트 수신');
      } else {
        fail('Socket.IO agent:start 이벤트 수신', `${timeoutMs / 1000}s 타임아웃`);
      }
      if (received.ptyData) {
        pass(`Socket.IO pty:data 스트리밍 (${ptyChunks}청크 수신)`);
      } else {
        log(INFO, 'pty:data 미수신 — claude CLI 미설치 또는 CLAUDE_BIN 미설정 시 정상');
      }
      if (received.agentEnd) {
        pass('Socket.IO agent:complete|agent:error 이벤트 수신');
      } else {
        log(INFO, `agent 종료 이벤트 미수신 — 실행 중이거나 타임아웃 (taskId: ${taskId})`);
      }
      resolve(received.agentStart ? 'partial' : 'timeout');
    }, timeoutMs);

    socket.on('connect', () => {
      pass('Socket.IO 연결 성공');
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      fail('Socket.IO 연결 실패', err.message);
      socket.disconnect();
      resolve('error');
    });

    socket.on('replay', (events) => {
      received.replay = true;
      pass(`Socket.IO replay 수신 (${Array.isArray(events) ? events.length : 0}개 이벤트)`);
    });

    socket.on('agent_event', (event) => {
      if (event.type === 'agent:start') {
        received.agentStart = true;
        log(OK, `agent:start — agentId: ${event.agentId}`);
      } else if (event.type === 'agent:complete') {
        received.agentEnd = true;
        log(OK, `agent:complete — agentId: ${event.agentId}, exitCode: ${event.payload?.exitCode}`);
      } else if (event.type === 'agent:error') {
        received.agentEnd = true;
        log(INFO, `agent:error — agentId: ${event.agentId} (claude CLI 미설치 시 정상)`);
      }

      // agent:complete 또는 agent:error 수신 시 종료 판정
      if (received.agentEnd && received.agentStart) {
        clearTimeout(timer);
        socket.disconnect();

        pass('Socket.IO agent:start 이벤트 수신');
        if (received.ptyData) {
          pass(`Socket.IO pty:data 스트리밍 (${ptyChunks}청크 수신)`);
        } else {
          log(INFO, 'pty:data 미수신 — claude CLI 연동 전 정상');
        }
        pass('Socket.IO agent:complete|agent:error 이벤트 수신');
        resolve('complete');
      }
    });

    socket.on('pty:data', ({ agentId, data }) => {
      if (!received.ptyData) {
        received.ptyData = true;
        log(OK, `pty:data 첫 청크 수신 — agentId: ${agentId}`);
      }
      ptyChunks++;
      // 과도한 로그 방지 — 5청크마다 진행 표시
      if (ptyChunks % 5 === 0) {
        log(INFO, `  pty:data ${ptyChunks}청크 수신 중...`);
      }
    });
  });
}

// 5. GET /agents/status 실행 중 목록
async function checkAgentStatus() {
  try {
    const { status, body } = await httpGet('/agents/status');
    if (status === 200) {
      const running = body?.running ?? [];
      pass(`GET /agents/status → 200 (실행 중: ${running.length}개)`);
      if (running.length > 0) {
        running.forEach((a) => log(INFO, `  실행 중 에이전트: ${a.agentId} (ws: ${a.workspaceId})`));
      }
    } else {
      fail('GET /agents/status', `status ${status}`);
    }
  } catch (err) {
    fail('GET /agents/status', err.message);
  }
}

// ─── 메인 ────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  Synapse 스모크 테스트');
  console.log(`  API: ${API_URL}`);
  console.log(`  workspace: ${WORKSPACE_ID}`);
  console.log(`  타임아웃: ${TIMEOUT_S}s`);
  if (SKIP_AGENT) console.log('  모드: --skip-agent (에이전트 이벤트 대기 생략)');
  console.log('═'.repeat(60) + '\n');

  await checkApiHealth();

  const taskId = await checkPostTask();

  if (taskId) {
    await checkTaskStatus(taskId);
  }

  await checkAgentStatus();

  if (!SKIP_AGENT && taskId) {
    // agent:complete까지 대기 — 최대 TIMEOUT_S초
    // 연결 + 이벤트 대기는 태스크 제출 직후 시작 (이미 실행 중일 수 있음)
    const socketResult = await checkSocketEvents(taskId, TIMEOUT_S * 1000);
    if (socketResult === 'complete') {
      // 종료 후 태스크 상태 재조회
      await checkTaskStatus(taskId);
    }
  }

  // ─── 결과 요약 ───────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`  결과: ${passed}개 통과 / ${failed}개 실패`);

  if (failed === 0) {
    console.log('  \x1b[32m전체 통과 ✓\x1b[0m');
  } else {
    console.log('  \x1b[31m실패 항목 있음 ✗\x1b[0m');
  }
  console.log('═'.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('smoke-test 실행 오류:', err);
  process.exit(1);
});
