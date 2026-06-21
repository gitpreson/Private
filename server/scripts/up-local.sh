#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT_DIR/server/scripts/init-local.sh"

cd "$ROOT_DIR/server"
docker compose --env-file .env up -d postgres redis synapse

echo "Synapse starting at http://127.0.0.1:8008"
echo "Check: curl http://127.0.0.1:8008/_matrix/client/versions"
