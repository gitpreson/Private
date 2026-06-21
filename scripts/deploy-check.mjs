import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'server/docker-compose.yml',
  'server/.env.example',
  'server/synapse/homeserver.yaml.example',
  'server/nginx/conf.d/im.conf',
  'server/coturn/turnserver.conf',
  'server/scripts/init-local.sh',
  'server/scripts/up-local.sh',
  'server/scripts/create-admin-token.sh',
  'server/scripts/run-admin-synapse.sh',
  'scripts/app-check.mjs',
  'scripts/admin-production-check.mjs',
  'admin/db/schema.sql',
  'admin/backend/server.mjs',
];

function pass(message) {
  console.log(`ok - ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function readProjectFile(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function parseEnv(text) {
  return Object.fromEntries(text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
}

function assertContains(text, needle, label) {
  if (!text.includes(needle)) fail(`${label} missing ${needle}`);
}

async function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) fail(`missing ${file}`);
}
pass('deployment files exist');

const env = parseEnv(readProjectFile('server/.env.example'));
for (const key of [
  'SERVER_NAME',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'SYNAPSE_PUBLIC_BASE_URL',
  'MATRIX_ADMIN_USERNAME',
  'MATRIX_ADMIN_PASSWORD',
  'ADMIN_BACKEND_MODE',
  'ADMIN_BACKEND_PORT',
  'ADMIN_OWNER_USERNAME',
  'ADMIN_OWNER_PASSWORD',
  'ADMIN_OWNER_TOKEN',
  'ADMIN_OPERATOR_USERNAME',
  'ADMIN_OPERATOR_PASSWORD',
  'ADMIN_OPERATOR_TOKEN',
  'ADMIN_AUDITOR_USERNAME',
  'ADMIN_AUDITOR_PASSWORD',
  'ADMIN_AUDITOR_TOKEN',
  'APP_DEMO_TOKEN',
]) {
  if (!env[key]) fail(`server/.env.example missing ${key}`);
}
pass('environment template has required keys');

const compose = readProjectFile('server/docker-compose.yml');
for (const service of ['postgres:', 'redis:', 'synapse:', 'admin-backend:', 'coturn:', 'nginx:']) {
  assertContains(compose, service, 'docker-compose.yml');
}
for (const health of ['pg_isready', 'redis-cli', '_matrix/client/versions', '/api/health']) {
  assertContains(compose, health, 'docker-compose.yml healthcheck');
}
pass('compose services and healthchecks present');

const homeserver = readProjectFile('server/synapse/homeserver.yaml.example');
for (const value of [
  'server_name: "localhost"',
  'signing_key_path:',
  'macaroon_secret_key:',
  'form_secret:',
  `password: ${env.POSTGRES_PASSWORD}`,
  'host: postgres',
  'redis:',
  'media_store_path: /media',
  'enable_registration: false',
]) {
  assertContains(homeserver, value, 'homeserver.yaml.example');
}
pass('synapse example config matches local topology');

for (const script of ['init-local.sh', 'up-local.sh', 'create-admin-token.sh', 'run-admin-synapse.sh']) {
  const content = readProjectFile(`server/scripts/${script}`);
  assertContains(content, '#!/usr/bin/env bash', script);
  assertContains(content, 'set -euo pipefail', script);
}
pass('server helper scripts present');

const nginx = readProjectFile('server/nginx/conf.d/im.conf');
for (const value of ['proxy_pass http://synapse:8008', '/.well-known/matrix/server', '/.well-known/matrix/client']) {
  assertContains(nginx, value, 'nginx config');
}
pass('nginx matrix routes present');

const adminPort = Number(env.ADMIN_BACKEND_PORT);
if (!Number.isInteger(adminPort) || adminPort <= 0) fail('ADMIN_BACKEND_PORT must be a valid port');
const free = await isPortFree(adminPort);
console.log(`${free ? 'ok' : 'warn'} - local port ${adminPort} ${free ? 'is currently free' : 'is already in use'}`);

console.log('deploy check passed');
