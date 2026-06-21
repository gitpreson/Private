import { loadStore, resetStore, saveStore } from '../lib/store.mjs';

const defaultState = {
  users: [
    { userId: '@alice:localhost', displayName: 'Alice Chen', disabled: false, admin: false, devices: 3, rooms: 18, lastSeen: '2 分钟前', createdAt: '2026-06-01', ip: '127.0.0.1' },
    { userId: '@ops:localhost', displayName: '运维值班', disabled: false, admin: true, devices: 5, rooms: 42, lastSeen: '刚刚', createdAt: '2026-06-03', ip: '127.0.0.1' },
    { userId: '@risk001:localhost', displayName: '待复核用户', disabled: true, admin: false, devices: 1, rooms: 4, lastSeen: '昨天', createdAt: '2026-06-10', ip: '127.0.0.1' },
  ],
  userDevices: {
    '@alice:localhost': [
      { deviceId: 'IPHONE-15', name: 'iPhone 15 Pro', lastSeen: '2 分钟前', ip: '127.0.0.1' },
      { deviceId: 'MACBOOK', name: 'MacBook Pro', lastSeen: '18 分钟前', ip: '127.0.0.1' },
      { deviceId: 'WEB', name: 'Web Preview', lastSeen: '刚刚', ip: '127.0.0.1' },
    ],
    '@ops:localhost': [
      { deviceId: 'OPS-WEB', name: 'Web Console', lastSeen: '刚刚', ip: '127.0.0.1' },
      { deviceId: 'OPS-MOBILE', name: 'Android', lastSeen: '1 小时前', ip: '127.0.0.1' },
    ],
    '@risk001:localhost': [
      { deviceId: 'RISK-WEB', name: 'Unknown Browser', lastSeen: '昨天', ip: '127.0.0.1' },
    ],
  },
  rooms: [
    { roomId: '!safe:localhost', name: '产品安全群', members: 128, encrypted: true, status: '私密群' },
    { roomId: '!ops:localhost', name: '运维值班', members: 36, encrypted: true, status: '私密群' },
    { roomId: '!support:localhost', name: '客户支持', members: 82, encrypted: false, status: '禁言关闭' },
  ],
  roomMembers: {
    'room-safe': ['@alice:localhost', '@ops:localhost'],
    'room-ops': ['@alice:localhost', '@ops:localhost'],
    'room-linda': ['@alice:localhost', '@linda:localhost'],
    'room-bridge': ['@alice:localhost'],
  },
  media: [
    { mediaId: 'mxc://localhost/pdf001', type: 'PDF', name: 'media-cleanup-plan.pdf', owner: '@ops:localhost', ownerType: 'user', userId: '@ops:localhost', roomId: '!ops:localhost', size: '2.4 MB', createdAt: '2026-06-13' },
    { mediaId: 'mxc://localhost/img001', type: 'IMG', name: 'login-flow.png', owner: '产品安全群', ownerType: 'room', roomId: '!safe:localhost', size: '860 KB', createdAt: '2026-06-12' },
  ],
  reports: [
    { reportId: 'rpt-1001', level: '高', title: '疑似违规图片', summary: '来自产品安全群，等待媒体隔离', reporter: '@alice:localhost', targetUserId: '@risk001:localhost', roomId: '!safe:localhost', mediaId: 'mxc://localhost/img001', eventId: '$event-media-1001', status: '待处理' },
    { reportId: 'rpt-1002', level: '中', title: '骚扰消息举报', summary: '@risk001:localhost，建议禁用账号', reporter: '@ops:localhost', targetUserId: '@risk001:localhost', roomId: '!support:localhost', eventId: '$event-text-1002', status: '待处理' },
  ],
  registrationTokens: [
    { token: 'WELCOME2026', usageLimit: 20, used: 0, disabled: false, createdAt: '2026-06-14' },
  ],
  notices: [],
  purgeJobs: [],
  appSessions: new Map(),
  appConfig: {
    brandName: 'Private IM',
    homeserverUrl: 'http://localhost:8008',
    federationEnabled: false,
    registrationEnabled: false,
    e2eeDefault: true,
    maxUploadMb: 100,
  },
  appPreferences: {
    notifications: true,
    doNotDisturb: false,
    messagePreview: true,
  },
  conversations: [
    {
      roomId: 'room-safe',
      type: '群聊',
      name: '产品安全群',
      avatar: 'A',
      color: 'teal',
      meta: '128 位成员 · E2EE 已开启 · localhost',
      time: '10:42',
      unread: 6,
      pinned: true,
      muted: false,
      archived: false,
      preview: '服务端通知策略已经更新，请查看后台配置。',
      messages: [
        { sender: 'Linda Chen', content: '用户管理第一版建议先包含创建、禁用、改密、设备列表和强制下线。', time: '10:21', color: 'blue' },
        { sender: '运维值班', content: 'media-cleanup-plan.pdf', time: '10:28', color: 'amber', kind: 'file' },
        { sender: '我', content: '收到。后台第一版按用户、群聊、媒体、举报、系统通知五个模块推进。', time: '10:35', color: 'mine' },
        { sender: 'Matrix Bridge', content: '房间状态同步正常，群成员列表和媒体列表接口等待后台接入。', time: '10:42', color: 'rose' },
      ],
    },
    {
      roomId: 'room-linda',
      type: '单聊',
      name: 'Linda Chen',
      avatar: 'L',
      color: 'blue',
      meta: '在线 · 3 台设备 · E2EE 已开启',
      time: '09:18',
      unread: 0,
      pinned: false,
      muted: false,
      archived: false,
      preview: '测试账号已经创建，稍后发你设备列表。',
      messages: [
        { sender: 'Linda Chen', content: '测试账号已经创建，稍后发你设备列表。', time: '09:18', color: 'blue' },
        { sender: '我', content: '好的，我会先在本地 Synapse 上验证登录和设备列表。', time: '09:20', color: 'mine' },
      ],
    },
    {
      roomId: 'room-ops',
      type: '群聊',
      name: '运维值班',
      avatar: 'O',
      color: 'amber',
      meta: '36 位成员 · 私密群 · localhost',
      time: '昨天',
      unread: 2,
      pinned: false,
      muted: true,
      archived: false,
      preview: '媒体存储占用 68%，建议本周清理历史文件。',
      messages: [
        { sender: '运维值班', content: '媒体存储占用 68%，建议本周清理历史文件。', time: '昨天', color: 'amber' },
        { sender: '我', content: '先把清理任务放到第二阶段系统维护模块。', time: '昨天', color: 'mine' },
      ],
    },
    {
      roomId: 'room-bridge',
      type: '单聊',
      name: 'Matrix Bridge',
      avatar: 'M',
      color: 'rose',
      meta: '服务账号 · 只读通知 · localhost',
      time: '周五',
      unread: 0,
      pinned: false,
      muted: false,
      archived: false,
      preview: '端到端加密已为新房间默认开启。',
      messages: [
        { sender: 'Matrix Bridge', content: '端到端加密已为新房间默认开启。', time: '周五', color: 'rose' },
        { sender: 'Matrix Bridge', content: 'Admin API 仅允许后台服务从内网访问。', time: '周五', color: 'rose' },
      ],
    },
  ],
  auditLogs: [
    '10:42 admin 创建用户 @alice:localhost',
    '10:28 auditor 隔离媒体 media-cleanup-plan.pdf',
    '09:51 admin 查看房间 产品安全群',
  ],
};

