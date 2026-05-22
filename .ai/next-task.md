# Next Task

### Goal
- Phase 4 — 디자인 시스템 + UI polish
  - globals.css CSS 변수 토큰 정의 (색상, 타이포, 간격)
  - VirtualOffice 인라인 스타일 → CSS 클래스 전환
  - 에이전트 카드 빈 상태 / 에러 상태 개선
  - 반응형 레이아웃 (모바일 최소 대응)

### Requirements
- `apps/web/app/globals.css` — CSS 변수 시스템 구축
- `VirtualOffice.tsx` — 인라인 style 제거, className 기반으로 전환
- 에이전트 카드: 빈 상태 CTA, 에러 시각화 개선
- IssueInput: 포커스 상태, 모바일 터치 타겟

### Warnings
- xterm.js(AgentTerminal)는 자체 스타일 시스템 — 건드리지 않음
- 인라인 스타일 전환 시 기능 동작 회귀 없이 진행
