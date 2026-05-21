#!/usr/bin/env node
/**
 * Claude Code stream-json → NestJS Event Collector
 *
 * 사용법:
 *   claude --output-format stream-json --verbose -p "..." | \
 *     AGENT_ID=backend node scripts/pipe-to-nestjs.js
 *
 * stream-json 실제 형식:
 *   - assistant 메시지: content[].type === "tool_use" | "text"
 *   - user 메시지:      content[].type === "tool_result"
 *   - result 이벤트:   .is_error, .result
 *
 * 환경변수:
 *   AGENT_ID          — 에이전트 역할 (기본: "backend")
 *   SYNAPSE_API_URL   — API URL (기본: http://localhost:3011)
 *   AGENT_MODE        — "headless" 이외의 값이면 stdin drain 후 종료
 */

import readline from 'readline';

const AGENT_ID = process.env.AGENT_ID ?? 'backend';
const API_URL = process.env.SYNAPSE_API_URL ?? 'http://localhost:3011';

if (process.env.AGENT_MODE && process.env.AGENT_MODE !== 'headless') {
  process.stdin.resume();
  process.stdin.on('end', () => process.exit(0));
  // drain without processing
  process.stdin.on('data', () => {});
  process.exitCode = 0;
  // do not register rl
} else {
  run();
}

function truncate(str, max = 500) {
  if (!str) return undefined;
  const s = String(str);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

async function postEvent(event) {
  try {
    await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        workspaceId: 'default',
        ...event,
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    process.stderr.write(`[pipe-to-nestjs] POST 실패: ${err.message} (${API_URL})\n`);
  }
}

// 백프레셔 방지: 직렬 Promise 체인
let pending = Promise.resolve();
function enqueue(fn) {
  pending = pending.then(fn).catch(() => {});
}

function processLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return; // 잘못된 JSON — 조용히 skip
  }

  if (obj.type === 'assistant') {
    for (const block of obj.message?.content ?? []) {
      if (block.type === 'tool_use') {
        const inp = block.input;
        const inputText =
          typeof inp === 'object' && inp !== null
            ? (inp.content ?? inp.command ?? inp.path ?? inp.new_string ?? JSON.stringify(inp).slice(0, 200))
            : String(inp ?? '');
        enqueue(() =>
          postEvent({
            type: 'tool_use',
            tool: block.name,
            payload: { input: truncate(inputText), file: inp?.path ?? inp?.file_path ?? undefined },
          })
        );
      } else if (block.type === 'text' && block.text) {
        enqueue(() =>
          postEvent({
            type: 'thinking',
            payload: { content: truncate(block.text) },
          })
        );
      }
    }
  } else if (obj.type === 'user') {
    for (const block of obj.message?.content ?? []) {
      if (block.type === 'tool_result') {
        const output = Array.isArray(block.content)
          ? block.content
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join('\n')
          : String(block.content ?? '');
        enqueue(() =>
          postEvent({
            type: 'tool_result',
            payload: { output: truncate(output) },
          })
        );
      }
    }
  } else if (obj.type === 'result') {
    const content = obj.is_error ? 'error' : 'done';
    enqueue(() =>
      postEvent({
        type: 'status',
        payload: { content },
      })
    );
  }
}

function run() {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on('line', processLine);

  rl.on('close', () => {
    // stdin이 닫혔을 때 done 강제 전송 (crash에 의한 유실 방지)
    enqueue(() => postEvent({ type: 'status', payload: { content: 'done' } }));
    pending.finally(() => process.exit(0));
  });
}