let state = loadStore(defaultState);

function persist() {
  saveStore(state);
}

function serializableState() {
  const { appSessions, ...serializable } = state;
  return structuredClone(serializable);
}

function addOperationJob(type, title, detail, options = {}) {
  state.operationJobs ||= [];
  const job = {
    jobId: `job-${Date.now()}-${state.operationJobs.length + 1}`,
    type,
    title,
    detail,
    status: 'complete',
    actor: auditActor(options),
    createdAt: new Date().toISOString(),
  };
  state.operationJobs.unshift(job);
  return job;
}

function normalizeAuditLog(entry, index = 0) {
  if (typeof entry === 'object' && entry !== null) return entry;
  const raw = String(entry || '');
  const parts = raw.split(' ');
  const time = parts[0] || '-';
  const actor = parts[1] || 'system';
  const action = parts.slice(2, 4).join(' ') || raw;
  const target = parts.slice(4).join(' ');
  return {
    id: `audit-${index}-${Buffer.from(raw).toString('base64url').slice(0, 10)}`,
    time,
    actor,
    module: actor.startsWith('@') ? 'app' : 'admin',
    action,
    target,
    raw,
  };
}

function auditActor(options = {}) {
  return options.actor || 'admin';
}

function matchUser(userId) {
  return state.users.find((item) => item.userId === userId);
}

function matrixRoomId(appRoomId) {
  if (appRoomId.startsWith('group-')) return `!${appRoomId}:localhost`;
  return {
    'room-safe': '!safe:localhost',
    'room-ops': '!ops:localhost',
    'room-linda': '!linda:localhost',
    'room-bridge': '!bridge:localhost',
  }[appRoomId] || appRoomId;
}

function roomMemberUsers(roomId, type) {
  const memberIds = state.roomMembers?.[roomId] || [];
  const members = memberIds.map((userId) => matchUser(userId)).filter(Boolean);
  if (type !== '群聊') {
    return [
      { userId: '@alice:localhost', displayName: 'Alice Chen', role: 'me' },
      ...members.filter((user) => user.userId !== '@alice:localhost').map((user) => ({
        userId: user.userId,
        displayName: user.displayName,
        role: 'member',
      })),
    ];
  }
  return members.map((user, index) => ({
    userId: user.userId,
    displayName: user.displayName,
    role: user.userId === '@alice:localhost' ? 'owner' : user.admin || index === 1 ? 'admin' : 'member',
  }));
}

function syncRoomMemberCount(roomId) {
  const room = state.rooms.find((item) => item.roomId === matrixRoomId(roomId));
  const conversation = state.conversations.find((item) => item.roomId === roomId);
  const count = state.roomMembers?.[roomId]?.length || 0;
  if (room) room.members = count;
  if (conversation && conversation.type === '群聊') {
    conversation.meta = `${count} 位成员 · E2EE 已开启 · localhost`;
  }
}

function normalizeRegistrationToken(token) {
  const usageLimit = Number(token.usageLimit || 0);
  const used = Number(token.used || 0);
  const remaining = Math.max(0, usageLimit - used);
  const usagePercent = usageLimit ? Math.min(100, Math.round((used / usageLimit) * 100)) : 0;
  return {
    ...token,
    usageLimit,
    used,
    remaining,
    usagePercent,
    statusLabel: token.disabled ? '已禁用' : remaining <= 0 ? '已用完' : '可用',
  };
}

function normalizeMessages(conversation) {
  conversation.messages.forEach((message, index) => {
    if (!message.messageId) message.messageId = `${conversation.roomId}-msg-${index + 1}`;
  });
  return conversation.messages;
}

