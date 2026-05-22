# Next Task

### Goal
- Phase 8 — GitHub Actions CI 설정
  - `.github/workflows/ci.yml` — pnpm install → test → format:check
  - PR에 CI 배지 표시
  - (선택) `docker compose build` smoke test

### Requirements
- Node.js 22, pnpm 11 캐시 설정
- `pnpm --config.minimumReleaseAge=0` 사용 (minimumReleaseAge 정책 회피)
- API 테스트는 PostgreSQL 없이 mock으로 실행 (DB 연결 불필요)

### Warnings
- node-pty 네이티브 빌드 — GitHub Actions Ubuntu runner에서 python3/make/g++ 사전 설치 필요
- pnpm lockfile frozen 검사 포함 필요
