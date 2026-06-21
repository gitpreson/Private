import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function fail(message) {
  throw new Error(message);
}

function pass(message) {
  console.log(`ok - ${message}`);
}

for (const file of ['admin/db/schema.sql', 'admin/db/README.md', 'admin/README.md', 'admin/backend/README.md']) {
  if (!existsSync(resolve(root, file))) fail(`missing ${file}`);
}
pass('admin production files exist');

const schema = read('admin/db/schema.sql');
for (const table of [
  'admin_roles',
  'admin_accounts',
  'admin_sessions',
  'audit_logs',
  'app_config',
  'registration_tokens',
  'operation_jobs',
]) {
  if (!schema.includes(`create table if not exists ${table}`)) fail(`schema missing ${table}`);
}
pass('admin database tables present');

for (const index of ['audit_logs_created_at_idx', 'audit_logs_actor_idx', 'operation_jobs_status_idx']) {
  if (!schema.includes(index)) fail(`schema missing index ${index}`);
}
pass('admin database indexes present');

for (const snippet of ['password_hash', 'token_hash', 'metadata jsonb', 'created_at timestamptz']) {
  if (!schema.includes(snippet)) fail(`schema missing ${snippet}`);
}
pass('security and audit columns present');

const readme = read('admin/db/README.md');
for (const snippet of ['ADMIN_DATABASE_URL', 'Migration Path From Demo', 'Argon2/bcrypt', 'audit_logs']) {
  if (!readme.includes(snippet)) fail(`admin db README missing ${snippet}`);
}
pass('admin database README covers migration');

console.log('admin production check passed');