export function createMockAdapter() {
  return {
    mode: 'mock',

    async listUsers({ keyword = '' }) {
      const lowerKeyword = keyword.toLowerCase();
      return state.users.filter((user) => {
        const text = `${user.userId} ${user.displayName}`.toLowerCase();
        return !lowerKeyword || text.includes(lowerKeyword);
      });
    },

    async globalSearch(keyword = '') {
      const lowerKeyword = String(keyword || '').trim().toLowerCase();
      if (!lowerKeyword) return [];
      const match = (text) => String(text || '').toLowerCase().includes(lowerKeyword);
      const users = state.users
        .filter((user) => match(`${user.userId} ${user.displayName}`))
        .map((user) => ({
          type: '用户',
          title: user.displayName,
          subtitle: `${user.userId} · ${user.disabled ? '禁用' : '正常'} · ${user.devices} 台设备`,
          target: '#users',
          id: user.userId,
        }));
      const rooms = state.rooms
        .filter((room) => match(`${room.roomId} ${room.name} ${room.status}`))
        .map((room) => ({
          type: '群聊',
          title: room.name,
          subtitle: `${room.roomId} · ${room.members} 成员 · ${room.status}`,
          target: '#rooms',
          id: room.roomId,
        }));
      const media = state.media
        .filter((item) => match(`${item.mediaId} ${item.name} ${item.owner} ${item.type}`))
        .map((item) => ({
          type: '文件',
          title: item.name,
          subtitle: `${item.owner} · ${item.size} · ${item.quarantined ? '已隔离' : '可访问'}`,
          target: '#media',
          id: item.mediaId,
        }));
      const reports = state.reports
        .filter((report) => match(`${report.reportId} ${report.title} ${report.summary} ${report.targetUserId || ''}`))
        .map((report) => ({
          type: '举报',
          title: report.title,
          subtitle: `${report.level} · ${report.summary}`,
          target: '#reports',
          id: report.reportId,
        }));
      return [...users, ...rooms, ...media, ...reports].slice(0, 20);
    },

    async listRegistrationTokens() {
      return (state.registrationTokens || []).map(normalizeRegistrationToken);
    },

    async createRegistrationToken(input, options = {}) {
      const token = {
        token: input.token || `INVITE${Date.now().toString().slice(-5)}`,
        usageLimit: Number(input.usageLimit || 10),
        used: 0,
        disabled: false,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      state.registrationTokens.unshift(token);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 创建邀请码 ${token.token}`);
      persist();
      return normalizeRegistrationToken(token);
    },

    async setRegistrationTokenStatus(tokenValue, disabled, options = {}) {
      const token = (state.registrationTokens || []).find((item) => item.token === tokenValue);
      if (!token) return null;
      token.disabled = Boolean(disabled);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} ${token.disabled ? '禁用' : '启用'}邀请码 ${token.token}`);
      persist();
      return normalizeRegistrationToken(token);
    },

    async deleteRegistrationToken(tokenValue, options = {}) {
      const index = (state.registrationTokens || []).findIndex((item) => item.token === tokenValue);
      if (index === -1) return null;
      const [token] = state.registrationTokens.splice(index, 1);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 删除邀请码 ${token.token}`);
      persist();
      return normalizeRegistrationToken(token);
    },

    async getUser(userId) {
      const user = matchUser(userId);
      if (!user) return null;
      return {
        ...user,
        joinedRooms: state.rooms.slice(0, Math.min(3, state.rooms.length)).map((room) => ({
          roomId: room.roomId,
          name: room.name,
        })),
      };
    },

    async listUserDevices(userId) {
      if (!matchUser(userId)) return null;
      return state.userDevices[userId] || [];
    },

    async createUser(input, options = {}) {
      const user = {
        userId: input.userId || `@${input.username || 'newuser'}:localhost`,
        displayName: input.displayName || 'New User',
        disabled: false,
        admin: Boolean(input.admin),
        devices: 0,
        rooms: 0,
        lastSeen: '未登录',
      };
      state.users.unshift(user);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 创建用户 ${user.userId}`);
      persist();
      return user;
    },

    async setUserStatus(userId, disabled, options = {}) {
      const user = matchUser(userId);
      if (!user) return null;
      user.disabled = Boolean(disabled);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} ${user.disabled ? '禁用' : '解封'}用户 ${user.userId}`);
      persist();
      return user;
    },

    async changeUserPassword(userId, input = {}, options = {}) {
      const user = matchUser(userId);
      if (!user) return null;
      user.passwordChangedAt = new Date().toISOString();
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 修改用户密码 ${user.userId}`);
      persist();
      return user;
    },

    async setUserAdmin(userId, admin, options = {}) {
      const user = matchUser(userId);
      if (!user) return null;
      user.admin = Boolean(admin);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} ${user.admin ? '设置' : '取消'}管理员 ${user.userId}`);
      persist();
      return user;
    },

    async forceLogoutUser(userId, options = {}) {
      const user = matchUser(userId);
      if (!user) return null;
      state.userDevices[userId] = [];
      user.devices = 0;
      user.lastSeen = '已强制下线';
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 强制踢下线 ${user.userId}`);
      persist();
      return user;
    },

    async deleteUser(userId, options = {}) {
      const index = state.users.findIndex((item) => item.userId === userId);
      if (index === -1) return null;
      const [user] = state.users.splice(index, 1);
      delete state.userDevices[userId];
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 注销用户 ${user.userId}`);
      persist();
      return user;
    },

    async bulkUpdateUsers(input = {}, options = {}) {
      const userIds = Array.isArray(input.userIds) ? input.userIds : [];
      const action = input.action;
      const handled = [];
      const skipped = [];
      for (const userId of userIds) {
        let user = null;
        if (action === 'ban') user = await this.setUserStatus(userId, true, options);
        if (action === 'unban') user = await this.setUserStatus(userId, false, options);
        if (action === 'logout') user = await this.forceLogoutUser(userId, options);
        if (user) handled.push(user.userId);
        else skipped.push(userId);
      }
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 批量${action === 'ban' ? '禁用' : action === 'unban' ? '解封' : '踢下线'}用户 ${handled.length} 个`);
      persist();
      return { action, handled, skipped, count: handled.length };
    },

    async listRooms() {
      return state.rooms;
    },

    async listPublicRooms() {
      return state.rooms.filter((room) => !room.encrypted || room.status.includes('公开'));
    },

    async getRoom(roomId) {
      const room = state.rooms.find((item) => item.roomId === roomId || item.name === roomId);
      if (!room) return null;
      return {
        ...room,
        topic: `${room.name} 的本地演示群资料`,
        membersList: state.users.map((user, index) => ({
          userId: user.userId,
          displayName: user.displayName,
          role: index === 0 ? 'owner' : room.admins?.includes(user.userId) || index === 1 ? 'admin' : 'member',
        })),
        stateEvents: [
          { type: 'm.room.create', value: 'created' },
          { type: 'm.room.encryption', value: room.encrypted ? 'enabled' : 'disabled' },
          { type: 'm.room.join_rules', value: room.status },
        ],
      };
    },

    async makeRoomAdmin(roomId, userId, options = {}) {
      const room = state.rooms.find((item) => item.roomId === roomId || item.name === roomId);
      if (!room || !matchUser(userId)) return null;
      room.admins = Array.from(new Set([...(room.admins || []), userId]));
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 设置 ${userId} 为 ${room.name} 群管理员`);
      persist();
      return room;
    },

    async closeRoom(roomId, options = {}) {
      const room = state.rooms.find((item) => item.roomId === roomId || item.name === roomId);
      if (!room) return null;
      room.status = '已解散';
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 解散群聊 ${room.name}`);
      persist();
      return room;
    },

    async bulkUpdateRooms(input = {}, options = {}) {
      const roomIds = Array.isArray(input.roomIds) ? input.roomIds : [];
      const action = input.action;
      const handled = [];
      const skipped = [];
      for (const roomId of roomIds) {
        let result = null;
        if (action === 'close') result = await this.closeRoom(roomId, options);
        if (action === 'quarantine-media') result = await this.quarantineRoomMedia(roomId, options);
        if (result) handled.push(roomId);
        else skipped.push(roomId);
      }
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 批量${action === 'close' ? '解散群聊' : '隔离群媒体'} ${handled.length} 个`);
      persist();
      return { action, handled, skipped, count: handled.length };
    },

    async listMedia(filters = {}) {
      return state.media.filter((media) => {
        if (filters.roomId && media.roomId !== filters.roomId && media.owner !== filters.roomId) return false;
        if (filters.userId && media.userId !== filters.userId && media.owner !== filters.userId) return false;
        return true;
      });
    },

    async quarantineMedia(mediaId, options = {}) {
      const media = state.media.find((item) => item.mediaId === mediaId || item.name === mediaId);
      if (!media) return null;
      media.quarantined = true;
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 隔离媒体 ${media.name}`);
      persist();
      return media;
    },

    async quarantineRoomMedia(roomId, options = {}) {
      const items = state.media.filter((media) => media.roomId === roomId || media.owner === roomId);
      items.forEach((media) => {
        media.quarantined = true;
      });
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 隔离房间媒体 ${roomId}，共 ${items.length} 个`);
      persist();
      return { roomId, count: items.length };
    },

    async quarantineUserMedia(userId, options = {}) {
      const items = state.media.filter((media) => media.userId === userId || media.owner === userId);
      items.forEach((media) => {
        media.quarantined = true;
      });
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 隔离用户媒体 ${userId}，共 ${items.length} 个`);
      persist();
      return { userId, count: items.length };
    },

    async deleteMedia(mediaId, options = {}) {
      const index = state.media.findIndex((item) => item.mediaId === mediaId || item.name === mediaId);
      if (index === -1) return null;
      const [media] = state.media.splice(index, 1);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 删除媒体 ${media.name}`);
      persist();
      return media;
    },

    async bulkUpdateMedia(input = {}, options = {}) {
      const mediaIds = Array.isArray(input.mediaIds) ? input.mediaIds : [];
      const action = input.action;
      const handled = [];
      const skipped = [];
      for (const mediaId of mediaIds) {
        let media = null;
        if (action === 'quarantine') media = await this.quarantineMedia(mediaId, options);
        if (action === 'delete') media = await this.deleteMedia(mediaId, options);
        if (media) handled.push(mediaId);
        else skipped.push(mediaId);
      }
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 批量${action === 'delete' ? '删除' : '隔离'}媒体 ${handled.length} 个`);
      persist();
      return { action, handled, skipped, count: handled.length };
    },

    async cleanupMedia(options = {}) {
      const before = state.media.length;
      state.media = state.media.filter((media) => !media.quarantined);
      const removed = before - state.media.length;
      addOperationJob('media-cleanup', '清理隔离媒体', `删除 ${removed} 个已隔离媒体`, options);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 清理已隔离媒体 ${removed} 个`);
      persist();
      return { removed, remaining: state.media.length };
    },

    async listReports() {
      return state.reports;
    },

    async getReport(reportId) {
      const report = state.reports.find((item) => item.reportId === reportId || item.title === reportId);
      if (!report) return null;
      return {
        ...report,
        messagePreview: report.mediaId ? '用户上传了一张疑似违规图片。' : '用户连续发送骚扰内容，已被成员举报。',
        history: [
          '举报已提交',
          report.status === '已处理' ? '管理员已处理' : '等待管理员处理',
        ],
      };
    },

    async resolveReport(reportId, options = {}) {
      const index = state.reports.findIndex((item) => item.reportId === reportId || item.title === reportId);
      if (index === -1) return null;
      const [report] = state.reports.splice(index, 1);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 处理举报 ${report.title}`);
      persist();
      return report;
    },

    async handleReport(reportId, action, options = {}) {
      const report = await this.getReport(reportId);
      if (!report) return null;
      if (action === 'ban-user' && report.targetUserId) await this.setUserStatus(report.targetUserId, true, options);
      if (action === 'quarantine-media' && report.mediaId) await this.quarantineMedia(report.mediaId, options);
      if (action === 'close-room' && report.roomId) await this.closeRoom(report.roomId, options);
      return this.resolveReport(reportId, options);
    },

    async bulkHandleReports(input = {}, options = {}) {
      const reportIds = input.reportIds?.length
        ? input.reportIds
        : state.reports.filter((report) => report.status !== '已处理').map((report) => report.reportId);
      const actions = new Set(input.actions?.length ? input.actions : ['resolve']);
      const handled = [];
      const skipped = [];

      for (const reportId of reportIds) {
        const report = await this.getReport(reportId);
        if (!report) {
          skipped.push({ reportId, reason: 'not_found' });
          continue;
        }
        if (actions.has('ban-user') && report.targetUserId) await this.setUserStatus(report.targetUserId, true, options);
        if (actions.has('quarantine-media') && report.mediaId) await this.quarantineMedia(report.mediaId, options);
        if (actions.has('quarantine-user-media') && report.targetUserId) await this.quarantineUserMedia(report.targetUserId, options);
        if (actions.has('close-room') && report.roomId) await this.closeRoom(report.roomId, options);
        const resolved = await this.resolveReport(report.reportId, options);
        handled.push({ reportId: report.reportId, title: report.title, actions: [...actions], resolved: Boolean(resolved) });
      }

      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 批量处理举报 ${handled.length} 条`);
      persist();
      return { handled, skipped, count: handled.length };
    },

    async sendNotice(input, options = {}) {
      const notice = {
        noticeId: `notice-${Date.now()}`,
        userId: input.userId,
        content: input.content,
        createdAt: new Date().toISOString(),
      };
      state.notices.unshift(notice);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 发送系统通知给 ${notice.userId}`);
      const bridge = state.conversations.find((item) => item.roomId === 'room-bridge');
      if (bridge) {
        bridge.messages.push({
          sender: 'Matrix Bridge',
          content: input.content,
          time: '刚刚',
          color: 'rose',
        });
        bridge.preview = input.content;
        bridge.time = '刚刚';
        bridge.unread += 1;
      }
      persist();
      return notice;
    },

    async sendBulkNotices(input, options = {}) {
      const userIds = (input.userIds || []).filter(Boolean);
      const notices = [];
      for (const userId of userIds) {
        notices.push(await this.sendNotice({ userId, content: input.content }, options));
      }
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 批量发送系统通知 ${notices.length} 人`);
      persist();
      return { count: notices.length, notices };
    },

    async listAuditLogs(filters = {}) {
      const keyword = String(filters.keyword || '').toLowerCase();
      const actor = String(filters.actor || '').toLowerCase();
      const module = String(filters.module || '').toLowerCase();
      const limit = Number(filters.limit || 80);
      return state.auditLogs
        .map(normalizeAuditLog)
        .filter((entry) => !keyword || entry.raw.toLowerCase().includes(keyword))
        .filter((entry) => !actor || entry.actor.toLowerCase().includes(actor))
        .filter((entry) => !module || entry.module.toLowerCase() === module)
        .slice(0, limit);
    },

    async getStats() {
      const messageCount = state.conversations.reduce((sum, conversation) => sum + conversation.messages.length, 0);
      const mediaMb = state.media.reduce((sum, media) => sum + Number.parseFloat(media.size || '0'), 0);
      return {
        users: state.users.length,
        activeUsers: state.users.filter((user) => !user.disabled).length,
        rooms: state.rooms.length,
        media: state.media.length,
        mediaStorageMb: Number(mediaMb.toFixed(1)),
        reports: state.reports.length,
        notices: state.notices.length,
        messages: messageCount,
      };
    },

    async getOperationsOverview() {
      const reports = state.reports.slice(0, 5).map((report) => ({
        id: report.reportId,
        level: report.level,
        title: report.title,
        detail: report.summary,
        target: report.targetUserId || report.mediaId || report.roomId || '-',
      }));
      const disabledUsers = state.users.filter((user) => user.disabled).length;
      const quarantinedMedia = state.media.filter((media) => media.quarantined).length;
      const recentJobs = await this.listOperationJobs();
      const audit = await this.listAuditLogs({ limit: 5 });
      return {
        risk: {
          score: Math.min(100, reports.length * 16 + disabledUsers * 8 + quarantinedMedia * 6),
          reports: reports.length,
          disabledUsers,
          quarantinedMedia,
        },
        reports,
        jobs: recentJobs.slice(0, 5),
        audit: audit.slice(0, 5),
        warnings: [
          ...(state.reports.length ? [`${state.reports.length} 条举报待处理`] : []),
          ...(quarantinedMedia ? [`${quarantinedMedia} 个媒体已隔离待清理`] : []),
          ...(state.registrationTokens.some((token) => token.disabled) ? ['存在已禁用邀请码'] : []),
        ],
      };
    },

    async getSystemStatus() {
      return {
        api: 'online',
        mode: 'mock',
        database: 'json',
        synapse: 'not_connected',
        adminApiExposure: 'internal_only',
        lastAuditLog: state.auditLogs[0] || '-',
      };
    },

    async resetDemoData(options = {}) {
      state = resetStore(defaultState);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 重置本地 Demo 数据`);
      persist();
      return true;
    },

    async exportBackup() {
      addOperationJob('backup-export', '导出本地备份', '生成 Mock 数据备份 JSON');
      persist();
      return {
        version: 1,
        mode: 'mock',
        exportedAt: new Date().toISOString(),
        data: serializableState(),
      };
    },

    async importBackup(input, options = {}) {
      if (!input?.data || !Array.isArray(input.data.users) || !Array.isArray(input.data.rooms)) return null;
      state = {
        ...structuredClone(defaultState),
        ...structuredClone(input.data),
        appSessions: new Map(),
      };
      state.auditLogs = Array.isArray(state.auditLogs) ? state.auditLogs : [];
      addOperationJob('backup-import', '导入本地备份', `导入 ${state.users.length} 个用户、${state.rooms.length} 个房间`, options);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 导入本地备份数据`);
      persist();
      return {
        users: state.users.length,
        rooms: state.rooms.length,
        media: state.media.length,
        reports: state.reports.length,
      };
    },

    async purgeRoomHistory(roomId, options = {}) {
      const roomMap = {
        '!safe:localhost': 'room-safe',
        '!ops:localhost': 'room-ops',
        '!support:localhost': 'room-ops',
        '!bridge:localhost': 'room-bridge',
      };
      const conversation = state.conversations.find((item) => item.roomId === roomId || item.roomId === roomMap[roomId]);
      if (!conversation) return null;
      const removed = Math.max(0, conversation.messages.length - 1);
      conversation.messages = conversation.messages.slice(-1);
      const job = {
        purgeId: `purge-${Date.now()}`,
        roomId,
        status: 'complete',
        removed,
        createdAt: new Date().toISOString(),
      };
      state.purgeJobs.unshift(job);
      addOperationJob('purge-history', '清理房间历史', `${roomId} 移除 ${removed} 条历史消息`, options);
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 清理房间历史 ${roomId}，移除 ${removed} 条`);
      persist();
      return job;
    },

    async getPurgeStatus(purgeId) {
      return state.purgeJobs.find((job) => job.purgeId === purgeId) || null;
    },

    async listOperationJobs() {
      return [
        ...(state.operationJobs || []),
        ...state.purgeJobs.map((job) => ({
          jobId: job.purgeId,
          type: 'purge-history',
          title: '清理房间历史',
          detail: `${job.roomId} 移除 ${job.removed} 条历史消息`,
          status: job.status,
          actor: 'system',
          createdAt: job.createdAt,
        })),
      ].toSorted((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
    },

    async appLogin(input) {
      if (input.username !== 'alice' || input.password !== 'demo123') return null;
      const token = 'demo-app-token';
      state.appSessions.set(token, { userId: '@alice:localhost', displayName: 'Alice Chen' });
      return { token, userId: '@alice:localhost', displayName: 'Alice Chen' };
    },

    async appRegister(input) {
      const token = (state.registrationTokens || []).find((item) => item.token === input.inviteCode);
      if (!token || token.disabled || token.used >= token.usageLimit) return null;
      const username = String(input.username || '').replace(/^@/, '').split(':')[0];
      if (!username) return null;
      const userId = `@${username}:localhost`;
      if (matchUser(userId)) return null;
      const user = {
        userId,
        displayName: input.displayName || username,
        disabled: false,
        admin: false,
        devices: 1,
        rooms: 1,
        lastSeen: '刚刚',
        createdAt: new Date().toISOString().slice(0, 10),
        ip: '127.0.0.1',
      };
      state.users.unshift(user);
      state.userDevices[userId] = [{ deviceId: 'WEB', name: 'Web Preview', lastSeen: '刚刚', ip: '127.0.0.1' }];
      token.used += 1;
      state.auditLogs.unshift(`刚刚 ${userId} 使用邀请码注册`);
      const sessionToken = `demo-app-token-${username}`;
      state.appSessions.set(sessionToken, { userId, displayName: user.displayName });
      persist();
      return { token: sessionToken, userId, displayName: user.displayName };
    },

    async getAppMe(sessionToken = 'demo-app-token') {
      const session = state.appSessions.get(sessionToken);
      if (session) {
        const user = matchUser(session.userId);
        return {
          userId: session.userId,
          displayName: user?.displayName || session.displayName,
          devices: user?.devices || 1,
          status: user?.profileStatus || 'online',
        };
      }
      const username = sessionToken.replace(/^demo-app-token-/, '');
      const user = matchUser(`@${username}:localhost`) || matchUser('@alice:localhost');
      return {
        userId: user.userId,
        displayName: user.displayName,
        devices: user.devices,
        status: user.profileStatus || 'online',
      };
    },

    async updateAppMe(sessionToken = 'demo-app-token', input) {
      const me = await this.getAppMe(sessionToken);
      const user = matchUser(me.userId);
      if (!user) return null;
      const displayName = String(input.displayName || '').trim();
      const profileStatus = String(input.status || '').trim();
      if (displayName) user.displayName = displayName;
      if (profileStatus) user.profileStatus = profileStatus;
      const session = state.appSessions.get(sessionToken);
      if (session) session.displayName = user.displayName;
      state.auditLogs.unshift(`刚刚 ${user.userId} 更新个人资料`);
      persist();
      return this.getAppMe(sessionToken);
    },

    async changeAppPassword(sessionToken = 'demo-app-token', input) {
      const me = await this.getAppMe(sessionToken);
      const user = matchUser(me.userId);
      const password = String(input.password || '').trim();
      if (!user || password.length < 6) return null;
      user.passwordChangedAt = new Date().toISOString();
      state.auditLogs.unshift(`刚刚 ${user.userId} 修改登录密码`);
      persist();
      return { changedAt: user.passwordChangedAt };
    },

    async listAppDevices(sessionToken = 'demo-app-token') {
      const me = await this.getAppMe(sessionToken);
      return state.userDevices[me.userId] || [];
    },

    async removeAppDevice(sessionToken = 'demo-app-token', deviceId) {
      const me = await this.getAppMe(sessionToken);
      const devices = state.userDevices[me.userId] || [];
      const index = devices.findIndex((device) => device.deviceId === deviceId);
      if (index === -1) return null;
      const [device] = devices.splice(index, 1);
      const user = matchUser(me.userId);
      if (user) user.devices = devices.length;
      state.auditLogs.unshift(`刚刚 ${me.userId} 移除设备 ${device.deviceId}`);
      persist();
      return device;
    },

    async getAppConfig() {
      return state.appConfig;
    },

    async getAppPreferences() {
      return state.appPreferences;
    },

    async updateAppPreferences(input) {
      state.appPreferences = {
        ...state.appPreferences,
        notifications: Boolean(input.notifications),
        doNotDisturb: Boolean(input.doNotDisturb),
        messagePreview: Boolean(input.messagePreview),
      };
      state.auditLogs.unshift('刚刚 @alice:localhost 更新通知偏好');
      persist();
      return state.appPreferences;
    },

    async listContacts() {
      return state.users.filter((user) => !user.disabled).map((user) => ({
        userId: user.userId,
        displayName: user.displayName,
        status: user.lastSeen === '刚刚' ? 'online' : 'offline',
        department: user.admin ? '运维' : '产品',
      }));
    },

    async listAppFiles() {
      return state.media.filter((media) => !media.quarantined).map((media) => ({
        mediaId: media.mediaId,
        type: media.type,
        name: media.name,
        owner: media.owner,
        roomId: media.roomId,
        userId: media.userId,
        size: media.size,
        createdAt: media.createdAt || '-',
      }));
    },

    async reportAppFile(mediaId, input = {}) {
      const media = state.media.find((item) => item.mediaId === mediaId || item.name === mediaId);
      if (!media) return null;
      const report = {
        reportId: `rpt-file-${Date.now()}`,
        level: input.level || '中',
        title: input.reason || '文件举报',
        summary: `${media.name} · ${media.owner}`,
        reporter: '@alice:localhost',
        targetUserId: media.userId,
        roomId: media.roomId,
        mediaId: media.mediaId,
        eventId: `$media-${Date.now()}`,
        status: '待处理',
      };
      state.reports.unshift(report);
      state.auditLogs.unshift(`刚刚 @alice:localhost 举报文件 ${media.name}`);
      persist();
      return report;
    },

    async updateAppConfig(input, options = {}) {
      state.appConfig = {
        ...state.appConfig,
        ...input,
        federationEnabled: Boolean(input.federationEnabled),
        registrationEnabled: Boolean(input.registrationEnabled),
        e2eeDefault: Boolean(input.e2eeDefault),
        maxUploadMb: Number(input.maxUploadMb || state.appConfig.maxUploadMb),
      };
      state.auditLogs.unshift(`刚刚 ${auditActor(options)} 更新客户端配置`);
      persist();
      return state.appConfig;
    },

    async listAppConversations(filters = {}) {
      const archived = Boolean(filters.archived);
      return state.conversations
        .filter((conversation) => Boolean(conversation.archived) === archived)
        .toSorted((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .map(({ messages, ...conversation }) => conversation);
    },

    async updateAppConversation(roomId, input) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      if ('pinned' in input) conversation.pinned = Boolean(input.pinned);
      if ('muted' in input) conversation.muted = Boolean(input.muted);
      if ('archived' in input) conversation.archived = Boolean(input.archived);
      state.auditLogs.unshift(`刚刚 @alice:localhost 更新会话 ${conversation.name} 状态`);
      persist();
      return (({ messages, ...summary }) => summary)(conversation);
    },

    async createAppConversation(input) {
      const user = matchUser(input.userId);
      if (!user || user.disabled) return null;
      const roomId = `dm-${user.userId.replace(/^@/, '').replace(/:.*$/, '')}`;
      let conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) {
        conversation = {
          roomId,
          type: '单聊',
          name: user.displayName,
          avatar: user.displayName.charAt(0).toUpperCase(),
          color: 'blue',
          meta: `${user.lastSeen || '离线'} · ${user.devices || 0} 台设备 · E2EE 已开启`,
          time: '刚刚',
          unread: 0,
          pinned: false,
          muted: false,
          archived: false,
          preview: '会话已创建',
          messages: [
            { sender: 'Matrix Bridge', content: `已和 ${user.displayName} 建立加密会话。`, time: '刚刚', color: 'rose' },
          ],
        };
      state.conversations.unshift(conversation);
      state.roomMembers = state.roomMembers || {};
      state.roomMembers[roomId] = ['@alice:localhost', user.userId];
      state.auditLogs.unshift(`刚刚 @alice:localhost 创建单聊 ${user.userId}`);
      persist();
      }
      return (({ messages, ...summary }) => summary)(conversation);
    },

    async createAppGroupConversation(input) {
      const userIds = Array.from(new Set(input.userIds || []));
      const members = userIds.map(matchUser).filter((user) => user && !user.disabled);
      if (members.length < 2) return null;
      const name = input.name || members.map((user) => user.displayName).join('、');
      const roomId = `group-${Date.now()}`;
      const matrixId = `!${roomId}:localhost`;
      const conversation = {
        roomId,
        type: '群聊',
        name,
        avatar: name.charAt(0).toUpperCase(),
        color: 'teal',
        meta: `${members.length + 1} 位成员 · E2EE 已开启 · localhost`,
        time: '刚刚',
        unread: 0,
        pinned: false,
        muted: false,
        archived: false,
        preview: '群聊已创建',
        messages: [
          { sender: 'Matrix Bridge', content: `群聊 ${name} 已创建，端到端加密已开启。`, time: '刚刚', color: 'rose' },
        ],
      };
      state.conversations.unshift(conversation);
      state.roomMembers = state.roomMembers || {};
      state.roomMembers[roomId] = ['@alice:localhost', ...members.map((user) => user.userId)];
      state.rooms.unshift({
        roomId: matrixId,
        name,
        members: members.length + 1,
        encrypted: true,
        status: '私密群',
        admins: ['@alice:localhost'],
      });
      state.auditLogs.unshift(`刚刚 @alice:localhost 创建群聊 ${name}`);
      persist();
      return (({ messages, ...summary }) => summary)(conversation);
    },

    async inviteAppRoomMembers(roomId, input) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation || conversation.type !== '群聊') return null;
      const userIds = Array.from(new Set(input.userIds || []));
      const users = userIds.map(matchUser).filter((user) => user && !user.disabled);
      if (!users.length) return null;
      state.roomMembers = state.roomMembers || {};
      const current = new Set(state.roomMembers[roomId] || ['@alice:localhost']);
      users.forEach((user) => current.add(user.userId));
      state.roomMembers[roomId] = Array.from(current);
      syncRoomMemberCount(roomId);
      conversation.messages.push({
        sender: 'Matrix Bridge',
        content: `已邀请 ${users.map((user) => user.displayName).join('、')} 加入群聊。`,
        time: '刚刚',
        color: 'rose',
      });
      conversation.preview = '群成员已更新';
      conversation.time = '刚刚';
      state.auditLogs.unshift(`刚刚 @alice:localhost 邀请 ${users.length} 人加入 ${conversation.name}`);
      persist();
      return this.getAppRoom(roomId);
    },

    async removeAppRoomMember(roomId, userId) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation || conversation.type !== '群聊' || userId === '@alice:localhost') return null;
      const current = state.roomMembers?.[roomId] || [];
      if (!current.includes(userId)) return null;
      state.roomMembers[roomId] = current.filter((item) => item !== userId);
      syncRoomMemberCount(roomId);
      const user = matchUser(userId);
      conversation.messages.push({
        sender: 'Matrix Bridge',
        content: `已将 ${user?.displayName || userId} 移出群聊。`,
        time: '刚刚',
        color: 'rose',
      });
      conversation.preview = '群成员已更新';
      conversation.time = '刚刚';
      state.auditLogs.unshift(`刚刚 @alice:localhost 移除 ${userId} 从 ${conversation.name}`);
      persist();
      return this.getAppRoom(roomId);
    },

    async listAppMessages(roomId) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const messages = normalizeMessages(conversation);
      persist();
      return messages;
    },

    async getAppRoom(roomId) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const matrixId = matrixRoomId(roomId);
      const room = state.rooms.find((item) => item.roomId === matrixId);
      const members = roomMemberUsers(roomId, conversation.type);
      const files = state.media.filter((media) => media.roomId === matrixId || media.owner === conversation.name).map((media) => ({
        mediaId: media.mediaId,
        type: media.type,
        name: media.name,
        size: media.size,
      }));
      return {
        roomId: conversation.roomId,
        matrixRoomId: matrixId,
        type: conversation.type,
        name: conversation.name,
        meta: conversation.meta,
        encrypted: room?.encrypted ?? true,
        status: room?.status || '私密会话',
        members,
        files,
      };
    },

    async leaveAppRoom(roomId) {
      const index = state.conversations.findIndex((item) => item.roomId === roomId);
      if (index === -1) return null;
      const [conversation] = state.conversations.splice(index, 1);
      if (roomId.startsWith('group-')) {
        state.rooms = state.rooms.filter((room) => room.roomId !== matrixRoomId(roomId));
      }
      delete state.roomMembers?.[roomId];
      state.auditLogs.unshift(`刚刚 @alice:localhost 退出会话 ${conversation.name}`);
      persist();
      return (({ messages, ...summary }) => summary)(conversation);
    },

    async sendAppMessage(roomId, content, options = {}) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const message = {
        messageId: `msg-${Date.now()}`,
        sender: '我',
        content,
        time: '刚刚',
        color: 'mine',
      };
      if (options.replyTo?.messageId) {
        message.replyTo = {
          messageId: options.replyTo.messageId,
          sender: options.replyTo.sender,
          content: options.replyTo.content,
        };
      }
      conversation.messages.push(message);
      conversation.preview = content;
      conversation.time = '刚刚';
      conversation.unread = 0;
      persist();
      return message;
    },

    async editAppMessage(roomId, messageId, content) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const message = normalizeMessages(conversation).find((item) => item.messageId === messageId);
      if (!message || (message.sender !== '我' && message.color !== 'mine') || message.deleted) return null;
      message.content = content;
      message.edited = true;
      message.editedAt = new Date().toISOString();
      conversation.preview = content;
      conversation.time = '刚刚';
      state.auditLogs.unshift(`刚刚 @alice:localhost 编辑消息 ${messageId}`);
      persist();
      return message;
    },

    async deleteAppMessage(roomId, messageId) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const message = normalizeMessages(conversation).find((item) => item.messageId === messageId);
      if (!message || (message.sender !== '我' && message.color !== 'mine') || message.deleted) return null;
      message.content = '这条消息已撤回';
      message.deleted = true;
      message.kind = 'notice';
      conversation.preview = message.content;
      conversation.time = '刚刚';
      state.auditLogs.unshift(`刚刚 @alice:localhost 撤回消息 ${messageId}`);
      persist();
      return message;
    },

    async reportAppMessage(roomId, messageId, input) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const message = normalizeMessages(conversation).find((item) => item.messageId === messageId);
      if (!message || message.deleted) return null;
      const reporter = '@alice:localhost';
      const targetUserId = message.sender === '我' || message.color === 'mine'
        ? reporter
        : `@${String(message.sender || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '') || 'unknown'}:localhost`;
      const report = {
        reportId: `rpt-${Date.now()}`,
        level: input.level || '中',
        title: input.reason || '用户消息举报',
        summary: `${conversation.name} · ${message.content}`,
        reporter,
        targetUserId,
        roomId: matrixRoomId(roomId),
        eventId: message.messageId,
        messagePreview: message.content,
        status: '待处理',
        createdAt: new Date().toISOString(),
      };
      state.reports.unshift(report);
      state.auditLogs.unshift(`刚刚 ${reporter} 举报消息 ${message.messageId}`);
      persist();
      return report;
    },

    async sendAppAttachment(roomId, input) {
      const conversation = state.conversations.find((item) => item.roomId === roomId);
      if (!conversation) return null;
      const media = {
        mediaId: `mxc://localhost/${Date.now()}`,
        type: input.type || 'FILE',
        name: input.name || 'attachment.bin',
        owner: conversation.name,
        ownerType: conversation.type === '群聊' ? 'room' : 'user',
        userId: '@alice:localhost',
        roomId: matrixRoomId(roomId),
        size: input.size || '1.0 MB',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const message = {
        messageId: `msg-${Date.now()}`,
        sender: '我',
        content: media.name,
        time: '刚刚',
        color: 'mine',
        kind: 'file',
      };
      state.media.unshift(media);
      conversation.messages.push(message);
      conversation.preview = media.name;
      conversation.time = '刚刚';
      conversation.unread = 0;
      state.auditLogs.unshift(`刚刚 @alice:localhost 上传文件 ${media.name}`);
      persist();
      return { message, media };
    },
  };
}
