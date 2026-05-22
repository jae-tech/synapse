# Next Task

### Goal
- Phase 6 — 프로덕션 준비 + 통합 검증
  - Docker Compose 풀스택 실행 (`api` + `web` + `postgres`) 검증
  - `CLAUDE_BIN` 실제 바이너리 E2E 연기 테스트 (CI skip 표시)
  - `GET /tasks/:id` + `GET /agents/status` API 엔드포인트 추가
  - `VirtualOffice` 픽셀아트 오피스 내 에이전트 클릭 → 터미널 연동 UX 개선

### Requirements
- `docker-compose.yml` — `api`, `web` 서비스 추가 (현재 postgres만 존재)
- `CLAUDE_BIN` 환경변수 Docker 레이어 주입 방법 문서화
- `GET /tasks/:id` 상태 조회 API (TasksController 확장)

### Warnings
- node-pty는 컨테이너 내부에서 conpty 미지원 (Linux PTY 모드로 자동 전환되므로 문제없음)
- Next.js standalone 빌드 시 `apps/web/.next/standalone` 경로 주의
