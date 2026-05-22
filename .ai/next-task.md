# Next Task

### Goal
- 후보 B 검증 단계 — Redis pub/sub 스케일아웃 통합 smoke 테스트
  - API 2개 인스턴스에서 이벤트 교차 broadcast 동작 확인
  - Redis 비활성 모드(`WS_REDIS_ENABLED!=1`) fallback 동작 확인
  - 운영 문서(README/AGENTS) Redis 설정 섹션 보강

### Requirements
- 기존 단일 서버 동작 회귀가 없어야 함 (`POST /events`, `POST /tasks`, WebSocket replay/broadcast 유지)
- Redis 미구성 환경에서도 앱이 정상 기동해야 함
- 테스트 또는 최소 smoke 검증 시나리오를 함께 제공

### Files To Inspect
- `apps/api/src/events/events.gateway.ts`
- `apps/api/src/events/events.module.ts`
- `apps/api/src/main.ts`
- `docker-compose.yml`
- `apps/api/package.json`

### Warnings
- Redis adapter 도입 시 NestJS shutdown hook/연결 해제 누락에 주의
