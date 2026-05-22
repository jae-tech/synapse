#!/usr/bin/env bash
# Synapse 로컬 E2E 스모크 테스트
#
# Docker Compose로 전체 스택(db + redis + api)을 기동하고
# smoke-test.mjs로 실제 흐름을 검증한다.
#
# 사용법:
#   bash scripts/e2e-local.sh                     # 전체 스택 기동 + 검증
#   bash scripts/e2e-local.sh --skip-docker       # 이미 실행 중인 API에 검증만 실행
#   bash scripts/e2e-local.sh --skip-agent        # Socket.IO 이벤트 대기 생략 (빠른 확인)
#   bash scripts/e2e-local.sh --timeout 60        # 타임아웃(초) 지정 (기본 120)
#   bash scripts/e2e-local.sh --keep              # 테스트 후 컨테이너 유지
#
# 환경변수:
#   CLAUDE_BIN         claude CLI 바이너리 경로 (기본: claude)
#   SYNAPSE_API_URL    API URL (기본: http://localhost:3011)

set -euo pipefail

# ─── 인자 파싱 ──────────────────────────────────────────────────
SKIP_DOCKER=0
SKIP_AGENT=0
KEEP_DOCKER=0
TIMEOUT_S=120

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-docker) SKIP_DOCKER=1 ;;
    --skip-agent)  SKIP_AGENT=1 ;;
    --keep)        KEEP_DOCKER=1 ;;
    --timeout)     TIMEOUT_S="$2"; shift ;;
    *) echo "알 수 없는 인자: $1"; exit 1 ;;
  esac
  shift
done

API_URL="${SYNAPSE_API_URL:-http://localhost:3011}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Synapse 로컬 E2E 스모크 테스트"
echo "════════════════════════════════════════════════════════════"

# ─── Node.js 버전 확인 ─────────────────────────────────────────
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo 0)
if [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
  echo "✗ Node.js 18+ 필요 (현재: $(node --version 2>/dev/null || echo '미설치'))"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# ─── claude CLI 확인 ──────────────────────────────────────────
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
if command -v "$CLAUDE_BIN" &>/dev/null; then
  CLAUDE_VERSION=$("$CLAUDE_BIN" --version 2>/dev/null || echo "버전 불명")
  echo "✓ claude CLI: $CLAUDE_VERSION"
else
  echo "⚠ claude CLI 미설치 ($CLAUDE_BIN) — 에이전트 실행은 실패하지만 API/Socket.IO 검증은 진행"
  echo "  설치: npm install -g @anthropic-ai/claude-code"
  SKIP_AGENT=1
fi

# ─── Docker Compose 기동 ──────────────────────────────────────
if [ "$SKIP_DOCKER" -eq 0 ]; then
  echo ""
  echo "▶ Docker Compose 기동 중 (db + redis + api)..."

  if ! command -v docker &>/dev/null; then
    echo "✗ docker 미설치 — --skip-docker 옵션으로 이미 실행 중인 API를 사용하거나 Docker를 설치하세요"
    exit 1
  fi

  cd "$ROOT_DIR"

  # CLAUDE_BIN 환경변수를 컨테이너에 전달 (claude CLI가 PATH에 있는 경우)
  CLAUDE_BIN_ABS=$(command -v "$CLAUDE_BIN" 2>/dev/null || echo "")

  # api + db + redis만 기동 (web은 불필요)
  CLAUDE_BIN="$CLAUDE_BIN_ABS" docker compose up -d db redis api 2>&1 | grep -E "Started|Healthy|Error|Warning" || true

  echo "  컨테이너 준비 대기 중..."

  # API 헬스 대기 (최대 60초)
  WAIT_MAX=60
  WAITED=0
  until curl -sf "$API_URL/agents/status" -o /dev/null 2>/dev/null; do
    if [ "$WAITED" -ge "$WAIT_MAX" ]; then
      echo "✗ API가 ${WAIT_MAX}초 내에 응답하지 않았습니다"
      echo "  로그 확인: docker compose logs api --tail 50"
      [ "$KEEP_DOCKER" -eq 0 ] && docker compose down 2>/dev/null || true
      exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    printf "."
  done
  echo ""
  echo "✓ API 준비 완료 (${WAITED}s 소요)"

  # 정리 트랩 — 스크립트 종료 시 컨테이너 내림
  if [ "$KEEP_DOCKER" -eq 0 ]; then
    trap 'echo ""; echo "▶ 컨테이너 정리 중..."; docker compose down 2>/dev/null || true' EXIT
  else
    echo "ℹ --keep 옵션: 컨테이너를 유지합니다 (수동 정리: docker compose down)"
  fi
fi

# ─── smoke-test.mjs 실행 ─────────────────────────────────────
echo ""
echo "▶ smoke-test.mjs 실행..."
echo ""

SMOKE_ARGS=""
[ "$SKIP_AGENT" -eq 1 ] && SMOKE_ARGS="$SMOKE_ARGS --skip-agent"

SYNAPSE_API_URL="$API_URL" SMOKE_TIMEOUT_S="$TIMEOUT_S" \
  node "$SCRIPT_DIR/smoke-test.mjs" $SMOKE_ARGS

EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✓ E2E 스모크 테스트 통과"
else
  echo "✗ E2E 스모크 테스트 실패 (exit $EXIT_CODE)"
  [ "$SKIP_DOCKER" -eq 0 ] && [ "$KEEP_DOCKER" -eq 0 ] && \
    echo "  로그 확인: docker compose logs api --tail 100"
fi

exit "$EXIT_CODE"
