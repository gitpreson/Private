import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';
import { createAdapter } from './adapters/index.mjs';
import {
  authStateStatus,
  cleanupExpiredAdminLocks,
  getAdminAuthState,
  isAdminLocked,
  recordAdminLoginFailure,
  recordAdminLoginSuccess,
} from './lib/auth-state.mjs';
import { adminAccounts, appAccessToken, authChecks } from './lib/auth.mjs';
import { configChecks, deployEnvChecklist, runtimeConfig } from './lib/config.mjs';
import { readBody, sendJson } from './lib/http.mjs';
import { storageStatus } from './lib/store.mjs';

const config = runtimeConfig();
const port = config.port;
const adapter = createAdapter();
const synapseBaseUrl = config.synapseBaseUrl;
const admins = adminAccounts();
const demoAppToken = appAccessToken();
const writeMethods = new Set(['POST', 'PATCH', 'DELETE', 'PUT']);

function adminSession(request) {
  const auth = request.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/, '');
  return Object.values(admins).find((admin) => admin.token === token) || null;
}

function isPublicRoute(pathname) {
  return pathname === '/api/health' || pathname === '/api/admin/login' || pathname === '/api/app/login' || pathname === '/api/app/register';
}

function isAuthorized(request) {
  return Boolean(adminSession(request));
}

function canWriteAdmin(request, pathname) {
  if (!pathname.startsWith('/api/admin/')) return true;
  if (!writeMethods.has(request.method)) return true;
  const session = adminSession(request);
  return session?.role === 'owner' || session?.role === 'admin';
}

function isAppAuthorized(request) {
  const auth = request.headers.authorization || '';
  return auth === `Bearer ${demoAppToken}` || auth.startsWith(`Bearer ${demoAppToken}-`);
}

function getAppToken(request) {
  return (request.headers.authorization || '').replace(/^Bearer\s+/, '');
}

function adminActor(request) {
  return adminSession(request)?.username || 'admin';
}

function adminPermissions(session) {
  const canWrite = session?.role === 'owner' || session?.role === 'admin';
  const authState = session ? getAdminAuthState(session.username) : {};
  return {
    username: session?.username,
    role: session?.role,
    canWrite,
    lastLoginAt: authState.lastLoginAt || null,
    failedLoginCount: authState.failedLoginCount || 0,
    lockedUntil: authState.lockedUntil || null,
    permissions: canWrite
      ? ['read:admin', 'write:operations', 'export:audit']
      : ['read:admin', 'export:audit'],
  };
}

function buildSelfCheck({ stats, status, storage, authStatus, checks }) {
  const items = [
    {
      key: 'api_online',
      label: '业务 API 在线',
      status: status.api === 'online' ? 'pass' : 'fail',
      detail: `当前状态：${status.api}`,
    },
    {
      key: 'storage_available',
      label: '本地持久化可用',
      status: config.mode === 'mock' && !storage.exists ? 'warn' : storage.health === 'review' ? 'warn' : 'pass',
      detail: config.mode === 'mock' ? storage.recommendation : 'Synapse 模式由 homeserver 管理存储',
    },
    {
      key: 'seed_users',
      label: '基础用户数据',
      status: stats.users > 0 ? 'pass' : 'fail',
      detail: `${stats.users} 个用户`,
    },
    {
      key: 'seed_rooms',
      label: '基础会话数据',
      status: stats.rooms > 0 ? 'pass' : 'fail',
      detail: `${stats.rooms} 个房间/群聊`,
    },
    {
      key: 'reports_queue',
      label: '举报处理队列',
      status: stats.reports > 0 ? 'warn' : 'pass',
      detail: stats.reports > 0 ? `${stats.reports} 条待处理，建议尽快审核` : '暂无待处理举报',
    },
    {
      key: 'admin_auth_locks',
      label: '后台账号锁定',
      status: authStatus.lockedAccounts > 0 ? 'warn' : 'pass',
      detail: authStatus.lockedAccounts > 0
        ? `${authStatus.lockedAccounts} 个账号被锁定，建议检查登录失败记录`
        : `无锁定账号，累计失败 ${authStatus.failedAttempts} 次`,
    },
    ...checks.map((check) => ({
      key: check.key,
      label: check.label,
      status: check.status,
      detail: check.detail,
    })),
  ];
  const summary = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { pass: 0, warn: 0, fail: 0 });

  return {
    ok: summary.fail === 0,
    checkedAt: new Date().toISOString(),
    summary,
    items,
  };
}

