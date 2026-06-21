#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/server/.env"
NODE_BIN="${NODE_BIN:-node}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "server/.env not found. Run server/scripts/init-local.sh first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${SYNAPSE_ADMIN_TOKEN:-}" ]]; then
  echo "SYNAPSE_ADMIN_TOKEN is empty. Run server/scripts/create-admin-token.sh first." >&2
  exit 1
fi

cd "$ROOT_DIR"

ADMIN_BACKEND_MODE=synapse \
ADMIN_BACKEND_PORT="${ADMIN_BACKEND_PORT:-4180}" \
SYNAPSE_ADMIN_API_BASE_URL="${SYNAPSE_ADMIN_API_BASE_URL:-http://127.0.0.1:8008}" \
SYNAPSE_ADMIN_TOKEN="$SYNAPSE_ADMIN_TOKEN" \
ADMIN_OWNER_USERNAME="${ADMIN_OWNER_USERNAME:-admin}" \
ADMIN_OWNER_PASSWORD="${ADMIN_OWNER_PASSWORD:-admin123}" \
ADMIN_OWNER_TOKEN="${ADMIN_OWNER_TOKEN:-demo-admin-token}" \
ADMIN_OPERATOR_USERNAME="${ADMIN_OPERATOR_USERNAME:-operator}" \
ADMIN_OPERATOR_PASSWORD="${ADMIN_OPERATOR_PASSWORD:-ops123}" \
ADMIN_OPERATOR_TOKEN="${ADMIN_OPERATOR_TOKEN:-demo-operator-token}" \
ADMIN_AUDITOR_USERNAME="${ADMIN_AUDITOR_USERNAME:-auditor}" \
ADMIN_AUDITOR_PASSWORD="${ADMIN_AUDITOR_PASSWORD:-audit123}" \
ADMIN_AUDITOR_TOKEN="${ADMIN_AUDITOR_TOKEN:-demo-auditor-token}" \
APP_DEMO_TOKEN="${APP_DEMO_TOKEN:-demo-app-token}" \
"$NODE_BIN" admin/backend/server.mjs
