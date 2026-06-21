const backendUrl = process.env.ADMIN_BACKEND_URL || 'http://127.0.0.1:4180';
const synapseUrl = process.env.SYNAPSE_ADMIN_API_BASE_URL || 'http://127.0.0.1:8008';
const adminToken = process.env.ADMIN_BACKEND_TOKEN || 'demo-admin-token';
const appToken = process.env.APP_DEMO_TOKEN || 'demo-app-token';
const writeEnabled = process.env.SYNAPSE_SMOKE_WRITE === '1';
const tempUserId = process.env.SYNAPSE_SMOKE_USER || `@smoke-${Date.now()}:localhost`;

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body.error || body.errcode || body.message || `${response.status} ${response.statusText}`;
    throw new Error(`${url} failed: ${message}`);
  }
  return body;
}

async function backend(path, options = {}) {
  return requestJson(`${backendUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function log(label) {
  console.log(`ok - ${label}`);
}

const versions = await requestJson(`${synapseUrl}/_matrix/client/versions`);
if (!Array.isArray(versions.versions)) throw new Error('Synapse versions response missing versions');
log('synapse client versions');

const health = await requestJson(`${backendUrl}/api/health`);
if (health.mode !== 'synapse') {
  throw new Error(`Admin Backend must run with ADMIN_BACKEND_MODE=synapse, got ${health.mode}`);
}
log('admin backend synapse mode');

const runtime = await backend('/api/admin/runtime-config');
const tokenCheck = runtime.data.checks.find((check) => check.key === 'synapse_token');
if (!tokenCheck || tokenCheck.status !== 'pass') throw new Error('runtime config does not confirm Synapse token');
log('runtime config');

const selfCheck = await backend('/api/admin/self-check');
if (selfCheck.data.summary.fail > 0) throw new Error('self-check has failed items');
log('self check');

await backend('/api/admin/users');
await backend('/api/admin/rooms');
await backend('/api/admin/reports');
await backend('/api/admin/stats');
await backend('/api/admin/system-status');
await backend('/api/admin/registration-tokens');
log('admin read endpoints');

await requestJson(`${backendUrl}/api/app/config`, {
  headers: { authorization: `Bearer ${appToken}` },
});
await requestJson(`${backendUrl}/api/app/conversations`, {
  headers: { authorization: `Bearer ${appToken}` },
});
log('app read endpoints');

if (writeEnabled) {
  await backend('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      userId: tempUserId,
      displayName: 'Synapse Smoke User',
      password: `Smoke-${Date.now()}`,
    }),
  });
  await backend(`/api/admin/users/${encodeURIComponent(tempUserId)}`);
  await backend(`/api/admin/users/${encodeURIComponent(tempUserId)}`, { method: 'DELETE' });
  log('optional temporary user lifecycle');
} else {
  console.log('skip - write checks disabled; set SYNAPSE_SMOKE_WRITE=1 to create and deactivate a temp user');
}

console.log('synapse smoke test passed');
