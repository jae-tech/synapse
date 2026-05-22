# Synapse — CLAUDE.md

> 전체 프로젝트 규칙은 **AGENTS.md**를 참조한다. 이 파일은 Claude Code 전용 추가 설정만 포함한다.

---

## 작업 종료 체크리스트

코드 변경이 있는 작업을 마칠 때 반드시 순서대로 실행한다:

1. `pnpm format` — prettier 포맷
2. `.ai/` 상태 파일 업데이트 (AGENTS.md 참조)

---

## Skill routing

사용자의 요청이 아래 skill과 매칭되면 Skill tool로 호출한다.

- 아이디어 브레인스토밍, 제품 설계 → `/office-hours`
- 전략/범위 검토 → `/plan-ceo-review`
- 아키텍처/엔지니어링 검토 → `/plan-eng-review`
- 전체 자동 리뷰 → `/autoplan`
- 버그/에러 조사 → `/investigate`
- QA/기능 테스트 → `/qa`
- 코드 리뷰 → `/review`
- 배포/PR 생성 → `/ship`
