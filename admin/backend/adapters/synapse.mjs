export function createSynapseAdapter({ baseUrl, accessToken }) {
  if (!baseUrl) throw new Error('SYNAPSE_ADMIN_API_BASE_URL is required');
  if (!accessToken) throw new Error('SYNAPSE_ADMIN_TOKEN is required');

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = body.error || body.errcode || `Synapse API ${response.status}`;
      throw new Error(message);
    }
    return body;
  }

  function normalizeUser(user) {
    return {
      userId: user.name || user.user_id,
      displayName: user.displayname || user.display_name || user.name || user.user_id,
      disabled: Boolean(user.deactivated || user.disabled),
      admin: Boolean(user.admin),
      devices: user.device_count || 0,
      rooms: user.joined_rooms || 0,
      lastSeen: user.last_seen_ts ? new Date(user.last_seen_ts).toLocaleString('zh-CN') : '未知',
    };
  }

  function normalizeRoom(room) {
    return {
      roomId: room.room_id,
      name: room.name || room.canonical_alias || room.room_id,
      members: room.joined_members || room.joined_local_members || 0,
      encrypted: Boolean(room.encryption),
      status: room.public ? '公开房间' : '私密房间',
    };
  }

  function normalizeRegistrationToken(token) {
    const usageLimit = token.uses_allowed ?? token.usageLimit ?? 0;
    const used = token.completed ?? token.used ?? 0;
    const remaining = Math.max(0, usageLimit - used);
    const usagePercent = usageLimit ? Math.min(100, Math.round((used / usageLimit) * 100)) : 0;
    return {
      token: token.token,
      usageLimit,
      used,
      remaining,
      usagePercent,
      pending: token.pending ?? 0,
      disabled: Boolean(token.disabled),
      statusLabel: token.disabled ? '已禁用' : remaining <= 0 ? '已用完' : '可用',
      createdAt: token.created_at ? new Date(token.created_at).toISOString().slice(0, 10) : '-',
      expiresAt: token.expiry_time ? new Date(token.expiry_time).toISOString() : null,
    };
  }

  return {
    mode: 'synapse',

    async listUsers({ keyword = '' }) {
      const params = new URLSearchParams({ limit: '100' });
      if (keyword) params.set('name', keyword);
      const body = await request(`/_synapse/admin/v2/users?${params}`);
      return (body.users || []).map(normalizeUser);
    },

    async globalSearch(keyword = '') {
      const lowerKeyword = String(keyword || '').trim().toLowerCase();
      if (!lowerKeyword) return [];
      const match = (text) => String(text || '').toLowerCase().includes(lowerKeyword);
      const [users, rooms, reports] = await Promise.all([
        this.listUsers({ keyword }),
        this.listRooms(),
        this.listReports(),
      ]);
      return [
        ...users.filter((user) => match(`${user.userId} ${user.displayName}`)).map((user) => ({
          type: '用户',
          title: user.displayName,
          subtitle: `${user.userId} · ${user.disabled ? '禁用' : '正常'}`,
          target: '#users',
          id: user.userId,
        })),
        ...rooms.filter((room) => match(`${room.roomId} ${room.name}`)).map((room) => ({
          type: '群聊',
          title: room.name,
          subtitle: `${room.roomId} · ${room.members} 成员`,
          target: '#rooms',
          id: room.roomId,
        })),
        ...reports.filter((report) => match(`${report.reportId} ${report.title} ${report.summary}`)).map((report) => ({
          type: '举报',
          title: report.title,
          subtitle: report.summary,
          target: '#reports',
          id: report.reportId,
        })),
      ].slice(0, 20);
    },

    async createUser(input) {
      const userId = input.userId || `@${input.username}:localhost`;
      const body = await request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          password: input.password,
          displayname: input.displayName,
          admin: Boolean(input.admin),
        }),
      });
      return normalizeUser({ ...body, name: userId, displayname: input.displayName });
    },

    async getUser(userId) {
      const body = await request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`);
      return normalizeUser({ ...body, name: userId });
    },

    async listUserDevices(userId) {
      const body = await request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}/devices`);
      return body.devices || [];
    },

    async setUserStatus(userId, disabled) {
      const body = await request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({ deactivated: Boolean(disabled) }),
      });
      return normalizeUser({ ...body, name: userId });
    },

    async listRooms() {
      const body = await request('/_synapse/admin/v1/rooms?limit=100');
      return (body.rooms || []).map(normalizeRoom);
    },

    async listPublicRooms() {
      const body = await request('/_matrix/client/v3/publicRooms');
      return (body.chunk || []).map((room) => ({
        roomId: room.room_id,
        name: room.name || room.canonical_alias || room.room_id,
        members: room.num_joined_members || 0,
        encrypted: false,
        status: '公开房间',
      }));
    },

    async getRoom(roomId) {
      const [detail, members, state] = await Promise.all([
        request(`/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}`),
        request(`/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/members`),
        request(`/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/state`),
      ]);
      return {
        ...normalizeRoom(detail),
        membersList: members.members || [],
        stateEvents: state.state || [],
      };
    },

    async closeRoom(roomId) {
      return request(`/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}`, {
        method: 'DELETE',
      });
    },

    async makeRoomAdmin(roomId, userId) {
      return request(`/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/make_room_admin`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    },

    async bulkUpdateRooms(input = {}) {
      const roomIds = Array.isArray(input.roomIds) ? input.roomIds : [];
      const handled = [];
      const skipped = [];
      for (const roomId of roomIds) {
        try {
          if (input.action === 'close') await this.closeRoom(roomId);
          if (input.action === 'quarantine-media') await this.quarantineRoomMedia(roomId);
          handled.push(roomId);
        } catch {
          skipped.push(roomId);
        }
      }
      return { action: input.action, handled, skipped, count: handled.length };
    },

    async listMedia() {
      return [];
    },

    async quarantineMedia(mediaId) {
      return { mediaId, status: 'quarantine requires server/media id mapping' };
    },

    async quarantineRoomMedia(roomId) {
      return request(`/_synapse/admin/v1/room/${encodeURIComponent(roomId)}/media/quarantine`, {
        method: 'POST',
      });
    },

    async quarantineUserMedia(userId) {
      return request(`/_synapse/admin/v1/user/${encodeURIComponent(userId)}/media/quarantine`, {
        method: 'POST',
      });
    },

    async deleteMedia(mediaId) {
      return { mediaId, status: 'delete requires server/media id mapping' };
    },

    async bulkUpdateMedia(input = {}) {
      const mediaIds = Array.isArray(input.mediaIds) ? input.mediaIds : [];
      const handled = [];
      const skipped = [];
      for (const mediaId of mediaIds) {
        try {
          if (input.action === 'quarantine') await this.quarantineMedia(mediaId);
          if (input.action === 'delete') await this.deleteMedia(mediaId);
          handled.push(mediaId);
        } catch {
          skipped.push(mediaId);
        }
      }
      return { action: input.action, handled, skipped, count: handled.length };
    },

    async cleanupMedia() {
      return { removed: 0, status: 'cleanup should be scheduled with explicit media ids in synapse mode' };
    },

    async listReports() {
      const body = await request('/_synapse/admin/v1/event_reports');
      return (body.event_reports || []).map((report) => ({
        reportId: String(report.id),
        level: '中',
        title: report.reason || '用户举报',
        summary: `${report.user_id || '未知用户'} · ${report.room_id || '未知房间'}`,
      }));
    },

    async getReport(reportId) {
      return request(`/_synapse/admin/v1/event_reports/${encodeURIComponent(reportId)}`);
    },

    async resolveReport(reportId) {
      return request(`/_synapse/admin/v1/event_reports/${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
      });
    },

    async handleReport(reportId) {
      return this.resolveReport(reportId);
    },

    async bulkHandleReports(input = {}) {
      const reportIds = input.reportIds || [];
      const handled = [];
      const skipped = [];
      for (const reportId of reportIds) {
        try {
          await this.resolveReport(reportId);
          handled.push({ reportId, actions: input.actions || ['resolve'], resolved: true });
        } catch (error) {
          skipped.push({ reportId, reason: error.message });
        }
      }
      return { handled, skipped, count: handled.length };
    },

    async sendNotice(input) {
      return request('/_synapse/admin/v1/send_server_notice', {
        method: 'POST',
        body: JSON.stringify({
          user_id: input.userId,
          content: {
            msgtype: 'm.text',
            body: input.content,
          },
        }),
      });
    },

    async sendBulkNotices(input) {
      const notices = [];
      for (const userId of input.userIds || []) {
        notices.push(await this.sendNotice({ userId, content: input.content }));
      }
      return { count: notices.length, notices };
    },

    async listAuditLogs(filters = {}) {
      const keyword = String(filters.keyword || '').toLowerCase();
      const actor = String(filters.actor || '').toLowerCase();
      const module = String(filters.module || '').toLowerCase();
      const logs = [{
        id: 'synapse-audit-store',
        time: 'now',
        actor: 'system',
        module: 'admin',
        action: '真实 Synapse 模式',
        target: '操作日志应写入 Admin Backend 自有数据库',
        raw: '真实 Synapse 模式：操作日志应写入 Admin Backend 自有数据库',
      }];
      return logs
        .filter((entry) => !keyword || entry.raw.toLowerCase().includes(keyword))
        .filter((entry) => !actor || entry.actor.toLowerCase().includes(actor))
        .filter((entry) => !module || entry.module.toLowerCase() === module);
    },

    async getStats() {
      const [users, rooms, reports] = await Promise.all([
        this.listUsers({}),
        this.listRooms(),
        this.listReports(),
      ]);
      return {
        users: users.length,
        activeUsers: users.filter((user) => !user.disabled).length,
        rooms: rooms.length,
        media: 0,
        mediaStorageMb: 0,
        reports: reports.length,
        notices: 0,
        messages: 0,
      };
    },

    async getOperationsOverview() {
      const [stats, reports, jobs, audit] = await Promise.all([
        this.getStats(),
        this.listReports(),
        this.listOperationJobs(),
        this.listAuditLogs({ limit: 5 }),
      ]);
      return {
        risk: {
          score: Math.min(100, stats.reports * 16),
          reports: stats.reports,
          disabledUsers: 0,
          quarantinedMedia: 0,
        },
        reports: reports.slice(0, 5).map((report) => ({
          id: report.reportId,
          level: report.level,
          title: report.title,
          detail: report.summary,
          target: report.targetUserId || report.roomId || '-',
        })),
        jobs: jobs.slice(0, 5),
        audit: audit.slice(0, 5),
        warnings: stats.reports ? [`${stats.reports} 条举报待处理`] : [],
      };
    },

    async getSystemStatus() {
      return {
        api: 'online',
        mode: 'synapse',
        database: 'synapse',
        synapse: baseUrl,
        adminApiExposure: 'internal_only',
        lastAuditLog: '真实 Synapse 模式',
      };
    },

    async resetDemoData() {
      throw new Error('reset is only available in mock mode');
    },

    async exportBackup() {
      return {
        version: 1,
        mode: 'synapse',
        exportedAt: new Date().toISOString(),
        data: null,
        message: '真实 Synapse 数据备份应使用数据库和媒体仓库备份，不通过 Admin API 导出。',
      };
    },

    async importBackup() {
      return null;
    },

    async purgeRoomHistory(roomId) {
      return request(`/_synapse/admin/v1/purge_history/${encodeURIComponent(roomId)}`, {
        method: 'POST',
        body: JSON.stringify({ delete_local_events: true }),
      });
    },

    async getPurgeStatus(purgeId) {
      return request(`/_synapse/admin/v1/purge_history_status/${encodeURIComponent(purgeId)}`);
    },

    async listOperationJobs() {
      return [{
        jobId: 'synapse-operation-store',
        type: 'external',
        title: '真实任务记录',
        detail: 'Synapse 模式下任务记录应写入 Admin Backend 自有数据库',
        status: 'planned',
        actor: 'system',
        createdAt: new Date().toISOString(),
      }];
    },

    async appLogin() {
      throw new Error('App login should be handled by Matrix client login in synapse mode');
    },

    async appRegister() {
      throw new Error('App registration should be handled by Matrix registration in synapse mode');
    },

    async changeUserPassword(userId, input) {
      return request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({ password: input.password }),
      });
    },

    async setUserAdmin(userId, admin) {
      return request(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        body: JSON.stringify({ admin: Boolean(admin) }),
      });
    },

    async forceLogoutUser(userId) {
      return request(`/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: JSON.stringify({ erase: false }),
      });
    },

    async deleteUser(userId) {
      return request(`/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`, {
        method: 'POST',
        body: JSON.stringify({ erase: true }),
      });
    },

    async bulkUpdateUsers(input = {}) {
      const userIds = Array.isArray(input.userIds) ? input.userIds : [];
      const handled = [];
      const skipped = [];
      for (const userId of userIds) {
        try {
          if (input.action === 'ban') await this.setUserStatus(userId, true);
          if (input.action === 'unban') await this.setUserStatus(userId, false);
          if (input.action === 'logout') await this.forceLogoutUser(userId);
          handled.push(userId);
        } catch {
          skipped.push(userId);
        }
      }
      return { action: input.action, handled, skipped, count: handled.length };
    },

    async getAppMe() {
      return { userId: 'unknown', displayName: 'Matrix User', devices: 0, status: 'unknown' };
    },

    async updateAppMe() {
      throw new Error('App profile updates should use Matrix profile displayname/avatar APIs in synapse mode');
    },

    async changeAppPassword() {
      throw new Error('App password updates should use Matrix account password API in synapse mode');
    },

    async listAppDevices() {
      return [];
    },

    async removeAppDevice() {
      throw new Error('App device removal should be handled by Matrix client device API in synapse mode');
    },

    async getAppConfig() {
      return {
        brandName: 'Private IM',
        homeserverUrl: baseUrl,
        federationEnabled: false,
        registrationEnabled: false,
        e2eeDefault: true,
        maxUploadMb: 100,
      };
    },

    async getAppPreferences() {
      return { notifications: true, doNotDisturb: false, messagePreview: true };
    },

    async updateAppPreferences(input) {
      return {
        notifications: Boolean(input.notifications),
        doNotDisturb: Boolean(input.doNotDisturb),
        messagePreview: Boolean(input.messagePreview),
      };
    },

    async listContacts() {
      return [];
    },

    async listAppFiles() {
      return [];
    },

    async reportAppFile() {
      throw new Error('App file reports should use Matrix reportEvent client API in synapse mode');
    },

    async createAppConversation() {
      throw new Error('App conversation creation should use Matrix client createRoom/invite in synapse mode');
    },

    async listAppConversations({ archived = false } = {}) {
      if (archived) return [];
      const rooms = await this.listRooms();
      return rooms.map((room) => ({
        roomId: room.roomId,
        matrixRoomId: room.roomId,
        type: room.members > 2 ? '群聊' : '单聊',
        name: room.name,
        meta: `${room.members} 成员 · ${room.status}`,
        preview: 'Synapse 模式下消息列表由 Matrix 客户端同步',
        time: '-',
        unread: 0,
        pinned: false,
        muted: false,
        archived: false,
        encrypted: room.encrypted,
        members: [],
        files: [],
      }));
    },

    async updateAppConversation() {
      throw new Error('App conversation state should use account data/tags in synapse mode');
    },

    async createAppGroupConversation() {
      throw new Error('App group creation should use Matrix client createRoom/invite in synapse mode');
    },

    async getAppRoom(roomId) {
      return {
        roomId,
        matrixRoomId: roomId,
        type: '未知',
        name: roomId,
        meta: 'Synapse 模式需由 Matrix client 获取房间资料',
        encrypted: true,
        status: 'unknown',
        members: [],
        files: [],
      };
    },

    async leaveAppRoom() {
      throw new Error('App room leave should use Matrix client room API in synapse mode');
    },

    async inviteAppRoomMembers() {
      throw new Error('App member invite should use Matrix client invite API in synapse mode');
    },

    async removeAppRoomMember() {
      throw new Error('App member removal should use Matrix client kick API in synapse mode');
    },

    async listAppMessages() {
      return [];
    },

    async listRegistrationTokens() {
      const body = await request('/_synapse/admin/v1/registration_tokens');
      return (body.registration_tokens || []).map(normalizeRegistrationToken);
    },

    async createRegistrationToken(input) {
      const body = await request('/_synapse/admin/v1/registration_tokens/new', {
        method: 'POST',
        body: JSON.stringify({
          token: input.token || undefined,
          uses_allowed: Number(input.usageLimit || input.uses_allowed || 10),
        }),
      });
      return normalizeRegistrationToken(body);
    },

    async setRegistrationTokenStatus(token) {
      return { token, status: 'Synapse token disabling requires delete/recreate policy' };
    },

    async deleteRegistrationToken(token) {
      return request(`/_synapse/admin/v1/registration_tokens/${encodeURIComponent(token)}`, {
        method: 'DELETE',
      });
    },

    async updateAppConfig(input) {
      return {
        brandName: input.brandName || 'Private IM',
        homeserverUrl: input.homeserverUrl || baseUrl,
        federationEnabled: Boolean(input.federationEnabled),
        registrationEnabled: Boolean(input.registrationEnabled),
        e2eeDefault: Boolean(input.e2eeDefault),
        maxUploadMb: Number(input.maxUploadMb || 100),
      };
    },

    async sendAppAttachment() {
      throw new Error('App attachments should be handled by Matrix media upload in synapse mode');
    },

    async editAppMessage() {
      throw new Error('App message edit should use Matrix m.replace relations in synapse mode');
    },

    async deleteAppMessage() {
      throw new Error('App message redaction should use Matrix redact API in synapse mode');
    },

    async reportAppMessage() {
      throw new Error('App message reports should use Matrix reportEvent client API in synapse mode');
    },
  };
}
