#!/usr/bin/env node
/**
 * Claude Code hooks용 이벤트 전송 스크립트.
 * bash curl 대신 Node.js로 작성 — Windows/Mac/Linux 모두 동작.
 *
 * 환경변수:
 *   CLAUDE_TOOL_NAME   — 도구 이름 (PreToolUse/PostToolUse에서 자동 주입)
 *   CLAUDE_TOOL_INPUT  — 도구 입력 JSON 문자열
 *   CLAUDE_TOOL_OUTPUT — 도구 출력 문자열 (PostToolUse만)
 *   AGENT_ID           — 에이전트 역할 (기본: "backend")
 *   SYNAPSE_API_URL    — API URL (기본: http://localhost:3011)
 *   EVENT_TYPE         — "tool_use" | "tool_result" (기본: "tool_use")
 */

const API_URL = process.env.SYNAPSE_API_URL ?? 'http://localhost:3011';
const AGENT_ID = process.env.AGENT_ID ?? 'backend';
const TOOL_NAME = process.env.CLAUDE_TOOL_NAME ?? '';
const TOOL_INPUT = process.env.CLAUDE_TOOL_INPUT ?? '';
const TOOL_OUTPUT = process.env.CLAUDE_TOOL_OUTPUT ?? '';
// TOOL_RESULT=1 은 PostToolUse hook에서 설정 (Windows PowerShell 호환)
const EVENT_TYPE = process.env.TOOL_RESULT === '1' ? 'tool_result' : (process.env.EVENT_TYPE ?? 'tool_use');

function truncate(str, max = 500) {
  if (!str) return undefined;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function extractFile(input) {
  try {
    const parsed = JSON.parse(input);
    return parsed.path ?? parsed.file ?? parsed.file_path ?? undefined;
  } catch {
    return undefined;
  }
}

const payload = EVENT_TYPE === 'tool_result'
  ? { output: truncate(TOOL_OUTPUT) }
  : { input: truncate(TOOL_INPUT), file: extractFile(TOOL_INPUT) };

const body = JSON.stringify({
  agentId: AGENT_ID,
  type: EVENT_TYPE,
  tool: TOOL_NAME || undefined,
  payload,
  timestamp: new Date().toISOString(),
  workspaceId: 'default',
});

if (process.env.SYNAPSE_HOOKS_DISABLED === '1') process.exit(0);

fetch(`${API_URL}/events`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
  signal: AbortSignal.timeout(2000),
}).catch((err) => {
  process.stderr.write(`[synapse] API 연결 실패: ${err.message} (${API_URL})\n`);
});
