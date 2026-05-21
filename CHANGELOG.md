# Changelog

All notable changes to Synapse are documented here.

## [0.2.0.0] - 2026-05-22

### Added

- **PostgreSQL persistence** — Events are now stored in PostgreSQL via TypeORM. `docker compose up -d` brings up a `postgres:16-alpine` container with `pg_isready` healthcheck. TypeORM migration `CreateEventsTable` creates the `events` table with composite indexes on `(workspace_id, created_at)` and `(agent_id, created_at)`.
- **Multi-agent support** — Multiple instances of the same role (e.g. `backend-1`, `backend-2`) are now tracked separately and grouped under a single card in the Virtual Office. A badge (`×2`, `×3+`) appears when more than one instance is active.
- **Status border color** — Agent cards now show a colored border reflecting the group's highest-priority status: blue (working), green (done), dark red (error).
- **DB replay on reconnect** — When a client connects or reconnects, the last 50 events are fetched from PostgreSQL in DESC order and replayed in ASC order, ensuring correct chronological display.
- **`agentId` validation** — `AgentEventSchema` now enforces lowercase letters, digits, and hyphens with `regex(/^[a-z][a-z0-9-]*$/)` and a 50-character maximum.
- **Unit test suite** — All three packages now have Vitest test suites: `@synapse/schemas` (6 agentId validation tests), `@synapse/api` (8 tests: ingest, validation, ORDER-BY regression), `@synapse/web` (10 tests: addEvent, setReplay, extractRole, dedup, summaryStatus).
- **`docker-compose.yml`** with PostgreSQL service and health check for local development.

### Fixed

- **Replay order bug (E2-2)** — `getRecentEvents` previously used `ORDER BY ASC LIMIT 50`, returning the oldest 50 events instead of the newest 50. Fixed with `ORDER BY DESC LIMIT 50` followed by in-memory `reverse()`.
- **Duplicate event dedup (E2-5)** — `addEvent` now checks `seenIds` before adding, preventing duplicate entries when replay and broadcast race on reconnect.
- **DB save 503 gate (E2-7)** — `ingest()` now awaits the DB save before broadcasting. If the INSERT fails, a 503 is returned and the event is not broadcast.

### Changed

- **Replay source** — Moved from in-memory ring buffer in `EventsGateway` to PostgreSQL query in `EventsService`. Replay buffer size env var (`REPLAY_BUFFER_SIZE`) is no longer used.
- **Agent store initialization** — `agents` map is now empty on startup and populated lazily as events arrive, supporting arbitrary `agentId` strings beyond the six fixed roles.

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