function buildReadiness({ stats, status, storage, authStatus, checks }) {
  const adminCredentialCheck = checks.find((check) => check.key === 'admin_credentials');
  const appTokenCheck = checks.find((check) => check.key === 'app_demo_token');
  const items = [
    {
      key: 'backend_online',
      label: '后台服务',
      status: status.api === 'online' ? 'ready' : 'blocker',
      detail: `API ${status.api}`,
    },
    {
      key: 'admin_api_hidden',
      label: 'Admin API 暴露',
      status: status.adminApiExposure === 'internal_only' ? 'ready' : 'blocker',
      detail: status.adminApiExposure,
    },
    {
      key: 'default_credentials',
      label: '默认凭据',
      status: adminCredentialCheck?.status === 'warn' ? 'blocker' : 'ready',
      detail: adminCredentialCheck?.detail || '已检查',
    },
    {
      key: 'app_token',
      label: 'App Token',
      status: appTokenCheck?.status === 'warn' ? 'warning' : 'ready',
      detail: appTokenCheck?.detail || '已检查',
    },
    {
      key: 'reports_queue',
      label: '举报队列',
      status: stats.reports > 0 ? 'warning' : 'ready',
      detail: stats.reports > 0 ? `${stats.reports} 条待处理` : '无待处理举报',
    },
    {
      key: 'auth_locks',
      label: '认证锁定',
      status: authStatus.lockedAccounts > 0 ? 'warning' : 'ready',
      detail: `${authStatus.lockedAccounts} 个锁定账号`,
    },
    {
      key: 'storage',
      label: '数据持久化',
      status: config.mode === 'mock' ? 'warning' : storage.health === 'review' ? 'warning' : 'ready',
      detail: config.mode === 'mock' ? '当前仍是 Mock JSON，本地演示可用，生产需迁移数据库' : storage.recommendation,
    },
  ];
  const summary = items.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { ready: 0, warning: 0, blocker: 0 });
  return {
    canDemo: summary.blocker <= 1,
    canProduction: summary.blocker === 0 && summary.warning === 0,
    checkedAt: new Date().toISOString(),
    summary,
    items,
  };
}

function buildFeatureCoverage() {
  const modules = [
    {
      name: '用户管理',
      status: 'mvp',
      done: ['列表/详情', '创建用户', '禁用/解封', '修改密码', '管理员权限', '设备列表', '强制下线', '批量操作'],
      next: ['接真实 Synapse 设备删除细节', '生产级管理员审计审批'],
    },
    {
      name: '群聊管理',
      status: 'mvp',
      done: ['群列表/详情', '成员列表', '状态事件', '设置群管理员', '解散群', '公开房间', '批量解散/隔离媒体'],
      next: ['真实 room directory 策略', '群迁移/冻结策略'],
    },
    {
      name: '媒体文件',
      status: 'mvp',
      done: ['媒体列表', '用户/房间筛选', '隔离媒体', '删除媒体', '清理隔离媒体', '批量隔离/删除'],
      next: ['真实 media repo 存储用量统计', '异步清理任务'],
    },
    {
      name: '举报风控',
      status: 'mvp',
      done: ['举报列表/详情', '联动封禁', '联动隔离媒体', '联动解散群', '批量处理', 'App 消息/文件举报'],
      next: ['申诉流', '风控规则引擎'],
    },
    {
      name: '系统通知',
      status: 'mvp',
      done: ['单用户通知', '批量通知', '通知模板', 'App 内通知消息'],
      next: ['通知历史检索', '定时发送'],
    },
    {
      name: '注册管理',
      status: 'mvp',
      done: ['邀请码创建', '启用/禁用', '删除', '使用次数/剩余次数', 'App 邀请注册'],
      next: ['过期时间', '渠道统计'],
    },
    {
      name: '系统维护',
      status: 'mvp',
      done: ['自检', '上线准备度', '运营总览', '任务中心', '备份导入/导出', '审计导出'],
      next: ['生产数据库迁移', '真实备份恢复演练'],
    },
    {
      name: 'Flutter App',
      status: 'skeleton',
      done: ['登录页', '会话页', '聊天页', '设置页', '文件/设备入口', 'Matrix SDK 骨架'],
      next: ['安装 Flutter 后真机运行', '真实 Synapse 登录/同步/推送'],
    },
  ];
  const summary = modules.reduce((acc, module) => {
    acc[module.status] = (acc[module.status] || 0) + 1;
    return acc;
  }, { mvp: 0, skeleton: 0, planned: 0 });
  return { summary, modules };
}

function withSynapseMapping(data, endpoint) {
  return {
    data,
    meta: {
      mode: adapter.mode,
      synapseBaseUrl,
      synapseEndpoint: endpoint,
    },
  };
}

function formatFeatureCoverage(coverage, format) {
  if (format === 'json') return coverage;
  const lines = [
    '# Private IM 功能说明书',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    `模块统计：MVP ${coverage.summary.mvp || 0}，App 骨架 ${coverage.summary.skeleton || 0}`,
    '',
  ];
  coverage.modules.forEach((module) => {
    lines.push(`## ${module.name}`);
    lines.push('');
    lines.push(`状态：${module.status}`);
    lines.push('');
    lines.push('已完成：');
    module.done.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
    lines.push('下一步：');
    module.next.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  });
  return lines.join('\n');
}

