#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/server/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "server/.env not found. Run server/scripts/init-local.sh first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

MATRIX_ADMIN_USERNAME="${MATRIX_ADMIN_USERNAME:-admin}"
MATRIX_ADMIN_PASSWORD="${MATRIX_ADMIN_PASSWORD:-change-this-password}"
SYNAPSE_URL="${SYNAPSE_PUBLIC_BASE_URL:-http://127.0.0.1:8008}"

cd "$ROOT_DIR/server"

docker compose --env-file .env exec synapse register_new_matrix_user \
  -c /data/homeserver.yaml \
  -u "$MATRIX_ADMIN_USERNAME" \
  -p "$MATRIX_ADMIN_PASSWORD" \
  -a \
  "http://localhost:8008" || true

TOKEN_RESPONSE="$(curl -sS "$SYNAPSE_URL/_matrix/client/v3/login" \
  -H 'content-type: application/json' \
  -d "{\"type\":\"m.login.password\",\"identifier\":{\"type\":\"m.id.user\",\"user\":\"$MATRIX_ADMIN_USERNAME\"},\"password\":\"$MATRIX_ADMIN_PASSWORD\"}")"

ACCESS_TOKEN="$(TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e "const body=JSON.parse(process.env.TOKEN_RESPONSE); if (!body.access_token) { console.error(JSON.stringify(body)); process.exit(1); } console.log(body.access_token);")"

echo
echo "Synapse admin access token:"
echo "$ACCESS_TOKEN"
echo
echo "Add this to server/.env:"
echo "SYNAPSE_ADMIN_TOKEN=$ACCESS_TOKEN"
