import http from 'node:http';

const baseUrl = process.env.ADMIN_BACKEND_URL || 'http://127.0.0.1:4180';
const adminToken = process.env.ADMIN_OWNER_TOKEN || 'demo-admin-token';
const operatorToken = process.env.ADMIN_OPERATOR_TOKEN || 'demo-operator-token';
const auditorToken = process.env.ADMIN_AUDITOR_TOKEN || 'demo-auditor-token';
const appToken = process.env.APP_DEMO_TOKEN || 'demo-app-token';
const adminUsername = process.env.ADMIN_OWNER_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_OWNER_PASSWORD || 'admin123';
const auditorUsername = process.env.ADMIN_AUDITOR_USERNAME || 'auditor';
const auditorPassword = process.env.ADMIN_AUDITOR_PASSWORD || 'audit123';
const stamp = Date.now().toString().slice(-6);
const tempUserId = `@smoke${stamp}:localhost`;
const tempToken = `SMOKE${stamp}`;
const operatorTokenValue = `OPS${stamp}`;

async function request(path, options = {}) {
  const { status, body } = await rawRequest(path, options);
  if (status < 200 || status >= 300) throw new Error(`${options.method || 'GET'} ${path} -> ${status} ${JSON.stringify(body)}`);
  return body;
}

async function expectFailure(path, options = {}, expectedStatus = 403) {
  const { status, body } = await rawRequest(path, options);
  if (status !== expectedStatus) throw new Error(`Expected ${expectedStatus} for ${path}, got ${status}: ${JSON.stringify(body)}`);
}

function rawRequest(path, options = {}) {
  const url = new URL(path, baseUrl);
  const body = options.body || '';
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
      },
    }, (response) => {
      let raw = '';
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        resolve({ status: response.statusCode, body: raw ? JSON.parse(raw) : {} });
      });
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function log(step) {
  console.log(`ok - ${step}`);
}