function formatReleaseReport(report, format) {
  if (format === 'json') return report;
  const lines = [
    '# Private IM 发布交付报告',
    '',
    `生成时间：${report.generatedAt}`,
    `运行模式：${report.mode}`,
    '',
    '## 发布结论',
    '',
    `- 本地演示：${report.readiness.canDemo ? '可以' : '不可以'}`,
    `- 生产上线：${report.readiness.canProduction ? '可以' : '不可以'}`,
    `- Synapse 环境变量：${report.deployEnv.readyForSynapseMode ? '已就绪' : '未就绪'}`,
    '',
    '## 上线准备度',
    '',
    `- 通过：${report.readiness.summary.ready}`,
    `- 警告：${report.readiness.summary.warning}`,
    `- 阻断：${report.readiness.summary.blocker}`,
    '',
  ];
  report.readiness.items.forEach((item) => lines.push(`- ${item.label}: ${item.status} - ${item.detail}`));
  lines.push('', '## 功能覆盖', '');
  report.coverage.modules.forEach((module) => {
    lines.push(`- ${module.name}: ${module.status}，已完成 ${module.done.length} 项，下一步：${module.next[0]}`);
  });
  lines.push('', '## 当前风险', '');
  lines.push(`- 风险指数：${report.overview.risk.score}`);
  lines.push(`- 待处理举报：${report.overview.risk.reports}`);
  lines.push(`- 禁用用户：${report.overview.risk.disabledUsers}`);
  lines.push(`- 隔离媒体：${report.overview.risk.quarantinedMedia}`);
  lines.push('', '## 部署环境变量', '');
  report.deployEnv.items.forEach((item) => lines.push(`- ${item.key}: ${item.status} - ${item.detail}`));
  lines.push('', '## 下一步', '');
  lines.push('- 启动真实 Synapse/PostgreSQL/Redis 并获取管理员 Token');
  lines.push('- 将 Admin Backend 切换到 ADMIN_BACKEND_MODE=synapse');
  lines.push('- 安装 Flutter 并运行真机 App');
  lines.push('- 将后台自有数据迁移到 PostgreSQL');
  lines.push('- 替换所有默认密码和 Token，配置 HTTPS/域名/反向代理');
  return lines.join('\n');
}

function generateSecrets() {
  const token = () => randomBytes(32).toString('base64url');
  const password = () => `${randomBytes(18).toString('base64url')}aA1!`;
  const values = {
    ADMIN_OWNER_PASSWORD: password(),
    ADMIN_OWNER_TOKEN: token(),
    ADMIN_OPERATOR_PASSWORD: password(),
    ADMIN_OPERATOR_TOKEN: token(),
    ADMIN_AUDITOR_PASSWORD: password(),
    ADMIN_AUDITOR_TOKEN: token(),
    APP_DEMO_TOKEN: token(),
    POSTGRES_PASSWORD: password(),
    SYNAPSE_FORM_SECRET: token(),
    SYNAPSE_MACAROON_SECRET: token(),
  };
  return {
    generatedAt: new Date().toISOString(),
    values,
    env: Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n'),
    note: '这些值只返回给当前请求，不会写入磁盘。请复制到 server/.env 或部署平台变量。',
  };
}

function formatAuditLogs(logs, format) {
  if (format === 'text') return logs.map((entry) => entry.raw || String(entry)).join('\n');
  if (format === 'jsonl') return logs.map((entry) => JSON.stringify(entry)).join('\n');
  if (format === 'csv') {
    const rows = [['id', 'time', 'actor', 'module', 'action', 'target', 'raw'], ...logs.map((entry) => [
      entry.id,
      entry.time,
      entry.actor,
      entry.module,
      entry.action,
      entry.target,
      entry.raw,
    ])];
    return rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  }
  return null;
}

