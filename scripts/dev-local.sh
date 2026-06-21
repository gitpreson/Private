#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-node}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

"$NODE_BIN" admin/backend/server.mjs &
BACKEND_PID=$!

"$PYTHON_BIN" -m http.server 4173 &
WEB_PID=$!

echo "Admin Backend: http://127.0.0.1:4180/api/health"
echo "Preview:       http://127.0.0.1:4173/preview.html"
echo "Admin Web:     http://127.0.0.1:4173/admin/web/"
echo "App Preview:   http://127.0.0.1:4173/app-preview/"
echo "Mock DB:       ${MOCK_DB_PATH:-work/runtime/mock-db.json}"
echo
echo "Press Ctrl+C to stop."

wait