async function main() {
  await request('/api/health');
  log('health');

  const admin = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: adminPassword }),
  });
  if (admin.role !== 'owner') throw new Error('admin role mismatch');
  const adminMe = await request('/api/admin/me', { token: adminToken });
  if (!adminMe.data.canWrite || adminMe.data.role !== 'owner') throw new Error('admin me mismatch');
  if (!adminMe.data.lastLoginAt) throw new Error('admin lastLoginAt missing');
  log('admin login');

  const auditor = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: auditorUsername, password: auditorPassword }),
  });
  if (auditor.role !== 'auditor') throw new Error('auditor role mismatch');
  const auditorMe = await request('/api/admin/me', { token: auditorToken });
  if (auditorMe.data.canWrite || auditorMe.data.role !== 'auditor') throw new Error('auditor me mismatch');
  log('auditor login');

  await request('/api/admin/users', { token: adminToken });
  const adminRooms = await request('/api/admin/rooms', { token: adminToken });
  const bulkRoomMedia = await request('/api/admin/rooms/bulk', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ action: 'quarantine-media', roomIds: [adminRooms.data[0].roomId] }),
  });
  if (bulkRoomMedia.data.count !== 1) throw new Error('bulk room media quarantine failed');
  const adminMedia = await request('/api/admin/media', { token: adminToken });
  if (adminMedia.data.length) {
    const bulkMedia = await request('/api/admin/media/bulk', {
      token: adminToken,
      method: 'POST',
      body: JSON.stringify({ action: 'quarantine', mediaIds: [adminMedia.data[0].mediaId] }),
    });
    if (bulkMedia.data.count !== 1) throw new Error('bulk media quarantine failed');
  }
  await request('/api/admin/reports', { token: adminToken });
  const overview = await request('/api/admin/overview', { token: adminToken });
  if (typeof overview.data.risk?.score !== 'number' || !Array.isArray(overview.data.reports)) throw new Error('overview malformed');
  const search = await request('/api/admin/search?q=alice', { token: adminToken });
  if (!search.data.some((item) => item.type === '用户')) throw new Error('global search missing user result');
  await request('/api/admin/stats', { token: adminToken });
  await request('/api/admin/system-status', { token: adminToken });
  await request('/api/admin/runtime-config', { token: adminToken });
  const deployEnv = await request('/api/admin/deploy-env', { token: adminToken });
  if (!deployEnv.data.summary || !Array.isArray(deployEnv.data.items)) throw new Error('deploy env malformed');
  const storage = await request('/api/admin/storage-status', { token: adminToken });
  if (typeof storage.data.sizeKb !== 'number') throw new Error('storage status missing sizeKb');
  const authStatus = await request('/api/admin/auth-status', { token: adminToken });
  if (typeof authStatus.data.lockedAccounts !== 'number') throw new Error('auth status missing lockedAccounts');
  const operationJobs = await request('/api/admin/operation-jobs', { token: adminToken });
  if (!Array.isArray(operationJobs.data)) throw new Error('operation jobs should be an array');
  const selfCheck = await request('/api/admin/self-check', { token: adminToken });
  if (typeof selfCheck.data.ok !== 'boolean') throw new Error('self check missing ok');
  if (!selfCheck.data.summary || !Array.isArray(selfCheck.data.items)) throw new Error('self check malformed');
  const readiness = await request('/api/admin/readiness', { token: adminToken });
  if (!readiness.data.summary || typeof readiness.data.canDemo !== 'boolean') throw new Error('readiness malformed');
  const coverage = await request('/api/admin/feature-coverage', { token: adminToken });
  if (!coverage.data.summary || !Array.isArray(coverage.data.modules)) throw new Error('feature coverage malformed');
  const coverageExport = await request('/api/admin/feature-coverage/export?format=markdown', { token: adminToken });
  if (typeof coverageExport.data !== 'string' || !coverageExport.data.includes('功能说明书')) throw new Error('feature coverage export malformed');
  const releaseReport = await request('/api/admin/release-report?format=markdown', { token: adminToken });
  if (typeof releaseReport.data !== 'string' || !releaseReport.data.includes('发布交付报告')) throw new Error('release report malformed');
  const generatedSecrets = await request('/api/admin/secrets/generate', { token: adminToken, method: 'POST' });
  if (!generatedSecrets.data.env.includes('ADMIN_OWNER_TOKEN=')) throw new Error('secret generation malformed');
  log('admin read APIs');

  await expectFailure('/api/admin/users', {
    token: auditorToken,
    method: 'POST',
    body: JSON.stringify({ userId: tempUserId, displayName: 'Blocked Smoke' }),
  });
  await expectFailure('/api/admin/auth-status/cleanup', {
    token: auditorToken,
    method: 'POST',
  });
  log('auditor write blocked');

  await request('/api/admin/registration-tokens', {
    token: operatorToken,
    method: 'POST',
    body: JSON.stringify({ token: operatorTokenValue, usageLimit: 1 }),
  });
  const operatorAudit = await request(`/api/admin/audit-logs?keyword=${operatorTokenValue}&limit=5`, { token: adminToken });
  if (!operatorAudit.data.some((entry) => entry.actor === 'operator')) throw new Error('operator audit actor missing');
  await request(`/api/admin/registration-tokens/${encodeURIComponent(operatorTokenValue)}`, {
    token: operatorToken,
    method: 'DELETE',
  });
  log('operator audit actor');

  await request('/api/admin/users', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ userId: tempUserId, displayName: 'Smoke User', password: 'ChangeMe123' }),
  });
  const bulkBan = await request('/api/admin/users/bulk', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ action: 'ban', userIds: [tempUserId] }),
  });
  if (bulkBan.data.count !== 1) throw new Error('bulk ban failed');
  const bulkUnban = await request('/api/admin/users/bulk', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ action: 'unban', userIds: [tempUserId] }),
  });
  if (bulkUnban.data.count !== 1) throw new Error('bulk unban failed');
  await request('/api/admin/users/bulk', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ action: 'logout', userIds: [tempUserId] }),
  });
  await request(`/api/admin/users/${encodeURIComponent(tempUserId)}`, { token: adminToken });
  await request(`/api/admin/users/${encodeURIComponent(tempUserId)}/password`, {
    token: adminToken,
    method: 'PATCH',
    body: JSON.stringify({ password: 'NewPass123' }),
  });
  log('temporary user lifecycle start');

  await request('/api/admin/registration-tokens', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ token: tempToken, usageLimit: 2 }),
  });
  const tokenList = await request('/api/admin/registration-tokens', { token: adminToken });
  const createdToken = tokenList.data.find((item) => item.token === tempToken);
  if (typeof createdToken.remaining !== 'number' || typeof createdToken.usagePercent !== 'number') throw new Error('registration token usage fields missing');
  const registered = await request('/api/app/register', {
    method: 'POST',
    body: JSON.stringify({ username: `smokeapp${stamp}`, displayName: 'Smoke App', inviteCode: tempToken }),
  });
  if (!registered.token) throw new Error('registration did not return token');
  log('registration token and app register');

  await request('/api/app/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice', password: 'demo123' }),
  });
  await request('/api/app/me', { token: appToken });
  await request('/api/app/me', {
    token: appToken,
    method: 'PUT',
    body: JSON.stringify({ displayName: 'Alice Smoke', status: 'busy' }),
  });
  await request('/api/app/me', {
    token: appToken,
    method: 'PUT',
    body: JSON.stringify({ displayName: 'Alice Chen', status: 'online' }),
  });
  await expectFailure('/api/app/me/password', {
    token: appToken,
    method: 'PUT',
    body: JSON.stringify({ password: '123' }),
  }, 400);
  await request('/api/app/me/password', {
    token: appToken,
    method: 'PUT',
    body: JSON.stringify({ password: 'demo123' }),
  });
  await request('/api/app/config', { token: appToken });
  await request('/api/app/preferences', { token: appToken });
  await request('/api/app/contacts', { token: appToken });
  const appFiles = await request('/api/app/files', { token: appToken });
  if (!appFiles.data.length) throw new Error('app files missing');
  const fileReport = await request(`/api/app/files/${encodeURIComponent(appFiles.data[0].mediaId)}/report`, {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ reason: 'smoke file report' }),
  });
  if (!fileReport.data.mediaId) throw new Error('file report missing media id');
  await request('/api/app/devices', { token: appToken });
  const conversation = await request('/api/app/conversations', {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ userId: tempUserId }),
  });
  await request(`/api/app/conversations/${encodeURIComponent(conversation.data.roomId)}`, {
    token: appToken,
    method: 'PATCH',
    body: JSON.stringify({ pinned: true, muted: true }),
  });
  await request(`/api/app/conversations/${encodeURIComponent(conversation.data.roomId)}`, {
    token: appToken,
    method: 'PATCH',
    body: JSON.stringify({ pinned: false, muted: false }),
  });
  await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}`, { token: appToken });
  const sentMessage = await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages`, {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ content: 'smoke message' }),
  });
  await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages/${encodeURIComponent(sentMessage.data.messageId)}`, {
    token: appToken,
    method: 'PATCH',
    body: JSON.stringify({ content: 'smoke message edited' }),
  });
  await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages/${encodeURIComponent(sentMessage.data.messageId)}`, {
    token: appToken,
    method: 'DELETE',
  });
  const messages = await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages`, { token: appToken });
  const reportTarget = messages.data.find((message) => message.sender !== '我' && !message.deleted);
  const replyMessage = await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages`, {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({
      content: 'smoke reply',
      replyTo: {
        messageId: reportTarget.messageId,
        sender: reportTarget.sender,
        content: reportTarget.content,
      },
    }),
  });
  if (replyMessage.data.replyTo?.messageId !== reportTarget.messageId) throw new Error('message reply missing');
  await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/messages/${encodeURIComponent(reportTarget.messageId)}/report`, {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ reason: 'smoke report' }),
  });
  const updatedReports = await request('/api/admin/reports', { token: adminToken });
  if (!updatedReports.data.some((report) => report.title === 'smoke report')) throw new Error('message report missing');
  const smokeReport = updatedReports.data.find((report) => report.title === 'smoke report');
  const bulkHandled = await request('/api/admin/reports/bulk-handle', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ reportIds: [smokeReport.reportId], actions: ['resolve', 'ban-user', 'quarantine-user-media'] }),
  });
  if (bulkHandled.data.count !== 1) throw new Error('bulk report handling failed');
  log('bulk report handling');
  const group = await request('/api/app/group-conversations', {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ name: `Smoke Group ${stamp}`, userIds: ['@ops:localhost', tempUserId] }),
  });
  await request(`/api/app/rooms/${encodeURIComponent(group.data.roomId)}`, { token: appToken });
  await request(`/api/app/rooms/${encodeURIComponent(group.data.roomId)}/members`, {
    token: appToken,
    method: 'POST',
    body: JSON.stringify({ userIds: [registered.userId] }),
  });
  await request(`/api/app/rooms/${encodeURIComponent(group.data.roomId)}/members/${encodeURIComponent(registered.userId)}`, {
    token: appToken,
    method: 'DELETE',
  });
  await request(`/api/app/conversations/${encodeURIComponent(group.data.roomId)}`, {
    token: appToken,
    method: 'PATCH',
    body: JSON.stringify({ archived: true }),
  });
  const archived = await request('/api/app/conversations?archived=true', { token: appToken });
  if (!archived.data.some((item) => item.roomId === group.data.roomId)) throw new Error('archived conversation missing');
  await request(`/api/app/conversations/${encodeURIComponent(group.data.roomId)}`, {
    token: appToken,
    method: 'PATCH',
    body: JSON.stringify({ archived: false }),
  });
  log('app APIs');

  await request('/api/admin/notices/bulk', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify({ userIds: ['@alice:localhost'], content: 'smoke notice' }),
  });
  const audit = await request('/api/admin/audit-logs?keyword=smoke', { token: adminToken });
  if (!Array.isArray(audit.data)) throw new Error('audit logs should be an array');
  if (audit.data.length && !audit.data[0].raw) throw new Error('audit log missing raw field');
  const adminAudit = await request('/api/admin/audit-logs?actor=admin&module=admin&limit=20', { token: adminToken });
  if (!Array.isArray(adminAudit.data)) throw new Error('filtered audit logs should be an array');
  const auditExport = await request('/api/admin/audit-logs?format=jsonl&limit=5', { token: adminToken });
  if (typeof auditExport.data !== 'string') throw new Error('audit export should be a string');
  log('notice and audit');

  const backup = await request('/api/admin/backup', { token: adminToken });
  if (!backup.data?.data?.users?.length) throw new Error('backup missing users');
  await request('/api/admin/backup/import', {
    token: adminToken,
    method: 'POST',
    body: JSON.stringify(backup.data),
  });
  const jobsAfterBackup = await request('/api/admin/operation-jobs', { token: adminToken });
  if (!jobsAfterBackup.data.some((job) => job.type === 'backup-import')) throw new Error('backup job missing');
  log('backup export/import');

  await request(`/api/app/rooms/${encodeURIComponent(conversation.data.roomId)}/leave`, {
    token: appToken,
    method: 'POST',
  });
  await request(`/api/app/rooms/${encodeURIComponent(group.data.roomId)}/leave`, {
    token: appToken,
    method: 'POST',
  });
  await request(`/api/admin/registration-tokens/${encodeURIComponent(tempToken)}`, {
    token: adminToken,
    method: 'DELETE',
  });
  await request(`/api/admin/users/${encodeURIComponent(tempUserId)}`, {
    token: adminToken,
    method: 'DELETE',
  });
  await request(`/api/admin/users/${encodeURIComponent(registered.userId)}`, {
    token: adminToken,
    method: 'DELETE',
  });
  log('cleanup');

  console.log('smoke test passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
