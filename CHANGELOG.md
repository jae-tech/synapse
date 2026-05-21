# Changelog

All notable changes to Synapse are documented here.

## [0.1.0.0] - 2026-05-21

### Added

- **AI Virtual Office UI** — Real-time dot-character dashboard showing which Claude Code agent is working, idle, done, or errored. Six agent roles (PM, Backend, Frontend, QA, Reviewer, DevOps) each rendered as a colored dot with CSS pulse animation.
- **NestJS Event Collector** (`localhost:3011`) — POST `/events` endpoint validates incoming agent events via Zod, stores the last 50 in a replay buffer, and broadcasts via Socket.IO. Reconnecting clients receive the full replay immediately.
- **Claude Code hooks integration** — `send-event.js` wires into Claude Code's PreToolUse/PostToolUse hooks. Works on Windows PowerShell (`TOOL_RESULT=1` env flag) and macOS/Linux.
- **stream-json pipe** (`pipe-to-nestjs.js`) — Parse Claude Code's `--output-format stream-json` output and forward tool_use, tool_result, thinking, and status events to the API. Handles nested content blocks correctly; serializes requests to prevent backpressure.
- **`@synapse/schemas`** — Shared Zod schemas (`AgentEventSchema`, `AgentRoleSchema`) consumed by both the NestJS API and Next.js frontend.
- **`SYNAPSE_HOOKS_DISABLED`** environment variable — Set to `1` when using `pipe-to-nestjs.js` to prevent duplicate events from hooks running simultaneously.
- **Auto-idle transition** — Agents automatically return to idle status 30 minutes after completing work, via a `setInterval` in `useAgentSocket` (with HMR cleanup).
- **`prefers-reduced-motion`** support — CSS animations disabled for users who prefer reduced motion.
- **README** with 5-minute Time-to-Hello-World setup guide.