async function handle(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const { pathname, searchParams } = url;

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  try {
    if (pathname === '/api/health') {
      sendJson(response, 200, { ok: true, service: 'admin-backend', mode: adapter.mode, port });
      return;
    }

    if (pathname === '/api/admin/login' && request.method === 'POST') {
      const body = await readBody(request);
      const admin = admins[body.username];
      if (isAdminLocked(body.username)) {
        sendJson(response, 423, { error: 'account_locked', message: 'too_many_failed_login_attempts' });
        return;
      }
      if (admin && body.password === admin.password) {
        recordAdminLoginSuccess(admin.username);
        sendJson(response, 200, { token: admin.token, role: admin.role, username: admin.username });
        return;
      }
      recordAdminLoginFailure(body.username);
      sendJson(response, 401, { error: 'invalid_credentials' });
      return;
    }

    if (pathname === '/api/app/login' && request.method === 'POST') {
      const session = await adapter.appLogin(await readBody(request));
      if (!session) {
        sendJson(response, 401, { error: 'invalid_credentials' });
        return;
      }
      sendJson(response, 200, session);
      return;
    }

    if (pathname === '/api/app/register' && request.method === 'POST') {
      const session = await adapter.appRegister(await readBody(request));
      if (!session) {
        sendJson(response, 400, { error: 'invalid_registration' });
        return;
      }
      sendJson(response, 201, session);
      return;
    }

    if (pathname.startsWith('/api/app/') && !isAppAuthorized(request)) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }

    if (pathname === '/api/app/conversations' && request.method === 'GET') {
      sendJson(response, 200, {
        data: await adapter.listAppConversations({ archived: searchParams.get('archived') === 'true' }),
        meta: { mode: adapter.mode },
      });
      return;
    }

    if (pathname === '/api/app/conversations' && request.method === 'POST') {
      const conversation = await adapter.createAppConversation(await readBody(request));
      if (!conversation) {
        sendJson(response, 404, { error: 'contact_not_found' });
        return;
      }
      sendJson(response, 201, { data: conversation, meta: { mode: adapter.mode } });
      return;
    }

    const appConversationMatch = pathname.match(/^\/api\/app\/conversations\/([^/]+)$/);
    if (appConversationMatch && request.method === 'PATCH') {
      const conversation = await adapter.updateAppConversation(
        decodeURIComponent(appConversationMatch[1]),
        await readBody(request),
      );
      if (!conversation) {
        sendJson(response, 404, { error: 'conversation_not_found' });
        return;
      }
      sendJson(response, 200, { data: conversation, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/group-conversations' && request.method === 'POST') {
      const conversation = await adapter.createAppGroupConversation(await readBody(request));
      if (!conversation) {
        sendJson(response, 400, { error: 'invalid_group' });
        return;
      }
      sendJson(response, 201, { data: conversation, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/me' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.getAppMe(getAppToken(request)), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/me' && request.method === 'PUT') {
      const me = await adapter.updateAppMe(getAppToken(request), await readBody(request));
      if (!me) {
        sendJson(response, 400, { error: 'invalid_profile' });
        return;
      }
      sendJson(response, 200, { data: me, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/me/password' && request.method === 'PUT') {
      const result = await adapter.changeAppPassword(getAppToken(request), await readBody(request));
      if (!result) {
        sendJson(response, 400, { error: 'invalid_password' });
        return;
      }
      sendJson(response, 200, { data: result, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/config' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.getAppConfig(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/preferences' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.getAppPreferences(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/preferences' && request.method === 'PUT') {
      sendJson(response, 200, { data: await adapter.updateAppPreferences(await readBody(request)), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/contacts' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.listContacts(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/files' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.listAppFiles(), meta: { mode: adapter.mode } });
      return;
    }

    const fileReportMatch = pathname.match(/^\/api\/app\/files\/([^/]+)\/report$/);
    if (fileReportMatch && request.method === 'POST') {
      const report = await adapter.reportAppFile(decodeURIComponent(fileReportMatch[1]), await readBody(request));
      if (!report) {
        sendJson(response, 404, { error: 'file_not_found' });
        return;
      }
      sendJson(response, 201, { data: report, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/app/devices' && request.method === 'GET') {
      sendJson(response, 200, { data: await adapter.listAppDevices(getAppToken(request)), meta: { mode: adapter.mode } });
      return;
    }

    const appDeviceMatch = pathname.match(/^\/api\/app\/devices\/([^/]+)$/);
    if (appDeviceMatch && request.method === 'DELETE') {
      const device = await adapter.removeAppDevice(getAppToken(request), decodeURIComponent(appDeviceMatch[1]));
      if (!device) {
        sendJson(response, 404, { error: 'device_not_found' });
        return;
      }
      sendJson(response, 200, { data: device, meta: { mode: adapter.mode } });
      return;
    }

    const messagesMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/messages$/);
    if (messagesMatch && request.method === 'GET') {
      const messages = await adapter.listAppMessages(decodeURIComponent(messagesMatch[1]));
      if (!messages) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 200, { data: messages, meta: { mode: adapter.mode } });
      return;
    }

    const appRoomMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)$/);
    if (appRoomMatch && request.method === 'GET') {
      const room = await adapter.getAppRoom(decodeURIComponent(appRoomMatch[1]));
      if (!room) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 200, { data: room, meta: { mode: adapter.mode } });
      return;
    }

    const leaveAppRoomMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/leave$/);
    if (leaveAppRoomMatch && request.method === 'POST') {
      const room = await adapter.leaveAppRoom(decodeURIComponent(leaveAppRoomMatch[1]));
      if (!room) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 200, { data: room, meta: { mode: adapter.mode } });
      return;
    }

    const inviteAppRoomMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/members$/);
    if (inviteAppRoomMatch && request.method === 'POST') {
      const room = await adapter.inviteAppRoomMembers(decodeURIComponent(inviteAppRoomMatch[1]), await readBody(request));
      if (!room) {
        sendJson(response, 400, { error: 'invalid_room_members' });
        return;
      }
      sendJson(response, 200, { data: room, meta: { mode: adapter.mode } });
      return;
    }

    const removeAppRoomMemberMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/members\/([^/]+)$/);
    if (removeAppRoomMemberMatch && request.method === 'DELETE') {
      const room = await adapter.removeAppRoomMember(
        decodeURIComponent(removeAppRoomMemberMatch[1]),
        decodeURIComponent(removeAppRoomMemberMatch[2]),
      );
      if (!room) {
        sendJson(response, 400, { error: 'invalid_room_member' });
        return;
      }
      sendJson(response, 200, { data: room, meta: { mode: adapter.mode } });
      return;
    }

    if (messagesMatch && request.method === 'POST') {
      const body = await readBody(request);
      const message = await adapter.sendAppMessage(decodeURIComponent(messagesMatch[1]), body.content, {
        replyTo: body.replyTo,
      });
      if (!message) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 201, { data: message, meta: { mode: adapter.mode } });
      return;
    }

    const messageItemMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/messages\/([^/]+)$/);
    if (messageItemMatch && request.method === 'PATCH') {
      const message = await adapter.editAppMessage(
        decodeURIComponent(messageItemMatch[1]),
        decodeURIComponent(messageItemMatch[2]),
        (await readBody(request)).content,
      );
      if (!message) {
        sendJson(response, 400, { error: 'invalid_message' });
        return;
      }
      sendJson(response, 200, { data: message, meta: { mode: adapter.mode } });
      return;
    }

    if (messageItemMatch && request.method === 'DELETE') {
      const message = await adapter.deleteAppMessage(
        decodeURIComponent(messageItemMatch[1]),
        decodeURIComponent(messageItemMatch[2]),
      );
      if (!message) {
        sendJson(response, 400, { error: 'invalid_message' });
        return;
      }
      sendJson(response, 200, { data: message, meta: { mode: adapter.mode } });
      return;
    }

    const messageReportMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/messages\/([^/]+)\/report$/);
    if (messageReportMatch && request.method === 'POST') {
      const report = await adapter.reportAppMessage(
        decodeURIComponent(messageReportMatch[1]),
        decodeURIComponent(messageReportMatch[2]),
        await readBody(request),
      );
      if (!report) {
        sendJson(response, 400, { error: 'invalid_message_report' });
        return;
      }
      sendJson(response, 201, { data: report, meta: { mode: adapter.mode } });
      return;
    }

    const attachmentMatch = pathname.match(/^\/api\/app\/rooms\/([^/]+)\/attachments$/);
    if (attachmentMatch && request.method === 'POST') {
      const result = await adapter.sendAppAttachment(decodeURIComponent(attachmentMatch[1]), await readBody(request));
      if (!result) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 201, { data: result, meta: { mode: adapter.mode } });
      return;
    }

    if (!isPublicRoute(pathname) && !isAuthorized(request)) {
      sendJson(response, 401, { error: 'unauthorized' });
      return;
    }

    if (!canWriteAdmin(request, pathname)) {
      sendJson(response, 403, { error: 'forbidden', message: 'auditor_role_is_readonly' });
      return;
    }

    if (pathname === '/api/admin/me' && request.method === 'GET') {
      sendJson(response, 200, { data: adminPermissions(adminSession(request)), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/users' && request.method === 'GET') {
      const users = await adapter.listUsers({ keyword: searchParams.get('keyword') || '' });
      sendJson(response, 200, withSynapseMapping(users, 'GET /_synapse/admin/v2/users'));
      return;
    }

    if (pathname === '/api/admin/users' && request.method === 'POST') {
      const user = await adapter.createUser(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 201, withSynapseMapping(user, 'PUT /_synapse/admin/v2/users/{user_id}'));
      return;
    }

    if (pathname === '/api/admin/users/bulk' && request.method === 'POST') {
      const result = await adapter.bulkUpdateUsers(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'PUT /_synapse/admin/v2/users/{user_id} + device deletion'));
      return;
    }

    const userDetailMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userDetailMatch && request.method === 'GET') {
      const user = await adapter.getUser(decodeURIComponent(userDetailMatch[1]));
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'GET /_synapse/admin/v2/users/{user_id}'));
      return;
    }

    const userDevicesMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/devices$/);
    if (userDevicesMatch && request.method === 'GET') {
      const devices = await adapter.listUserDevices(decodeURIComponent(userDevicesMatch[1]));
      if (!devices) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(devices, 'GET /_synapse/admin/v2/users/{user_id}/devices'));
      return;
    }

    const statusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && request.method === 'PATCH') {
      const userId = decodeURIComponent(statusMatch[1]);
      const body = await readBody(request);
      const user = await adapter.setUserStatus(userId, body.disabled, { actor: adminActor(request) });
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'PUT /_synapse/admin/v2/users/{user_id}'));
      return;
    }

    const passwordMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
    if (passwordMatch && request.method === 'PATCH') {
      const user = await adapter.changeUserPassword(decodeURIComponent(passwordMatch[1]), await readBody(request), { actor: adminActor(request) });
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'PUT /_synapse/admin/v2/users/{user_id}'));
      return;
    }

    const adminMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/admin$/);
    if (adminMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const user = await adapter.setUserAdmin(decodeURIComponent(adminMatch[1]), body.admin, { actor: adminActor(request) });
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'PUT /_synapse/admin/v2/users/{user_id}'));
      return;
    }

    const logoutMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/logout$/);
    if (logoutMatch && request.method === 'POST') {
      const user = await adapter.forceLogoutUser(decodeURIComponent(logoutMatch[1]), { actor: adminActor(request) });
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'GET /_synapse/admin/v1/whois/{user_id} + device deletion'));
      return;
    }

    const deleteUserMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteUserMatch && request.method === 'DELETE') {
      const user = await adapter.deleteUser(decodeURIComponent(deleteUserMatch[1]), { actor: adminActor(request) });
      if (!user) {
        sendJson(response, 404, { error: 'user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(user, 'POST /_synapse/admin/v1/deactivate/{user_id}'));
      return;
    }

    if (pathname === '/api/admin/rooms' && request.method === 'GET') {
      const rooms = await adapter.listRooms();
      sendJson(response, 200, withSynapseMapping(rooms, 'GET /_synapse/admin/v1/rooms'));
      return;
    }

    if (pathname === '/api/admin/public-rooms' && request.method === 'GET') {
      const rooms = await adapter.listPublicRooms();
      sendJson(response, 200, withSynapseMapping(rooms, 'GET /_matrix/client/v3/publicRooms'));
      return;
    }

    if (pathname === '/api/admin/rooms/bulk' && request.method === 'POST') {
      const result = await adapter.bulkUpdateRooms(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'DELETE /_synapse/admin/v1/rooms/{room_id} + media quarantine'));
      return;
    }

    const roomDetailMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)$/);
    if (roomDetailMatch && request.method === 'GET') {
      const room = await adapter.getRoom(decodeURIComponent(roomDetailMatch[1]));
      if (!room) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(room, 'GET /_synapse/admin/v1/rooms/{room_id} + members + state'));
      return;
    }

    const closeRoomMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)\/close$/);
    if (closeRoomMatch && request.method === 'POST') {
      const room = await adapter.closeRoom(decodeURIComponent(closeRoomMatch[1]), { actor: adminActor(request) });
      if (!room) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(room, 'DELETE /_synapse/admin/v1/rooms/{room_id}'));
      return;
    }

    const makeAdminMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)\/make-admin$/);
    if (makeAdminMatch && request.method === 'POST') {
      const body = await readBody(request);
      const room = await adapter.makeRoomAdmin(decodeURIComponent(makeAdminMatch[1]), body.userId, { actor: adminActor(request) });
      if (!room) {
        sendJson(response, 404, { error: 'room_or_user_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(room, 'POST /_synapse/admin/v1/rooms/{room_id}/make_room_admin'));
      return;
    }

    if (pathname === '/api/admin/media' && request.method === 'GET') {
      const media = await adapter.listMedia({
        roomId: searchParams.get('roomId') || '',
        userId: searchParams.get('userId') || '',
      });
      sendJson(response, 200, withSynapseMapping(media, 'GET /_synapse/admin/v1/room/{room_id}/media'));
      return;
    }

    if (pathname === '/api/admin/media/cleanup' && request.method === 'POST') {
      const result = await adapter.cleanupMedia({ actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'DELETE /_synapse/admin/v1/media/{server_name}/{media_id}'));
      return;
    }

    if (pathname === '/api/admin/media/bulk' && request.method === 'POST') {
      const result = await adapter.bulkUpdateMedia(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'POST /_synapse/admin/v1/media/quarantine/{server_name}/{media_id} + DELETE media'));
      return;
    }

    const roomMediaQuarantineMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)\/media\/quarantine$/);
    if (roomMediaQuarantineMatch && request.method === 'POST') {
      const result = await adapter.quarantineRoomMedia(decodeURIComponent(roomMediaQuarantineMatch[1]), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'POST /_synapse/admin/v1/room/{room_id}/media/quarantine'));
      return;
    }

    const userMediaQuarantineMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/media\/quarantine$/);
    if (userMediaQuarantineMatch && request.method === 'POST') {
      const result = await adapter.quarantineUserMedia(decodeURIComponent(userMediaQuarantineMatch[1]), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'POST /_synapse/admin/v1/user/{user_id}/media/quarantine'));
      return;
    }

    const quarantineMatch = pathname.match(/^\/api\/admin\/media\/([^/]+)\/quarantine$/);
    if (quarantineMatch && request.method === 'POST') {
      const media = await adapter.quarantineMedia(decodeURIComponent(quarantineMatch[1]), { actor: adminActor(request) });
      if (!media) {
        sendJson(response, 404, { error: 'media_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(media, 'POST /_synapse/admin/v1/media/quarantine/{server_name}/{media_id}'));
      return;
    }

    const deleteMediaMatch = pathname.match(/^\/api\/admin\/media\/([^/]+)$/);
    if (deleteMediaMatch && request.method === 'DELETE') {
      const media = await adapter.deleteMedia(decodeURIComponent(deleteMediaMatch[1]), { actor: adminActor(request) });
      if (!media) {
        sendJson(response, 404, { error: 'media_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(media, 'DELETE /_synapse/admin/v1/media/{server_name}/{media_id}'));
      return;
    }

    if (pathname === '/api/admin/reports' && request.method === 'GET') {
      const reports = await adapter.listReports();
      sendJson(response, 200, withSynapseMapping(reports, 'GET /_synapse/admin/v1/event_reports'));
      return;
    }

    if (pathname === '/api/admin/reports/bulk-handle' && request.method === 'POST') {
      const result = await adapter.bulkHandleReports(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 200, withSynapseMapping(result, 'GET /_synapse/admin/v1/event_reports + related admin actions'));
      return;
    }

    const reportDetailMatch = pathname.match(/^\/api\/admin\/reports\/([^/]+)$/);
    if (reportDetailMatch && request.method === 'GET') {
      const report = await adapter.getReport(decodeURIComponent(reportDetailMatch[1]));
      if (!report) {
        sendJson(response, 404, { error: 'report_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(report, 'GET /_synapse/admin/v1/event_reports/{report_id}'));
      return;
    }

    const handleReportMatch = pathname.match(/^\/api\/admin\/reports\/([^/]+)\/handle$/);
    if (handleReportMatch && request.method === 'POST') {
      const body = await readBody(request);
      const report = await adapter.handleReport(decodeURIComponent(handleReportMatch[1]), body.action, { actor: adminActor(request) });
      if (!report) {
        sendJson(response, 404, { error: 'report_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(report, 'GET /_synapse/admin/v1/event_reports/{report_id} + related admin actions'));
      return;
    }

    const resolveReportMatch = pathname.match(/^\/api\/admin\/reports\/([^/]+)\/resolve$/);
    if (resolveReportMatch && request.method === 'POST') {
      const report = await adapter.resolveReport(decodeURIComponent(resolveReportMatch[1]), { actor: adminActor(request) });
      if (!report) {
        sendJson(response, 404, { error: 'report_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(report, 'DELETE /_synapse/admin/v1/event_reports/{report_id}'));
      return;
    }

    if (pathname === '/api/admin/notices' && request.method === 'POST') {
      const notice = await adapter.sendNotice(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 201, withSynapseMapping(notice, 'POST /_synapse/admin/v1/send_server_notice'));
      return;
    }

    if (pathname === '/api/admin/notices/bulk' && request.method === 'POST') {
      const result = await adapter.sendBulkNotices(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 201, withSynapseMapping(result, 'POST /_synapse/admin/v1/send_server_notice'));
      return;
    }

    if (pathname === '/api/admin/audit-logs' && request.method === 'GET') {
      const logs = await adapter.listAuditLogs({
        keyword: searchParams.get('keyword') || '',
        actor: searchParams.get('actor') || '',
        module: searchParams.get('module') || '',
        limit: searchParams.get('limit') || 80,
      });
      const exported = formatAuditLogs(logs, searchParams.get('format'));
      if (exported !== null) {
        sendJson(response, 200, { data: exported, meta: { mode: adapter.mode, format: searchParams.get('format') } });
        return;
      }
      sendJson(response, 200, { data: logs, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/stats' && request.method === 'GET') {
      const stats = await adapter.getStats();
      sendJson(response, 200, { data: stats, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/overview' && request.method === 'GET') {
      const overview = await adapter.getOperationsOverview();
      sendJson(response, 200, { data: overview, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/search' && request.method === 'GET') {
      const results = await adapter.globalSearch(searchParams.get('q') || '');
      sendJson(response, 200, { data: results, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/system-status' && request.method === 'GET') {
      const status = await adapter.getSystemStatus();
      sendJson(response, 200, { data: status, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/runtime-config' && request.method === 'GET') {
      sendJson(response, 200, { data: { ...config, checks: [...configChecks(config), ...authChecks(admins, demoAppToken)] }, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/deploy-env' && request.method === 'GET') {
      sendJson(response, 200, { data: deployEnvChecklist(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/secrets/generate' && request.method === 'POST') {
      sendJson(response, 200, { data: generateSecrets(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/storage-status' && request.method === 'GET') {
      sendJson(response, 200, { data: storageStatus(config.mockDbPath), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/auth-status' && request.method === 'GET') {
      sendJson(response, 200, { data: authStateStatus(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/auth-status/cleanup' && request.method === 'POST') {
      sendJson(response, 200, { data: cleanupExpiredAdminLocks(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/self-check' && request.method === 'GET') {
      const stats = await adapter.getStats();
      const status = await adapter.getSystemStatus();
      const storage = storageStatus(config.mockDbPath);
      const data = buildSelfCheck({
        stats,
        status,
        storage,
        authStatus: authStateStatus(),
        checks: [...configChecks(config), ...authChecks(admins, demoAppToken)],
      });
      sendJson(response, 200, { data, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/readiness' && request.method === 'GET') {
      const stats = await adapter.getStats();
      const status = await adapter.getSystemStatus();
      const storage = storageStatus(config.mockDbPath);
      const data = buildReadiness({
        stats,
        status,
        storage,
        authStatus: authStateStatus(),
        checks: [...configChecks(config), ...authChecks(admins, demoAppToken)],
      });
      sendJson(response, 200, { data, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/feature-coverage' && request.method === 'GET') {
      sendJson(response, 200, { data: buildFeatureCoverage(), meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/feature-coverage/export' && request.method === 'GET') {
      const format = searchParams.get('format') || 'markdown';
      const coverage = buildFeatureCoverage();
      sendJson(response, 200, { data: formatFeatureCoverage(coverage, format), meta: { mode: adapter.mode, format } });
      return;
    }

    if (pathname === '/api/admin/release-report' && request.method === 'GET') {
      const format = searchParams.get('format') || 'markdown';
      const stats = await adapter.getStats();
      const status = await adapter.getSystemStatus();
      const storage = storageStatus(config.mockDbPath);
      const checks = [...configChecks(config), ...authChecks(admins, demoAppToken)];
      const report = {
        generatedAt: new Date().toISOString(),
        mode: adapter.mode,
        readiness: buildReadiness({ stats, status, storage, authStatus: authStateStatus(), checks }),
        coverage: buildFeatureCoverage(),
        deployEnv: deployEnvChecklist(),
        overview: await adapter.getOperationsOverview(),
      };
      sendJson(response, 200, { data: formatReleaseReport(report, format), meta: { mode: adapter.mode, format } });
      return;
    }

    if (pathname === '/api/admin/reset-demo' && request.method === 'POST') {
      await adapter.resetDemoData({ actor: adminActor(request) });
      sendJson(response, 200, { data: { ok: true }, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/backup' && request.method === 'GET') {
      const backup = await adapter.exportBackup();
      sendJson(response, 200, { data: backup, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/backup/import' && request.method === 'POST') {
      const result = await adapter.importBackup(await readBody(request), { actor: adminActor(request) });
      if (!result) {
        sendJson(response, 400, { error: 'invalid_backup' });
        return;
      }
      sendJson(response, 200, { data: result, meta: { mode: adapter.mode } });
      return;
    }

    const purgeHistoryMatch = pathname.match(/^\/api\/admin\/rooms\/([^/]+)\/purge-history$/);
    if (purgeHistoryMatch && request.method === 'POST') {
      const job = await adapter.purgeRoomHistory(decodeURIComponent(purgeHistoryMatch[1]), { actor: adminActor(request) });
      if (!job) {
        sendJson(response, 404, { error: 'room_not_found' });
        return;
      }
      sendJson(response, 202, withSynapseMapping(job, 'POST /_synapse/admin/v1/purge_history/{room_id}'));
      return;
    }

    const purgeStatusMatch = pathname.match(/^\/api\/admin\/purge-history\/([^/]+)$/);
    if (purgeStatusMatch && request.method === 'GET') {
      const job = await adapter.getPurgeStatus(decodeURIComponent(purgeStatusMatch[1]));
      if (!job) {
        sendJson(response, 404, { error: 'purge_not_found' });
        return;
      }
      sendJson(response, 200, withSynapseMapping(job, 'GET /_synapse/admin/v1/purge_history_status/{purge_id}'));
      return;
    }

    if (pathname === '/api/admin/operation-jobs' && request.method === 'GET') {
      const jobs = await adapter.listOperationJobs();
      sendJson(response, 200, { data: jobs, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/app-config' && request.method === 'GET') {
      const config = await adapter.getAppConfig();
      sendJson(response, 200, { data: config, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/app-config' && request.method === 'PUT') {
      const config = await adapter.updateAppConfig(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 200, { data: config, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/registration-tokens' && request.method === 'GET') {
      const tokens = await adapter.listRegistrationTokens();
      sendJson(response, 200, { data: tokens, meta: { mode: adapter.mode } });
      return;
    }

    if (pathname === '/api/admin/registration-tokens' && request.method === 'POST') {
      const token = await adapter.createRegistrationToken(await readBody(request), { actor: adminActor(request) });
      sendJson(response, 201, { data: token, meta: { mode: adapter.mode } });
      return;
    }

    const tokenStatusMatch = pathname.match(/^\/api\/admin\/registration-tokens\/([^/]+)\/status$/);
    if (tokenStatusMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const token = await adapter.setRegistrationTokenStatus(decodeURIComponent(tokenStatusMatch[1]), body.disabled, { actor: adminActor(request) });
      if (!token) {
        sendJson(response, 404, { error: 'token_not_found' });
        return;
      }
      sendJson(response, 200, { data: token, meta: { mode: adapter.mode } });
      return;
    }

    const deleteTokenMatch = pathname.match(/^\/api\/admin\/registration-tokens\/([^/]+)$/);
    if (deleteTokenMatch && request.method === 'DELETE') {
      const token = await adapter.deleteRegistrationToken(decodeURIComponent(deleteTokenMatch[1]), { actor: adminActor(request) });
      if (!token) {
        sendJson(response, 404, { error: 'token_not_found' });
        return;
      }
      sendJson(response, 200, { data: token, meta: { mode: adapter.mode } });
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    sendJson(response, 400, { error: 'bad_request', message: error.message });
  }
}

createServer(handle).listen(port, '127.0.0.1', () => {
  console.log(`Admin backend listening on http://127.0.0.1:${port} (${adapter.mode})`);
});
