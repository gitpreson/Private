const toast = document.querySelector('.toast');
const modal = document.querySelector('.modal');
const modalTitle = document.querySelector('#modal-title');
const modalBody = document.querySelector('.modal-body');
const apiBaseUrl = 'http://127.0.0.1:4180';
const tokenKey = 'private-im-admin-token';
const roleKey = 'private-im-admin-role';
const usernameKey = 'private-im-admin-username';
const noticeTemplates = {
  maintenance: '系统将于今晚 23:00-23:30 进行维护演练，期间可能出现短暂连接波动，请提前保存重要内容。',
  risk: '检测到你的账号存在异常操作风险，请及时检查登录设备并修改密码。如非本人操作，请联系管理员。',
  terms: '服务条款与隐私说明已更新，请在设置中查看最新版本。继续使用即表示你已了解相关变更。',
};

function userStatus(user) {
  return user.disabled ? '<b class="pill danger">禁用</b>' : '<b class="pill ok">正常</b>';
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(localStorage.getItem(tokenKey) ? { authorization: `Bearer ${localStorage.getItem(tokenKey)}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function setLoggedIn(isLoggedIn) {
  document.querySelector('[data-login-screen]').classList.toggle('hidden', isLoggedIn);
  document.querySelector('.admin-shell').classList.toggle('locked', !isLoggedIn);
  renderAdminSession();
  applyRoleState();
}

function canWrite() {
  return ['owner', 'admin'].includes(localStorage.getItem(roleKey));
}

function renderAdminSession(session = null) {
  const target = document.querySelector('[data-admin-session]');
  if (!target) return;
  const username = session?.username || localStorage.getItem(usernameKey) || '未登录';
  const role = session?.role || localStorage.getItem(roleKey) || '-';
  const loginAt = session?.lastLoginAt ? new Date(session.lastLoginAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
  target.innerHTML = `<span>${username}</span><strong>${role}${session?.canWrite === false ? ' · 只读' : ''}${loginAt ? ` · ${loginAt}` : ''}</strong>`;
}

async function refreshAdminSession() {
  const payload = await api('/api/admin/me');
  localStorage.setItem(usernameKey, payload.data.username);
  localStorage.setItem(roleKey, payload.data.role);
  renderAdminSession(payload.data);
  applyRoleState();
  return payload.data;
}

function isWriteAction(action) {
  return new Set([
    'new-user',
    'ban',
    'unban',
    'change-password',
    'toggle-admin',
    'force-logout',
    'delete-user',
    'bulk-ban-users',
    'bulk-unban-users',
    'bulk-logout-users',
    'bulk-close-rooms',
    'bulk-quarantine-room-media',
    'close-room',
    'make-room-admin',
    'quarantine',
    'delete-media',
    'bulk-quarantine-media',
    'bulk-delete-media',
    'quarantine-scope',
    'cleanup-media',
    'resolve-report',
    'handle-report',
    'send-notice',
    'purge-room',
    'reset-demo',
    'import-backup',
    'cleanup-auth-locks',
    'generate-secrets',
    'disable-token',
    'enable-token',
    'delete-token',
  ]).has(action);
}

function applyRoleState() {
  const readonly = Boolean(localStorage.getItem(tokenKey)) && !canWrite();
  document.querySelectorAll('[data-action]').forEach((button) => {
    if (isWriteAction(button.dataset.action)) {
      button.classList.toggle('readonly-action', readonly);
    }
  });
}

function renderUsers(users) {
  const body = document.querySelector('[data-users-body]');
  body.innerHTML = users.map((user) => `
    <tr data-user-id="${user.userId}" data-disabled="${user.disabled}">
      <td><input type="checkbox" data-user-select value="${user.userId}"></td>
      <td><strong>${user.userId}</strong><span>${user.displayName}</span></td>
      <td>${userStatus(user)}</td>
      <td>${user.devices}</td>
      <td>${user.rooms}</td>
      <td>${user.lastSeen}</td>
      <td>
        <button class="link-btn" data-action="user-detail">详情</button>
        <button class="link-btn" data-action="${user.disabled ? 'unban' : 'ban'}">${user.disabled ? '解封' : '禁用'}</button>
      </td>
    </tr>
  `).join('');
  applyRoleState();
}

function selectedUserIds() {
  return Array.from(document.querySelectorAll('[data-user-select]:checked')).map((input) => input.value);
}

function runBulkUserAction(action) {
  const userIds = selectedUserIds();
  if (!userIds.length) {
    showToast('请先选择用户');
    return;
  }
  const label = action === 'ban' ? '禁用' : action === 'unban' ? '解封' : '踢下线';
  api('/api/admin/users/bulk', {
    method: 'POST',
    body: JSON.stringify({ action, userIds }),
  })
    .then((payload) => loadDashboardData().then(() => showToast(`已批量${label} ${payload.data.count} 个用户`)))
    .catch(() => showToast(`批量${label}失败`));
}

function selectedRoomIds() {
  return Array.from(document.querySelectorAll('[data-room-select]:checked')).map((input) => input.value);
}

function runBulkRoomAction(action) {
  const roomIds = selectedRoomIds();
  if (!roomIds.length) {
    showToast('请先选择群聊');
    return;
  }
  const label = action === 'close' ? '解散群聊' : '隔离群媒体';
  api('/api/admin/rooms/bulk', {
    method: 'POST',
    body: JSON.stringify({ action, roomIds }),
  })
    .then((payload) => loadDashboardData().then(() => showToast(`已批量${label} ${payload.data.count} 个`)))
    .catch(() => showToast(`批量${label}失败`));
}

function selectedMediaIds() {
  return Array.from(document.querySelectorAll('[data-media-select]:checked')).map((input) => input.value);
}

function runBulkMediaAction(action) {
  const mediaIds = selectedMediaIds();
  if (!mediaIds.length) {
    showToast('请先选择媒体');
    return;
  }
  const label = action === 'delete' ? '删除媒体' : '隔离媒体';
  api('/api/admin/media/bulk', {
    method: 'POST',
    body: JSON.stringify({ action, mediaIds }),
  })
    .then((payload) => loadDashboardData().then(() => showToast(`已批量${label} ${payload.data.count} 个`)))
    .catch(() => showToast(`批量${label}失败`));
}

function renderRooms(rooms) {
  document.querySelector('[data-rooms-list]').innerHTML = rooms.map((room, index) => `
    <div class="list-row" data-room-id="${room.roomId || room.name}">
      <input type="checkbox" data-room-select value="${room.roomId || room.name}">
      <div>
        <strong>${room.name}</strong>
        <span>${room.members} 成员 · ${room.encrypted ? 'E2EE' : room.status}</span>
      </div>
      <button class="small-btn ${index === 2 ? 'danger' : ''}" data-action="${index === 2 ? 'close-room' : 'room-detail'}">${index === 2 ? '解散' : '查看'}</button>
    </div>
  `).join('');
  applyRoleState();
}

function renderMedia(media) {
  document.querySelector('[data-media-list]').innerHTML = media.map((item, index) => `
    <div class="media-row" data-media-id="${item.mediaId || item.name}">
      <input type="checkbox" data-media-select value="${item.mediaId || item.name}">
      <span>${item.type}</span>
      <div>
        <strong>${item.name}</strong>
        <p>${item.owner} · ${item.size}${item.createdAt ? ` · ${item.createdAt}` : ''}${item.quarantined ? ' · 已隔离' : ''}</p>
      </div>
      <button class="small-btn ${index === 1 ? 'danger' : ''}" data-action="${index === 1 ? 'delete-media' : 'quarantine'}">${index === 1 ? '删除' : '隔离'}</button>
    </div>
  `).join('');
  applyRoleState();
}

async function reloadMedia(filter = '') {
  const query = filter.startsWith('@')
    ? `?userId=${encodeURIComponent(filter)}`
    : filter.startsWith('!')
      ? `?roomId=${encodeURIComponent(filter)}`
      : '';
  const media = await api(`/api/admin/media${query}`);
  renderMedia(media.data);
}

function renderReports(reports) {
  document.querySelector('[data-reports-list]').innerHTML = reports.map((report) => `
    <div class="report ${report.level === '高' ? 'urgent' : ''}" data-report-id="${report.reportId || report.title}">
      <span>${report.level}</span>
      <div>
        <strong>${report.title}</strong>
        <p>${report.summary}</p>
      </div>
      <button class="small-btn ${report.level === '高' ? 'danger' : ''}" data-action="${report.level === '高' ? 'resolve-report' : 'report-detail'}">${report.level === '高' ? '处理' : '查看'}</button>
    </div>
  `).join('');
  applyRoleState();
}

async function loadDashboardData() {
  try {
    const [users, rooms, media, reports, config, stats, status, tokens, runtime, deployEnv, storage, authStatus, selfCheck, readiness, coverage, jobs, overview] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/rooms'),
      api('/api/admin/media'),
      api('/api/admin/reports'),
      api('/api/admin/app-config'),
      api('/api/admin/stats'),
      api('/api/admin/system-status'),
      api('/api/admin/registration-tokens'),
      api('/api/admin/runtime-config'),
      api('/api/admin/deploy-env'),
      api('/api/admin/storage-status'),
      api('/api/admin/auth-status'),
      api('/api/admin/self-check'),
      api('/api/admin/readiness'),
      api('/api/admin/feature-coverage'),
      api('/api/admin/operation-jobs'),
      api('/api/admin/overview'),
    ]);
    renderUsers(users.data);
    renderRooms(rooms.data);
    renderMedia(media.data);
    renderReports(reports.data);
    renderAppConfig(config.data);
    renderStats(stats.data);
    renderSystemStatus(status.data);
    renderTokens(tokens.data);
    renderRuntimeConfig(runtime.data);
    renderDeployEnv(deployEnv.data);
    renderStorageStatus(storage.data);
    renderAuthStatus(authStatus.data);
    renderSelfCheck(selfCheck.data);
    renderReadiness(readiness.data);
    renderFeatureCoverage(coverage.data);
    renderOperationJobs(jobs.data);
    renderOverview(overview.data);
    showToast('已连接本地 Admin Backend');
  } catch (error) {
    showToast('Admin Backend 未启动，使用静态演示数据');
  }
}

function renderTokens(tokens) {
  const list = document.querySelector('[data-token-list]');
  list.innerHTML = tokens.map((item) => `
    <div class="token-row" data-token="${item.token}">
      <div>
        <div class="token-title">
          <strong>${item.token}</strong>
          <b class="${item.disabled || item.remaining <= 0 ? 'token-bad' : 'token-good'}">${item.statusLabel || (item.disabled ? '已禁用' : '可用')}</b>
        </div>
        <span>已用 ${item.used}/${item.usageLimit} · 剩余 ${item.remaining ?? Math.max(0, item.usageLimit - item.used)} 次 · ${item.createdAt || '-'}</span>
        <div class="token-progress"><i style="width:${item.usagePercent || 0}%"></i></div>
      </div>
      <div class="row-actions">
        <button class="small-btn ${item.disabled ? '' : 'danger'}" data-action="${item.disabled ? 'enable-token' : 'disable-token'}">${item.disabled ? '启用' : '禁用'}</button>
        <button class="small-btn danger" data-action="delete-token">删除</button>
      </div>
    </div>
  `).join('');
  applyRoleState();
}

function renderStats(stats) {
  Object.entries(stats).forEach(([key, value]) => {
    const target = document.querySelector(`[data-stat="${key}"]`);
    if (target) target.textContent = value;
  });
}

function renderOverview(overview) {
  const target = document.querySelector('[data-overview]');
  if (!target) return;
  const risk = overview.risk || {};
  target.innerHTML = `
    <div class="overview-score">
      <span>风险指数</span>
      <strong>${risk.score ?? 0}</strong>
      <p>举报 ${risk.reports || 0} · 禁用用户 ${risk.disabledUsers || 0} · 隔离媒体 ${risk.quarantinedMedia || 0}</p>
    </div>
    <div class="overview-block">
      <h3>高优先级</h3>
      ${(overview.reports || []).slice(0, 3).map((report) => `
        <a href="#reports"><strong>${report.level} · ${report.title}</strong><span>${report.detail}</span></a>
      `).join('') || '<p>暂无待处理风险</p>'}
    </div>
    <div class="overview-block">
      <h3>最近任务</h3>
      ${(overview.jobs || []).slice(0, 3).map((job) => `
        <a href="#maintenance"><strong>${job.title}</strong><span>${job.status} · ${job.detail}</span></a>
      `).join('') || '<p>暂无任务记录</p>'}
    </div>
    <div class="overview-block">
      <h3>警告</h3>
      ${(overview.warnings || []).map((warning) => `<p>${warning}</p>`).join('') || '<p>当前无关键警告</p>'}
    </div>
  `;
}

function renderGlobalSearchResults(results) {
  const target = document.querySelector('[data-global-search-results]');
  if (!target) return;
  target.innerHTML = results.map((item) => `
    <button class="global-result" type="button" data-target="${item.target}">
      <span>${item.type}</span>
      <div>
        <strong>${item.title}</strong>
        <p>${item.subtitle}</p>
      </div>
    </button>
  `).join('') || '<p>没有匹配结果</p>';
}

function renderSystemStatus(status) {
  Object.entries(status).forEach(([key, value]) => {
    const target = document.querySelector(`[data-status="${key}"]`);
    if (target) target.textContent = value;
  });
}

function renderRuntimeConfig(config) {
  const target = document.querySelector('[data-runtime-config]');
  target.innerHTML = `
    <div><span>后端端口</span><strong>${config.bindHost}:${config.port}</strong></div>
    <div><span>Mock 数据</span><strong>${config.mockDbPath}</strong></div>
    <div><span>Synapse</span><strong>${config.synapseBaseUrl}</strong></div>
    ${(config.checks || []).map((check) => `
      <div class="${check.status === 'fail' ? 'runtime-fail' : check.status === 'warn' ? 'runtime-warn' : ''}">
        <span>${check.label}</span><strong>${check.detail}</strong>
      </div>
    `).join('')}
  `;
}

function renderDeployEnv(env) {
  const target = document.querySelector('[data-deploy-env]');
  target.innerHTML = `
    <div class="deploy-head">
      <strong>部署环境变量</strong>
      <span>${env.readyForSynapseMode ? '可切 Synapse 模式' : `待处理 ${env.summary.missing + env.summary.default} 项`}</span>
    </div>
    ${(env.items || []).slice(0, 8).map((item) => `
      <div class="deploy-row ${item.status}">
        <span>${item.key}</span>
        <strong>${item.status === 'ready' ? '已设置' : item.status === 'default' ? '默认值' : '缺失'}</strong>
      </div>
    `).join('')}
  `;
}

function renderStorageStatus(storage) {
  const target = document.querySelector('[data-storage-status]');
  target.innerHTML = `
    <div><span>数据文件</span><strong>${storage.exists ? '已创建' : '未创建'}</strong></div>
    <div><span>文件大小</span><strong>${storage.sizeKb} KB</strong></div>
    <div><span>更新时间</span><strong>${storage.updatedAt ? new Date(storage.updatedAt).toLocaleString('zh-CN') : '-'}</strong></div>
    <div class="${storage.health === 'review' ? 'runtime-warn' : storage.health === 'missing' ? 'runtime-warn' : ''}">
      <span>维护建议</span><strong>${storage.recommendation}</strong>
    </div>
  `;
}

function renderAuthStatus(status) {
  const target = document.querySelector('[data-auth-status]');
  target.innerHTML = `
    <div><span>认证状态文件</span><strong>${status.path}</strong></div>
    <div><span>记录账号</span><strong>${status.accounts}</strong></div>
    <div class="${status.lockedAccounts ? 'runtime-warn' : ''}"><span>锁定账号</span><strong>${status.lockedAccounts}</strong></div>
    <div class="${status.failedAttempts ? 'runtime-warn' : ''}"><span>失败次数</span><strong>${status.failedAttempts}</strong></div>
    ${(status.admins || []).slice(0, 3).map((admin) => `
      <div class="${admin.locked ? 'runtime-fail' : admin.failedLoginCount ? 'runtime-warn' : ''}">
        <span>${admin.username}</span><strong>${admin.locked ? `锁定至 ${new Date(admin.lockedUntil).toLocaleTimeString('zh-CN')}` : `失败 ${admin.failedLoginCount} 次`}</strong>
      </div>
    `).join('')}
  `;
}

function renderSelfCheck(check) {
  const target = document.querySelector('[data-self-check]');
  target.innerHTML = `
    <div class="${check.ok ? '' : 'runtime-fail'}">
      <span>后台健康自检</span><strong>${check.ok ? '通过' : '需要处理'}</strong>
    </div>
    <div><span>通过</span><strong>${check.summary.pass}</strong></div>
    <div class="${check.summary.warn ? 'runtime-warn' : ''}"><span>警告</span><strong>${check.summary.warn}</strong></div>
    <div class="${check.summary.fail ? 'runtime-fail' : ''}"><span>失败</span><strong>${check.summary.fail}</strong></div>
    ${(check.items || []).map((item) => `
      <div class="${item.status === 'fail' ? 'runtime-fail' : item.status === 'warn' ? 'runtime-warn' : ''}">
        <span>${item.label}</span><strong>${item.detail}</strong>
      </div>
    `).join('')}
  `;
}

function renderReadiness(readiness) {
  const target = document.querySelector('[data-readiness]');
  target.innerHTML = `
    <div class="readiness-head">
      <div>
        <strong>上线准备度</strong>
        <span>${readiness.canProduction ? '可生产上线' : readiness.canDemo ? '可本地演示' : '存在阻断项'}</span>
      </div>
      <b class="${readiness.canProduction ? 'ready-ok' : readiness.canDemo ? 'ready-warn' : 'ready-block'}">${readiness.summary.ready}/${readiness.items.length}</b>
    </div>
    ${(readiness.items || []).map((item) => `
      <div class="readiness-row ${item.status}">
        <span>${item.label}</span>
        <strong>${item.status === 'ready' ? '通过' : item.status === 'warning' ? '警告' : '阻断'}</strong>
        <p>${item.detail}</p>
      </div>
    `).join('')}
  `;
}

function renderFeatureCoverage(coverage) {
  const target = document.querySelector('[data-feature-coverage]');
  target.innerHTML = `
    <div class="coverage-head">
      <strong>功能覆盖矩阵</strong>
      <span>MVP ${coverage.summary.mvp || 0} · App 骨架 ${coverage.summary.skeleton || 0}</span>
    </div>
    ${(coverage.modules || []).map((module) => `
      <div class="coverage-row">
        <div>
          <strong>${module.name}</strong>
          <span>${module.done.slice(0, 4).join('、')}${module.done.length > 4 ? '…' : ''}</span>
        </div>
        <b class="coverage-${module.status}">${module.status}</b>
        <p>下一步：${module.next[0] || '继续生产化'}</p>
      </div>
    `).join('')}
  `;
}

function renderOperationJobs(jobs) {
  const target = document.querySelector('[data-operation-jobs]');
  target.innerHTML = `
    <div class="jobs-head">
      <strong>运营任务</strong>
      <span>最近 ${jobs.length} 条</span>
    </div>
    ${jobs.map((job) => `
      <div class="job-row">
        <div>
          <strong>${job.title}</strong>
          <span>${job.detail}</span>
        </div>
        <div>
          <b class="${job.status === 'complete' ? 'job-ok' : 'job-warn'}">${job.status}</b>
          <span>${job.actor || 'system'} · ${job.createdAt ? new Date(job.createdAt).toLocaleString('zh-CN') : '-'}</span>
        </div>
      </div>
    `).join('') || '<div class="job-row"><span>暂无运营任务</span></div>'}
  `;
}

function renderAppConfig(config) {
  const form = document.querySelector('[data-app-config-form]');
  form.brandName.value = config.brandName;
  form.homeserverUrl.value = config.homeserverUrl;
  form.maxUploadMb.value = config.maxUploadMb;
  form.e2eeDefault.checked = config.e2eeDefault;
  form.registrationEnabled.checked = config.registrationEnabled;
  form.federationEnabled.checked = config.federationEnabled;
}

document.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const payload = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
      }),
    });
    localStorage.setItem(tokenKey, payload.token);
    localStorage.setItem(roleKey, payload.role);
    localStorage.setItem(usernameKey, payload.username);
    setLoggedIn(true);
    await refreshAdminSession();
    await loadDashboardData();
  } catch (error) {
    showToast('登录失败，请检查账号密码');
  }
});

document.querySelector('[data-app-config-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    brandName: form.brandName.value.trim(),
    homeserverUrl: form.homeserverUrl.value.trim(),
    maxUploadMb: Number(form.maxUploadMb.value),
    e2eeDefault: form.e2eeDefault.checked,
    registrationEnabled: form.registrationEnabled.checked,
    federationEnabled: form.federationEnabled.checked,
  };
  try {
    await api('/api/admin/app-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await loadDashboardData();
    showToast('客户端配置已保存');
  } catch (error) {
    showToast('保存配置失败');
  }
});

let globalSearchTimer = null;
document.querySelector('[data-global-search]').addEventListener('input', (event) => {
  const keyword = event.target.value.trim();
  window.clearTimeout(globalSearchTimer);
  if (!keyword) {
    renderGlobalSearchResults([]);
    return;
  }
  globalSearchTimer = window.setTimeout(() => {
    api(`/api/admin/search?q=${encodeURIComponent(keyword)}`)
      .then((payload) => renderGlobalSearchResults(payload.data))
      .catch(() => showToast('全局检索失败'));
  }, 220);
});

document.querySelector('[data-global-search-results]').addEventListener('click', (event) => {
  const result = event.target.closest('[data-target]');
  if (!result) return;
  document.querySelector(result.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('[data-user-select-all]').addEventListener('change', (event) => {
  document.querySelectorAll('[data-user-select]').forEach((input) => {
    input.checked = event.target.checked;
  });
});

document.querySelector('[data-token-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api('/api/admin/registration-tokens', {
      method: 'POST',
      body: JSON.stringify({
        token: form.token.value.trim(),
        usageLimit: Number(form.usageLimit.value),
      }),
    });
    await loadDashboardData();
    showToast('邀请码已创建');
  } catch (error) {
    showToast('创建邀请码失败');
  }
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.showModal();
  applyRoleState();
}

function renderAuditLines(lines) {
  const target = modal.querySelector('[data-audit-lines]');
  if (!target) return;
  target.innerHTML = lines.map((line) => {
    const entry = typeof line === 'string' ? { raw: line } : line;
    return `
      <div class="audit-line audit-card">
        <div>
          <strong>${entry.action || entry.raw || '-'}</strong>
          ${entry.target ? `<span>${entry.target}</span>` : ''}
        </div>
        <div>
          <b>${entry.actor || 'system'}</b>
          <span>${entry.module || '-'} · ${entry.time || '-'}</span>
        </div>
      </div>
    `;
  }).join('') || '<p class="modal-copy">没有匹配的审计日志</p>';
}

function loadAuditLines(filters = {}) {
  const params = new URLSearchParams({
    keyword: filters.keyword || '',
    actor: filters.actor || '',
    module: filters.module || '',
    limit: '120',
  });
  api(`/api/admin/audit-logs?${params}`)
    .then((payload) => renderAuditLines(payload.data))
    .catch(() => renderAuditLines([
      '10:42 admin 创建用户 @alice:localhost',
      '10:28 auditor 隔离媒体 media-cleanup-plan.pdf',
      '09:51 admin 查看房间 产品安全群',
    ]));
}

function openAuditModal() {
  openModal('操作日志', `
    <div class="audit-filter">
      <input class="mini-input" name="auditKeyword" placeholder="筛选操作、用户、模块">
      <input class="mini-input" name="auditActor" placeholder="操作人">
      <select class="mini-input" name="auditModule">
        <option value="">全部模块</option>
        <option value="admin">后台</option>
        <option value="app">App</option>
      </select>
      <button class="small-btn" data-action="filter-audit" type="button">筛选</button>
    </div>
    <div data-audit-lines></div>
  `);
  loadAuditLines();
}

document.querySelectorAll('.nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav a').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  });
});

document.querySelector('[data-user-search]').addEventListener('input', (event) => {
  const keyword = event.target.value.trim().toLowerCase();
  document.querySelectorAll('[data-user-table] tbody tr').forEach((row) => {
    row.hidden = !row.textContent.toLowerCase().includes(keyword);
  });
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  if (isWriteAction(action) && !canWrite()) {
    showToast('审计员为只读角色，不能执行写操作');
    return;
  }
  const row = button.closest('tr, .list-row, .media-row, .report');
  const title = row?.querySelector('strong')?.textContent || '当前项目';

  if (action === 'new-user') {
    openModal('新建用户', `
      <label class="field"><span>用户 ID</span><input name="userId" value="@newuser:localhost"></label>
      <label class="field"><span>显示名称</span><input name="displayName" value="New User"></label>
      <label class="field"><span>临时密码</span><input name="password" value="ChangeMe123"></label>
      <p class="modal-note">正式实现会调用 PUT /_synapse/admin/v2/users/{user_id}</p>
    `);
    modal.dataset.pendingAction = 'create-user';
    return;
  }

  if (action === 'logs') {
    openAuditModal();
    return;
  }

  if (action === 'send-notice') {
    const users = document.querySelector('[data-notice-users]').value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const content = document.querySelector('[data-notice-content]').value.trim();
    api(users.length > 1 ? '/api/admin/notices/bulk' : '/api/admin/notices', {
      method: 'POST',
      body: JSON.stringify(users.length > 1 ? { userIds: users, content } : { userId: users[0], content }),
    })
      .then(() => loadDashboardData())
      .then(() => showToast(`已发送系统通知给 ${users.length} 个用户`))
      .catch(() => showToast('系统通知发送失败'));
    return;
  }

  if (action === 'notice-template') {
    const content = noticeTemplates[button.dataset.template];
    if (content) {
      document.querySelector('[data-notice-content]').value = content;
      showToast('通知模板已填充');
    }
    return;
  }

  if (action === 'public-rooms') {
    api('/api/admin/public-rooms')
      .then((payload) => {
        openModal('公开房间', payload.data.map((room) => `
          <div class="audit-line">${room.name} · ${room.members} 成员 · ${room.roomId}</div>
        `).join('') || '<p class="modal-copy">暂无公开房间</p>');
      })
      .catch(() => showToast('公开房间查询失败'));
    return;
  }

  if (action === 'filter-media') {
    const filter = document.querySelector('[data-media-filter]').value.trim();
    reloadMedia(filter)
      .then(() => showToast(filter ? `已筛选 ${filter} 的媒体` : '已显示全部媒体'))
      .catch(() => showToast('媒体筛选失败'));
    return;
  }

  if (action === 'quarantine-scope') {
    const filter = document.querySelector('[data-media-filter]').value.trim();
    if (!filter.startsWith('@') && !filter.startsWith('!')) {
      showToast('请输入 @用户 或 !房间 ID');
      return;
    }
    const endpoint = filter.startsWith('@')
      ? `/api/admin/users/${encodeURIComponent(filter)}/media/quarantine`
      : `/api/admin/rooms/${encodeURIComponent(filter)}/media/quarantine`;
    api(endpoint, { method: 'POST' })
      .then(() => reloadMedia(filter))
      .then(() => showToast(`已批量隔离 ${filter} 的媒体`))
      .catch(() => showToast('批量隔离失败'));
    return;
  }

  if (action === 'cleanup-media') {
    openModal('清理隔离媒体', '<p class="modal-copy">确认清理所有已隔离媒体？本地 Demo 会从媒体列表移除这些文件。</p>');
    modal.dataset.pendingAction = 'cleanup-media';
    return;
  }

  if (action === 'export') {
    showToast('已生成用户导出任务');
    return;
  }

  if (action === 'export-audit') {
    api('/api/admin/audit-logs?format=jsonl&limit=500')
      .then((payload) => {
        const blob = new Blob([payload.data], { type: 'application/x-ndjson;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.jsonl`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('审计日志已导出');
      })
      .catch(() => showToast('导出审计日志失败'));
    return;
  }

  if (action === 'export-feature-spec') {
    api('/api/admin/feature-coverage/export?format=markdown')
      .then((payload) => {
        const blob = new Blob([payload.data], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `private-im-feature-spec-${new Date().toISOString().slice(0, 10)}.md`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('功能说明书已导出');
      })
      .catch(() => showToast('导出功能说明书失败'));
    return;
  }

  if (action === 'export-release-report') {
    api('/api/admin/release-report?format=markdown')
      .then((payload) => {
        const blob = new Blob([payload.data], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `private-im-release-report-${new Date().toISOString().slice(0, 10)}.md`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('交付报告已导出');
      })
      .catch(() => showToast('导出交付报告失败'));
    return;
  }

  if (action === 'cleanup-auth-locks') {
    api('/api/admin/auth-status/cleanup', { method: 'POST' })
      .then((payload) => loadDashboardData().then(() => showToast(`已清理 ${payload.data.cleared} 个过期锁定`)))
      .catch(() => showToast('清理认证锁定失败'));
    return;
  }

  if (action === 'generate-secrets') {
    api('/api/admin/secrets/generate', { method: 'POST' })
      .then((payload) => {
        openModal('安全凭据建议值', `
          <p class="modal-copy">${payload.data.note}</p>
          <label class="field"><span>.env 片段</span><textarea readonly>${payload.data.env}</textarea></label>
        `);
      })
      .catch(() => showToast('生成安全凭据失败'));
    return;
  }

  if (action === 'export-backup') {
    api('/api/admin/backup')
      .then((payload) => {
        const text = JSON.stringify(payload.data, null, 2);
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `private-im-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('本地备份已导出');
      })
      .catch(() => showToast('导出备份失败'));
    return;
  }

  if (action === 'import-backup') {
    openModal('导入本地备份', `
      <label class="field"><span>备份 JSON</span><textarea name="backupJson" placeholder="粘贴 private-im-backup-*.json 内容"></textarea></label>
      <p class="modal-note">只用于本地 Mock 数据。导入会覆盖当前 Demo 用户、房间、消息、配置和审计日志。</p>
    `);
    modal.dataset.pendingAction = 'import-backup';
    return;
  }

  if (action === 'purge-room') {
    const roomId = document.querySelector('[data-purge-room]').value.trim();
    api(`/api/admin/rooms/${encodeURIComponent(roomId)}/purge-history`, { method: 'POST' })
      .then((payload) => {
        showToast(`清理完成：移除 ${payload.data.removed} 条历史消息`);
        return loadDashboardData();
      })
      .catch(() => showToast('清理房间历史失败'));
    return;
  }

  if (action === 'reset-demo') {
    openModal('重置 Demo 数据', '<p class="modal-copy">确认重置本地演示数据？用户、消息、配置、审计日志都会恢复为默认数据。</p>');
    modal.dataset.pendingAction = 'reset-demo';
    return;
  }

  if (action === 'disable-token' || action === 'enable-token') {
    const token = button.closest('[data-token]')?.dataset.token;
    const disabled = action === 'disable-token';
    api(`/api/admin/registration-tokens/${encodeURIComponent(token)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ disabled }),
    })
      .then(() => loadDashboardData())
      .then(() => showToast(`${disabled ? '已禁用' : '已启用'}邀请码 ${token}`))
      .catch(() => showToast('邀请码状态更新失败'));
    return;
  }

  if (action === 'delete-token') {
    const token = button.closest('[data-token]')?.dataset.token;
    openModal('删除邀请码', `<p class="modal-copy">确认删除邀请码 ${token}？删除后 App 不能再用它注册。</p>`);
    modal.dataset.pendingAction = 'delete-token';
    modal.dataset.token = token;
    return;
  }

  if (action === 'logout') {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(roleKey);
    localStorage.removeItem(usernameKey);
    setLoggedIn(false);
    showToast('已退出登录');
    return;
  }

  if (action === 'filter-audit') {
    loadAuditLines({
      keyword: modal.querySelector('[name="auditKeyword"]')?.value.trim() || '',
      actor: modal.querySelector('[name="auditActor"]')?.value.trim() || '',
      module: modal.querySelector('[name="auditModule"]')?.value || '',
    });
    return;
  }

  if (action === 'ban' || action === 'unban') {
    const userId = row?.dataset.userId;
    const disabled = action === 'ban';
    openModal(disabled ? '禁用用户' : '解封用户', `
      <p class="modal-copy">${disabled ? '确认禁用' : '确认解封'} ${userId}？</p>
    `);
    modal.dataset.pendingAction = 'set-user-status';
    modal.dataset.userId = userId;
    modal.dataset.disabled = String(disabled);
    return;
  }

  if (action === 'bulk-ban-users' || action === 'bulk-unban-users' || action === 'bulk-logout-users') {
    const bulkAction = action === 'bulk-ban-users' ? 'ban' : action === 'bulk-unban-users' ? 'unban' : 'logout';
    runBulkUserAction(bulkAction);
    return;
  }

  if (action === 'user-detail') {
    const userId = row?.dataset.userId;
    Promise.all([
      api(`/api/admin/users/${encodeURIComponent(userId)}`),
      api(`/api/admin/users/${encodeURIComponent(userId)}/devices`),
    ])
      .then(([userPayload, devicesPayload]) => {
        const user = userPayload.data;
        const devices = devicesPayload.data;
        openModal('用户详情', `
          <div class="detail-kv"><span>用户 ID</span><strong>${user.userId}</strong></div>
          <div class="detail-kv"><span>显示名称</span><strong>${user.displayName}</strong></div>
          <div class="detail-kv"><span>状态</span><strong>${user.disabled ? '禁用' : '正常'}</strong></div>
          <div class="detail-kv"><span>管理员</span><strong>${user.admin ? '是' : '否'}</strong></div>
          <div class="detail-kv"><span>最近 IP</span><strong>${user.ip || '-'}</strong></div>
          <div class="action-grid">
            <button class="small-btn" data-action="change-password" data-user-id="${user.userId}">修改密码</button>
            <button class="small-btn" data-action="toggle-admin" data-user-id="${user.userId}" data-admin="${!user.admin}">${user.admin ? '取消管理员' : '设为管理员'}</button>
            <button class="small-btn" data-action="force-logout" data-user-id="${user.userId}">强制下线</button>
            <button class="small-btn danger" data-action="delete-user" data-user-id="${user.userId}">注销用户</button>
          </div>
          <h4 class="modal-section-title">设备</h4>
          ${devices.map((device) => `<div class="audit-line">${device.name || device.deviceId} · ${device.lastSeen || '未知'} · ${device.ip || '-'}</div>`).join('')}
          <h4 class="modal-section-title">加入房间</h4>
          ${(user.joinedRooms || []).map((room) => `<div class="audit-line">${room.name} · ${room.roomId}</div>`).join('')}
        `);
      })
      .catch(() => showToast('获取用户详情失败'));
    return;
  }

  if (action === 'devices') {
    const userId = row?.dataset.userId;
    api(`/api/admin/users/${encodeURIComponent(userId)}/devices`)
      .then((payload) => {
        openModal('设备管理', payload.data.map((device) => `
          <div class="audit-line">${device.name || device.deviceId} · ${device.lastSeen || '未知'} · ${device.ip || '-'}</div>
        `).join('') || '<p class="modal-copy">暂无设备</p>');
      })
      .catch(() => showToast('获取设备失败'));
    return;
  }

  if (action === 'change-password') {
    const userId = button.dataset.userId;
    openModal('修改密码', `
      <label class="field"><span>新密码</span><input name="password" value="ChangeMe123"></label>
      <p class="modal-note">正式版会调用 PUT /_synapse/admin/v2/users/{user_id}</p>
    `);
    modal.dataset.pendingAction = 'change-password';
    modal.dataset.userId = userId;
    return;
  }

  if (action === 'toggle-admin') {
    const userId = button.dataset.userId;
    const admin = button.dataset.admin === 'true';
    openModal(admin ? '设为管理员' : '取消管理员', `<p class="modal-copy">确认${admin ? '设置' : '取消'} ${userId} 的管理员权限？</p>`);
    modal.dataset.pendingAction = 'toggle-admin';
    modal.dataset.userId = userId;
    modal.dataset.admin = String(admin);
    return;
  }

  if (action === 'force-logout') {
    const userId = button.dataset.userId;
    openModal('强制下线', `<p class="modal-copy">确认踢下线 ${userId} 的所有设备？</p>`);
    modal.dataset.pendingAction = 'force-logout';
    modal.dataset.userId = userId;
    return;
  }

  if (action === 'delete-user') {
    const userId = button.dataset.userId;
    openModal('注销用户', `<p class="modal-copy">确认注销 ${userId}？本地 Demo 会从用户列表移除该账号。</p>`);
    modal.dataset.pendingAction = 'delete-user';
    modal.dataset.userId = userId;
    return;
  }

  if (action === 'close-room') {
    const roomId = row?.dataset.roomId;
    api(`/api/admin/rooms/${encodeURIComponent(roomId)}/close`, { method: 'POST' })
      .then(() => loadDashboardData())
      .then(() => showToast(`已解散群聊 ${title}`))
      .catch(() => showToast('解散群聊失败'));
    return;
  }

  if (action === 'bulk-close-rooms' || action === 'bulk-quarantine-room-media') {
    runBulkRoomAction(action === 'bulk-close-rooms' ? 'close' : 'quarantine-media');
    return;
  }

  if (action === 'make-room-admin') {
    const roomId = button.dataset.roomId;
    const userId = button.dataset.userId;
    api(`/api/admin/rooms/${encodeURIComponent(roomId)}/make-admin`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
      .then(() => showToast(`已设置 ${userId} 为群管理员`))
      .catch(() => showToast('设置群管理员失败'));
    return;
  }

  if (action === 'quarantine') {
    const mediaId = row?.dataset.mediaId;
    api(`/api/admin/media/${encodeURIComponent(mediaId)}/quarantine`, { method: 'POST' })
      .then(() => loadDashboardData())
      .then(() => showToast(`已隔离媒体 ${title}`))
      .catch(() => showToast('隔离媒体失败'));
    return;
  }

  if (action === 'delete-media') {
    const mediaId = row?.dataset.mediaId;
    api(`/api/admin/media/${encodeURIComponent(mediaId)}`, { method: 'DELETE' })
      .then(() => loadDashboardData())
      .then(() => showToast(`已删除媒体 ${title}`))
      .catch(() => showToast('删除媒体失败'));
    return;
  }

  if (action === 'bulk-quarantine-media' || action === 'bulk-delete-media') {
    runBulkMediaAction(action === 'bulk-delete-media' ? 'delete' : 'quarantine');
    return;
  }

  if (action === 'resolve-report') {
    const reportId = row?.dataset.reportId;
    api(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, { method: 'POST' })
      .then(() => loadDashboardData())
      .then(() => showToast(`已处理举报 ${title}`))
      .catch(() => showToast('处理举报失败'));
    return;
  }

  if (action === 'bulk-handle-reports') {
    openModal('批量处理举报', `
      <p class="modal-copy">将处理当前所有待处理举报，并按举报内容联动封禁用户、隔离媒体和隔离用户媒体。</p>
      <label class="check-line"><input type="checkbox" name="banUser" checked> 封禁被举报用户</label>
      <label class="check-line"><input type="checkbox" name="quarantineMedia" checked> 隔离被举报媒体</label>
      <label class="check-line"><input type="checkbox" name="quarantineUserMedia" checked> 隔离被举报用户上传媒体</label>
    `);
    modal.dataset.pendingAction = 'bulk-handle-reports';
    return;
  }

  if (action === 'report-detail') {
    const reportId = row?.dataset.reportId;
    api(`/api/admin/reports/${encodeURIComponent(reportId)}`)
      .then((payload) => {
        const report = payload.data;
        openModal('举报详情', `
          <div class="detail-kv"><span>举报 ID</span><strong>${report.reportId}</strong></div>
          <div class="detail-kv"><span>级别</span><strong>${report.level}</strong></div>
          <div class="detail-kv"><span>举报人</span><strong>${report.reporter || '-'}</strong></div>
          <div class="detail-kv"><span>被举报用户</span><strong>${report.targetUserId || '-'}</strong></div>
          <div class="detail-kv"><span>房间</span><strong>${report.roomId || '-'}</strong></div>
          <div class="detail-kv"><span>事件</span><strong>${report.eventId || '-'}</strong></div>
          <p class="modal-copy">${report.messagePreview || report.summary}</p>
          <div class="action-grid">
            <button class="small-btn danger" data-action="handle-report" data-report-id="${report.reportId}" data-report-action="ban-user">封禁用户</button>
            <button class="small-btn" data-action="handle-report" data-report-id="${report.reportId}" data-report-action="quarantine-media">隔离媒体</button>
            <button class="small-btn danger" data-action="handle-report" data-report-id="${report.reportId}" data-report-action="close-room">解散群聊</button>
            <button class="small-btn" data-action="handle-report" data-report-id="${report.reportId}" data-report-action="resolve">仅标记处理</button>
          </div>
          <h4 class="modal-section-title">处理记录</h4>
          ${(report.history || []).map((line) => `<div class="audit-line">${line}</div>`).join('')}
        `);
      })
      .catch(() => showToast('获取举报详情失败'));
    return;
  }

  if (action === 'handle-report') {
    const reportId = button.dataset.reportId;
    const reportAction = button.dataset.reportAction;
    const endpoint = reportAction === 'resolve'
      ? `/api/admin/reports/${encodeURIComponent(reportId)}/resolve`
      : `/api/admin/reports/${encodeURIComponent(reportId)}/handle`;
    api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: reportAction }),
    })
      .then(() => loadDashboardData())
      .then(() => {
        modal.close();
        showToast('举报已处理');
      })
      .catch(() => showToast('举报处理失败'));
    return;
  }

  if (action === 'room-detail' || action === 'room-state') {
    const roomId = row?.dataset.roomId;
    api(`/api/admin/rooms/${encodeURIComponent(roomId)}`)
      .then((payload) => {
        const room = payload.data;
        openModal(action === 'room-state' ? '群状态' : '群聊详情', `
          <div class="detail-kv"><span>房间 ID</span><strong>${room.roomId}</strong></div>
          <div class="detail-kv"><span>名称</span><strong>${room.name}</strong></div>
          <div class="detail-kv"><span>成员</span><strong>${room.members}</strong></div>
          <div class="detail-kv"><span>加密</span><strong>${room.encrypted ? '开启' : '关闭'}</strong></div>
          <div class="detail-kv"><span>状态</span><strong>${room.status}</strong></div>
          <h4 class="modal-section-title">成员</h4>
          ${(room.membersList || []).map((member) => `
            <div class="audit-line room-member-line">
              <span>${member.displayName || member.userId} · ${member.role || 'member'}</span>
              ${member.role === 'member' ? `<button class="small-btn" data-action="make-room-admin" data-room-id="${room.roomId}" data-user-id="${member.userId}">设为管理员</button>` : ''}
            </div>
          `).join('')}
          <h4 class="modal-section-title">状态事件</h4>
          ${(room.stateEvents || []).map((event) => `<div class="audit-line">${event.type} · ${event.value || event.content?.membership || ''}</div>`).join('')}
        `);
      })
      .catch(() => showToast('获取群聊详情失败'));
    return;
  }

  const actions = {
    unban: ['解封用户', `${title} 将恢复登录权限，正式版会写入后台操作日志。`],
    'close-room': ['解散群聊', `确认解散 ${title}？正式版会调用 DELETE /_synapse/admin/v1/rooms/{room_id}。`],
    quarantine: ['隔离媒体', `${title} 将被加入媒体隔离列表，客户端不可继续访问。`],
    'delete-media': ['删除媒体', `${title} 将从媒体存储中删除。`],
    'resolve-report': ['处理举报', `${title} 可联动封禁用户、隔离媒体或解散群。`],
  };

  const [modalName, message] = actions[action] || ['操作详情', '该功能将在正式后台接入。'];
  openModal(modalName, `<p class="modal-copy">${message}</p>`);
});

