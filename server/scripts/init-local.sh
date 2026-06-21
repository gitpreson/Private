#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
  echo "created server/.env"
else
  echo "server/.env already exists"
fi

if [[ ! -f "$SERVER_DIR/synapse/homeserver.yaml" ]]; then
  cp "$SERVER_DIR/synapse/homeserver.yaml.example" "$SERVER_DIR/synapse/homeserver.yaml"
  echo "created server/synapse/homeserver.yaml"
else
  echo "server/synapse/homeserver.yaml already exists"
fi

mkdir -p "$ROOT_DIR/work/runtime"
echo "local server config is ready"