modal.addEventListener('close', () => {
  if (modal.returnValue === 'confirm') {
    if (modal.dataset.pendingAction === 'create-user') {
      const userId = modal.querySelector('[name="userId"]').value.trim();
      const displayName = modal.querySelector('[name="displayName"]').value.trim();
      const password = modal.querySelector('[name="password"]').value.trim();
      api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ userId, displayName, password }),
      })
        .then(() => loadDashboardData())
        .then(() => showToast(`已创建用户 ${userId}`))
        .catch(() => showToast('创建用户失败'));
    } else if (modal.dataset.pendingAction === 'set-user-status') {
      const userId = modal.dataset.userId;
      const disabled = modal.dataset.disabled === 'true';
      api(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled }),
      })
        .then(() => loadDashboardData())
        .then(() => showToast(`${disabled ? '已禁用' : '已解封'} ${userId}`))
        .catch(() => showToast('用户状态更新失败'));
    } else if (modal.dataset.pendingAction === 'change-password') {
      const userId = modal.dataset.userId;
      const password = modal.querySelector('[name="password"]').value.trim();
      api(`/api/admin/users/${encodeURIComponent(userId)}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      })
        .then(() => loadDashboardData())
        .then(() => showToast(`已修改 ${userId} 的密码`))
        .catch(() => showToast('修改密码失败'));
    } else if (modal.dataset.pendingAction === 'toggle-admin') {
      const userId = modal.dataset.userId;
      const admin = modal.dataset.admin === 'true';
      api(`/api/admin/users/${encodeURIComponent(userId)}/admin`, {
        method: 'PATCH',
        body: JSON.stringify({ admin }),
      })
        .then(() => loadDashboardData())
        .then(() => showToast(`${admin ? '已设置' : '已取消'} ${userId} 管理员权限`))
        .catch(() => showToast('管理员权限更新失败'));
    } else if (modal.dataset.pendingAction === 'force-logout') {
      const userId = modal.dataset.userId;
      api(`/api/admin/users/${encodeURIComponent(userId)}/logout`, { method: 'POST' })
        .then(() => loadDashboardData())
        .then(() => showToast(`已踢下线 ${userId}`))
        .catch(() => showToast('强制下线失败'));
    } else if (modal.dataset.pendingAction === 'delete-user') {
      const userId = modal.dataset.userId;
      api(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
        .then(() => loadDashboardData())
        .then(() => showToast(`已注销 ${userId}`))
        .catch(() => showToast('注销用户失败'));
    } else if (modal.dataset.pendingAction === 'cleanup-media') {
      api('/api/admin/media/cleanup', { method: 'POST' })
        .then(() => loadDashboardData())
        .then(() => showToast('已清理隔离媒体'))
        .catch(() => showToast('清理媒体失败'));
    } else if (modal.dataset.pendingAction === 'delete-token') {
      const token = modal.dataset.token;
      api(`/api/admin/registration-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' })
        .then(() => loadDashboardData())
        .then(() => showToast(`已删除邀请码 ${token}`))
        .catch(() => showToast('删除邀请码失败'));
    } else if (modal.dataset.pendingAction === 'reset-demo') {
      api('/api/admin/reset-demo', { method: 'POST' })
        .then(() => loadDashboardData())
        .then(() => showToast('Demo 数据已重置'))
        .catch(() => showToast('重置失败'));
    } else if (modal.dataset.pendingAction === 'import-backup') {
      const raw = modal.querySelector('[name="backupJson"]').value.trim();
      let backup;
      try {
        backup = JSON.parse(raw);
      } catch {
        showToast('备份 JSON 格式错误');
        return;
      }
      api('/api/admin/backup/import', {
        method: 'POST',
        body: JSON.stringify(backup),
      })
        .then(() => loadDashboardData())
        .then(() => showToast('本地备份已导入'))
        .catch(() => showToast('导入备份失败'));
    } else if (modal.dataset.pendingAction === 'bulk-handle-reports') {
      const actions = ['resolve'];
      if (modal.querySelector('[name="banUser"]').checked) actions.push('ban-user');
      if (modal.querySelector('[name="quarantineMedia"]').checked) actions.push('quarantine-media');
      if (modal.querySelector('[name="quarantineUserMedia"]').checked) actions.push('quarantine-user-media');
      api('/api/admin/reports/bulk-handle', {
        method: 'POST',
        body: JSON.stringify({ actions }),
      })
        .then((payload) => loadDashboardData().then(() => showToast(`已批量处理 ${payload.data.count} 条举报`)))
        .catch(() => showToast('批量处理举报失败'));
    } else {
      showToast('操作已记录，本地 Demo 未调用真实 Admin API');
    }
  }
  delete modal.dataset.pendingAction;
  delete modal.dataset.userId;
  delete modal.dataset.disabled;
  delete modal.dataset.admin;
  delete modal.dataset.token;
});

setLoggedIn(Boolean(localStorage.getItem(tokenKey)));
if (localStorage.getItem(tokenKey)) {
  refreshAdminSession()
    .then(() => loadDashboardData())
    .catch(() => {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(roleKey);
      localStorage.removeItem(usernameKey);
      setLoggedIn(false);
    });
}
