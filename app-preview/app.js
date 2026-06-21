const apiBaseUrl = 'http://127.0.0.1:4180';
const tokenKey = 'private-im-app-token';

let conversations = [];
let contacts = [];
let files = [];
let devices = [];
let currentUser = null;
let currentConfig = null;
let currentPreferences = null;
let currentView = 'messages';
let currentThreadFilter = '全部';
let currentFileFilter = '全部';
let currentContactFilter = '全部';
let activeRoomId = null;
let replyTarget = null;
let forwardTarget = null;

const toast = document.querySelector('.toast');
const messages = document.querySelector('.messages');
const composer = document.querySelector('[data-composer]');
const replyCompose = document.querySelector('[data-reply-compose]');
const replyComposeText = document.querySelector('[data-reply-compose-text]');
const scrollBottomButton = document.querySelector('[data-scroll-bottom]');
const threadList = document.querySelector('[data-thread-list]');
const contactsList = document.querySelector('[data-contacts-list]');
const filesList = document.querySelector('[data-files-list]');
const securityList = document.querySelector('[data-security-list]');
const settingsList = document.querySelector('[data-settings-list]');
const attachmentModal = document.querySelector('[data-attachment-modal]');
const newChatModal = document.querySelector('[data-new-chat-modal]');
const searchModal = document.querySelector('[data-search-modal]');
const roomModal = document.querySelector('[data-room-modal]');
const editMessageModal = document.querySelector('[data-edit-message-modal]');
const forwardMessageModal = document.querySelector('[data-forward-message-modal]');

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(localStorage.getItem(tokenKey) ? { authorization: `Bearer ${localStorage.getItem(tokenKey)}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function setLoggedIn(isLoggedIn) {
  document.querySelector('[data-login-screen]').classList.toggle('hidden', isLoggedIn);
  document.querySelector('.app-shell').classList.toggle('locked', !isLoggedIn);
}

function initials(name) {
  if (name === '我') return '';
  return name.trim().charAt(0).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function clearReply() {
  replyTarget = null;
  replyCompose.hidden = true;
  replyComposeText.textContent = '';
}

function setReplyTarget(message) {
  replyTarget = {
    messageId: message.messageId,
    sender: message.sender,
    content: message.content,
  };
  replyComposeText.textContent = `${message.sender}: ${message.content}`;
  replyCompose.hidden = false;
  composer.focus();
}

function scrollMessagesToBottom() {
  messages.scrollTop = messages.scrollHeight;
  scrollBottomButton.hidden = true;
}

function updateScrollBottomButton() {
  const distance = messages.scrollHeight - messages.clientHeight - messages.scrollTop;
  scrollBottomButton.hidden = distance < 120;
}

function renderThreads(items) {
  currentView = 'messages';
  threadList.hidden = false;
  contactsList.hidden = true;
  filesList.hidden = true;
  securityList.hidden = true;
  settingsList.hidden = true;
  threadList.innerHTML = items.map((item) => `
    <article class="thread ${item.type === '群聊' ? 'thread-group' : 'thread-dm'} ${item.roomId === activeRoomId ? 'active' : ''} ${item.pinned ? 'pinned' : ''} ${item.muted ? 'muted-thread' : ''}" data-type="${item.type}" data-room-id="${item.roomId}">
      <div class="avatar ${item.color}">${escapeHtml(item.avatar)}</div>
      <div class="thread-main">
        <div class="thread-top">
          <div class="thread-title-line">
            <strong>${item.pinned ? '↑ ' : ''}${escapeHtml(item.name)}${item.muted ? ' · 静音' : ''}</strong>
            <span class="thread-type ${item.type === '单聊' ? 'dm' : 'group'}">${escapeHtml(item.type)}</span>
          </div>
          <span>${escapeHtml(item.time)}</span>
        </div>
        <p>${escapeHtml(item.preview)}</p>
      </div>
      <div class="thread-side">
        ${item.unread && !item.muted ? `<b class="badge ${item.unread > 3 ? '' : 'muted'}">${item.unread}</b>` : ''}
        <div class="thread-actions">
          <button type="button" data-thread-action="pin" title="${item.pinned ? '取消置顶' : '置顶'}">${item.pinned ? 'U' : 'P'}</button>
          <button type="button" data-thread-action="mute" title="${item.muted ? '取消免打扰' : '免打扰'}">${item.muted ? 'N' : 'M'}</button>
          <button type="button" data-thread-action="archive" title="${item.archived ? '恢复' : '归档'}">${item.archived ? 'R' : 'A'}</button>
        </div>
      </div>
    </article>
  `).join('');
}

function renderContacts(items) {
  currentView = 'contacts';
  contactsList.hidden = false;
  threadList.hidden = true;
  filesList.hidden = true;
  securityList.hidden = true;
  settingsList.hidden = true;
  contactsList.innerHTML = `
    <div class="file-filter-row">
      ${['全部', '在线', '离线'].map((status) => `<button class="${status === currentContactFilter ? 'active' : ''}" data-contact-filter="${status}">${status}</button>`).join('')}
    </div>
    ${items.map((item) => `
    <article class="contact-row contact-center-row" data-user-id="${item.userId}">
      <div class="avatar ${item.status === 'online' ? 'teal' : 'gray'}">${escapeHtml(initials(item.displayName))}</div>
      <div>
        <strong>${escapeHtml(item.displayName)}</strong>
        <p>${escapeHtml(item.userId)} · ${escapeHtml(item.department)} · ${item.status === 'online' ? '在线' : '离线'}</p>
      </div>
      <button class="tool-btn" data-start-chat title="发消息">M</button>
    </article>
  `).join('') || '<p class="empty-list">暂无联系人</p>'}`;
}

function visibleContacts(keyword = '') {
  const lowerKeyword = keyword.toLowerCase();
  return contacts.filter((item) => {
    const matchesKeyword = `${item.displayName} ${item.userId}`.toLowerCase().includes(lowerKeyword);
    const matchesStatus = currentContactFilter === '全部'
      || (currentContactFilter === '在线' && item.status === 'online')
      || (currentContactFilter === '离线' && item.status !== 'online');
    return matchesKeyword && matchesStatus;
  });
}

function renderFiles(items) {
  currentView = 'files';
  filesList.hidden = false;
  contactsList.hidden = true;
  threadList.hidden = true;
  securityList.hidden = true;
  settingsList.hidden = true;
  const types = ['全部', ...Array.from(new Set(files.map((item) => item.type)))];
  filesList.innerHTML = `
    <div class="file-filter-row">
      ${types.map((type) => `<button class="${type === currentFileFilter ? 'active' : ''}" data-file-filter="${type}">${type}</button>`).join('')}
    </div>
    ${items.map((item) => `
    <article class="contact-row file-center-row" data-media-id="${item.mediaId}" data-room-id="${item.roomId || ''}">
      <span class="file-chip">${escapeHtml(item.type)}</span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <p>${escapeHtml(item.owner)} · ${escapeHtml(item.size)} · ${escapeHtml(item.createdAt)}${item.roomId ? ` · ${escapeHtml(item.roomId)}` : ''}</p>
      </div>
      <button class="tool-btn" data-report-file title="举报文件">!</button>
    </article>
  `).join('') || '<p class="empty-list">暂无文件</p>'}`;
}

function renderSettings() {
  currentView = 'settings';
  settingsList.hidden = false;
  filesList.hidden = true;
  contactsList.hidden = true;
  securityList.hidden = true;
  threadList.hidden = true;
  const config = currentConfig || {};
  const me = currentUser || {};
  const preferences = currentPreferences || {};
  settingsList.innerHTML = `
    <section class="setting-card">
      <div class="setting-head">
        <div class="avatar teal">${initials(me.displayName || 'Me')}</div>
        <div>
          <strong>${me.displayName || '-'}</strong>
          <p>${me.userId || '-'}</p>
        </div>
      </div>
      <div class="setting-row"><span>设备</span><strong>${me.devices ?? '-'}</strong></div>
      <div class="setting-row"><span>状态</span><strong>${me.status === 'online' ? '在线' : me.status || '-'}</strong></div>
      <label class="login-field compact-field">
        <span>昵称</span>
        <input name="displayName" data-profile-display-name value="${me.displayName || ''}">
      </label>
      <label class="login-field compact-field">
        <span>状态</span>
        <input name="status" data-profile-status value="${me.status || 'online'}">
      </label>
      <button class="send full" data-save-profile>保存资料</button>
    </section>
    <section class="setting-card">
      <h3>设备</h3>
    ${devices.map((device) => `
        <div class="device-row" data-device-id="${device.deviceId}">
          <div>
            <strong>${escapeHtml(device.name || device.deviceId)}</strong>
            <p>${escapeHtml(device.deviceId)} · ${escapeHtml(device.lastSeen || '-')} · ${escapeHtml(device.ip || '-')}</p>
          </div>
          <button class="tool-btn" data-remove-device title="移除设备">R</button>
        </div>
      `).join('') || '<p class="modal-copy">暂无设备</p>'}
    </section>
    <section class="setting-card">
      <h3>安全</h3>
      <div class="setting-row"><span>端到端加密</span><strong>${config.e2eeDefault ? '默认开启' : '默认关闭'}</strong></div>
      <div class="setting-row"><span>跨服联邦</span><strong>${config.federationEnabled ? '开启' : '关闭'}</strong></div>
      <div class="setting-row"><span>注册入口</span><strong>${config.registrationEnabled ? '开放注册' : '邀请码/后台创建'}</strong></div>
      <label class="login-field compact-field">
        <span>新密码</span>
        <input type="password" data-password-input value="" placeholder="至少 6 位">
      </label>
      <button class="send full" data-change-password>修改密码</button>
    </section>
    <section class="setting-card">
      <h3>通知</h3>
      <label class="toggle-row"><span>消息通知</span><input type="checkbox" data-pref="notifications" ${preferences.notifications ? 'checked' : ''}></label>
      <label class="toggle-row"><span>免打扰</span><input type="checkbox" data-pref="doNotDisturb" ${preferences.doNotDisturb ? 'checked' : ''}></label>
      <label class="toggle-row"><span>通知预览</span><input type="checkbox" data-pref="messagePreview" ${preferences.messagePreview ? 'checked' : ''}></label>
    </section>
    <section class="setting-card">
      <h3>服务</h3>
      <div class="setting-row"><span>品牌</span><strong>${config.brandName || '-'}</strong></div>
      <div class="setting-row"><span>服务器</span><strong>${(config.homeserverUrl || '').replace(/^https?:\/\//, '')}</strong></div>
      <div class="setting-row"><span>上传上限</span><strong>${config.maxUploadMb || '-'} MB</strong></div>
      <button class="send full" data-refresh-config>刷新配置</button>
    </section>
  `;
}

function renderSecurity() {
  currentView = 'security';
  securityList.hidden = false;
  settingsList.hidden = true;
  filesList.hidden = true;
  contactsList.hidden = true;
  threadList.hidden = true;
  const config = currentConfig || {};
  const me = currentUser || {};
  const activeDevices = devices.length;
  securityList.innerHTML = `
    <section class="setting-card security-summary">
      <div>
        <h3>账号安全</h3>
        <p>${me.userId || '-'} · ${me.status === 'online' ? '在线' : me.status || '-'}</p>
      </div>
      <div class="security-score">${config.e2eeDefault ? '安全' : '注意'}</div>
      <div class="setting-row"><span>登录设备</span><strong>${activeDevices} 台</strong></div>
      <div class="setting-row"><span>端到端加密</span><strong>${config.e2eeDefault ? '默认开启' : '默认关闭'}</strong></div>
      <div class="setting-row"><span>开放注册</span><strong>${config.registrationEnabled ? '开启' : '关闭'}</strong></div>
    </section>
    <section class="setting-card">
      <h3>已登录设备</h3>
      ${devices.map((device) => `
        <div class="device-row" data-device-id="${device.deviceId}">
          <div>
            <strong>${escapeHtml(device.name || device.deviceId)}</strong>
            <p>${escapeHtml(device.deviceId)} · ${escapeHtml(device.lastSeen || '-')} · ${escapeHtml(device.ip || '-')}</p>
          </div>
          <button class="tool-btn danger-tool" data-remove-device title="移除设备">R</button>
        </div>
      `).join('') || '<p class="modal-copy">暂无设备</p>'}
    </section>
    <section class="setting-card">
      <h3>安全策略</h3>
      <div class="setting-row"><span>服务端</span><strong>${(config.homeserverUrl || '').replace(/^https?:\/\//, '')}</strong></div>
      <div class="setting-row"><span>联邦</span><strong>${config.federationEnabled ? '允许跨服' : '仅私有部署'}</strong></div>
      <div class="setting-row"><span>上传限制</span><strong>${config.maxUploadMb || '-'} MB</strong></div>
      <button class="send full" data-refresh-config>刷新安全状态</button>
    </section>
  `;
}

function renderMessages(items) {
  messages.innerHTML = '<div class="day">今天</div>';
  items.forEach((message) => {
    const article = document.createElement('article');
    article.className = message.sender === '我' || message.color === 'mine' ? 'msg mine' : 'msg other';
    article.dataset.messageId = message.messageId || '';
    article.dataset.sender = message.sender || '';
    article.dataset.content = message.content || '';
    const avatar = message.sender === '我' ? '' : `<div class="avatar small ${message.color}">${escapeHtml(initials(message.sender))}</div>`;
    const edited = message.edited ? ' · 已编辑' : '';
    const isMine = article.className.includes('mine');
    const replyPreview = message.replyTo
      ? `<div class="reply-preview"><strong>回复 ${escapeHtml(message.replyTo.sender)}</strong><span>${escapeHtml(message.replyTo.content)}</span></div>`
      : '';
    const messageActions = !message.deleted
      ? `<div class="message-actions">${isMine
        ? `<button type="button" data-reply-message="${message.messageId}">回复</button><button type="button" data-copy-message="${message.messageId}">复制</button><button type="button" data-forward-message="${message.messageId}">转发</button><button type="button" data-edit-message="${message.messageId}">编辑</button><button type="button" data-delete-message="${message.messageId}">撤回</button>`
        : `<button type="button" data-reply-message="${message.messageId}">回复</button><button type="button" data-copy-message="${message.messageId}">复制</button><button type="button" data-forward-message="${message.messageId}">转发</button><button type="button" data-report-message="${message.messageId}">举报</button>`}</div>`
      : '';
    const bubble = message.kind === 'file'
      ? `<div class="bubble file"><div class="meta">${escapeHtml(message.sender)} · ${escapeHtml(message.time)}${edited}</div>${replyPreview}<strong>${escapeHtml(message.content)}</strong><span>2.4 MB · 已加密传输</span>${messageActions}</div>`
      : `<div class="bubble ${message.deleted ? 'deleted' : ''}"><div class="meta">${escapeHtml(message.sender)} · ${escapeHtml(message.time)}${edited}</div>${replyPreview}<p>${escapeHtml(message.content)}</p>${messageActions}</div>`;
    article.innerHTML = `${avatar}${bubble}`;
    messages.appendChild(article);
  });
  scrollMessagesToBottom();
}

function renderRoomDetails(room) {
  document.querySelector('.profile p').textContent = room.encrypted
    ? '端到端加密默认开启，服务端不读取聊天明文。'
    : '当前会话未开启端到端加密，适合公告或支持场景。';
  document.querySelector('[data-config-e2ee]').textContent = room.encrypted ? '开启' : '关闭';
  document.querySelector('[data-room-files]').innerHTML = (room.files || []).map((file) => `
    <div class="file-row">
      <span>${escapeHtml(file.type)}</span>
      <p>${escapeHtml(file.name)}${file.size ? ` · ${escapeHtml(file.size)}` : ''}</p>
    </div>
  `).join('') || '<p class="empty-side">暂无共享文件</p>';
  document.querySelector('[data-room-members]').innerHTML = (room.members || []).slice(0, 8).map((member) => `
    <div class="avatar small ${member.role === 'owner' ? 'teal' : member.role === 'admin' ? 'amber' : 'blue'}" title="${escapeHtml(member.displayName || member.userId)}">
      ${escapeHtml(initials(member.displayName || member.userId))}
    </div>
  `).join('') + ((room.members || []).length > 8 ? `<div class="avatar small gray">+${room.members.length - 8}</div>` : '');
}

async function activateRoom(roomId) {
  activeRoomId = roomId;
  const room = conversations.find((item) => item.roomId === roomId);
  if (!room) return;
  clearReply();

  renderThreads(conversations);
  document.querySelector('.chat-head .avatar').className = `avatar ${room.color}`;
  document.querySelector('.chat-head .avatar').textContent = room.avatar;
  document.querySelector('.chat-head h2').textContent = room.name;
  document.querySelector('.chat-head p').textContent = room.meta;
  document.querySelector('.profile .avatar').className = `avatar large ${room.color}`;
  document.querySelector('.profile .avatar').textContent = room.avatar;
  document.querySelector('.profile h3').textContent = room.name;

  const [messagesPayload, detailPayload] = await Promise.all([
    api(`/api/app/rooms/${encodeURIComponent(roomId)}/messages`),
    api(`/api/app/rooms/${encodeURIComponent(roomId)}`),
  ]);
  renderMessages(messagesPayload.data);
  renderRoomDetails(detailPayload.data);
}

async function loadConversations() {
  const previousView = currentView;
  const archived = currentThreadFilter === '归档';
  const [payload, me, config, contactPayload, filePayload, devicePayload, preferencePayload] = await Promise.all([
    api(`/api/app/conversations${archived ? '?archived=true' : ''}`),
    api('/api/app/me'),
    api('/api/app/config'),
    api('/api/app/contacts'),
    api('/api/app/files'),
    api('/api/app/devices'),
    api('/api/app/preferences'),
  ]);
  conversations = payload.data;
  contacts = contactPayload.data;
  files = filePayload.data;
  devices = devicePayload.data;
  currentPreferences = preferencePayload.data;
  currentUser = me.data;
  currentConfig = config.data;
  renderProfile(me.data, config.data);
  activeRoomId = archived ? null : activeRoomId || conversations[0]?.roomId;
  if (previousView === 'contacts') {
    renderContacts(visibleContacts());
    return;
  }
  if (previousView === 'files') {
    renderFiles(currentFileFilter === '全部' ? files : files.filter((item) => item.type === currentFileFilter));
    return;
  }
  if (previousView === 'security') {
    renderSecurity();
    return;
  }
  if (previousView === 'settings') {
    renderSettings();
    return;
  }
  const visible = currentThreadFilter === '全部' || currentThreadFilter === '归档'
    ? conversations
    : conversations.filter((item) => item.type === currentThreadFilter);
  renderThreads(visible);
  if (activeRoomId && !archived) await activateRoom(activeRoomId);
}

function renderProfile(me, config) {
  document.querySelector('[data-brand-name]').textContent = config.brandName;
  document.querySelector('[data-me-name]').textContent = me.displayName;
  document.querySelector('[data-config-e2ee]').textContent = config.e2eeDefault ? '开启' : '关闭';
  document.querySelector('[data-config-federation]').textContent = config.federationEnabled ? '开启' : '关闭';
  document.querySelector('[data-config-registration]').textContent = config.registrationEnabled ? '开放注册' : '后台创建';
  document.querySelector('[data-config-server]').textContent = config.homeserverUrl.replace(/^https?:\/\//, '');
}

document.querySelector('[data-app-login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const payload = await api('/api/app/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
      }),
    });
    localStorage.setItem(tokenKey, payload.token);
    setLoggedIn(true);
    await loadConversations();
    showToast(`欢迎回来，${payload.displayName}`);
  } catch (error) {
    showToast('登录失败，请检查账号密码');
  }
});

document.querySelector('[data-app-register-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const payload = await api('/api/app/register', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        displayName: form.get('displayName'),
        inviteCode: form.get('inviteCode'),
      }),
    });
    localStorage.setItem(tokenKey, payload.token);
    setLoggedIn(true);
    await loadConversations();
    showToast(`已注册，欢迎 ${payload.displayName}`);
  } catch (error) {
    showToast('注册失败，请检查邀请码或账号');
  }
});

threadList.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-thread-action]');
  if (actionButton) {
    const thread = actionButton.closest('.thread');
    const roomId = thread?.dataset.roomId;
    const conversation = conversations.find((item) => item.roomId === roomId);
    if (!conversation) return;
    const action = actionButton.dataset.threadAction;
    const payload = {
      pin: { pinned: !conversation.pinned },
      mute: { muted: !conversation.muted },
      archive: { archived: true },
    }[action];
    api(`/api/app/conversations/${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify(action === 'archive' ? { archived: !conversation.archived } : payload),
    })
      .then(() => {
        if (action === 'archive' && activeRoomId === roomId) activeRoomId = null;
        return loadConversations();
      })
      .then(() => showToast(action === 'pin' ? '会话置顶已更新' : action === 'mute' ? '免打扰已更新' : conversation.archived ? '会话已恢复' : '会话已归档'))
      .catch(() => showToast('会话操作失败'));
    return;
  }
  const thread = event.target.closest('.thread');
  if (thread) activateRoom(thread.dataset.roomId);
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    currentThreadFilter = tab.textContent.trim();
    loadConversations().catch(() => showToast('加载会话失败'));
  });
});

document.querySelector('.search input').addEventListener('input', (event) => {
  const keyword = event.target.value.trim().toLowerCase();
  if (currentView === 'contacts') {
    renderContacts(visibleContacts(keyword));
    return;
  }
  if (currentView === 'files') {
    renderFiles(files.filter((item) => {
      const matchesKeyword = `${item.name} ${item.owner} ${item.type}`.toLowerCase().includes(keyword);
      const matchesType = currentFileFilter === '全部' || item.type === currentFileFilter;
      return matchesKeyword && matchesType;
    }));
    return;
  }
  if (currentView === 'settings') {
    renderSettings();
    return;
  }
  if (currentView === 'security') {
    renderSecurity();
    return;
  }
  renderThreads(conversations.filter((item) => `${item.name} ${item.preview}`.toLowerCase().includes(keyword)));
});

async function sendMessage() {
  const text = composer.value.trim();
  if (!text) {
    showToast('请输入消息内容');
    return;
  }
  composer.value = '';
  await api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content: text, replyTo: replyTarget }),
  });
  clearReply();
  await loadConversations();
}

function messageFromAction(button, key) {
  const article = button.closest('.msg');
  return {
    messageId: button.dataset[key],
    sender: article?.dataset.sender || '',
    content: article?.dataset.content || '',
  };
}

async function copyMessage(message) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message.content);
  }
  showToast('消息已复制');
}

function openForwardModal(message) {
  forwardTarget = message;
  forwardMessageModal.querySelector('[data-forward-message-preview]').textContent = `${message.sender}: ${message.content}`;
  forwardMessageModal.querySelector('[data-forward-message-list]').innerHTML = conversations
    .filter((item) => item.roomId !== activeRoomId && !item.archived)
    .map((item) => `
      <label class="contact-choice compact">
        <input type="radio" name="forwardRoom" value="${escapeHtml(item.roomId)}">
        <span class="avatar small ${item.color}">${escapeHtml(item.avatar)}</span>
        <span><strong>${escapeHtml(item.name)}</strong><em>${escapeHtml(item.type)} · ${escapeHtml(item.preview)}</em></span>
      </label>
    `).join('') || '<p class="modal-copy">暂无可转发会话</p>';
  forwardMessageModal.showModal();
}

document.querySelector('[data-send]').addEventListener('click', sendMessage);
document.querySelector('[data-cancel-reply]').addEventListener('click', clearReply);
scrollBottomButton.addEventListener('click', scrollMessagesToBottom);
messages.addEventListener('scroll', updateScrollBottomButton);
composer.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendMessage();
});

messages.addEventListener('click', (event) => {
  const replyButton = event.target.closest('[data-reply-message]');
  if (replyButton) {
    setReplyTarget(messageFromAction(replyButton, 'replyMessage'));
    return;
  }
  const copyButton = event.target.closest('[data-copy-message]');
  if (copyButton) {
    copyMessage(messageFromAction(copyButton, 'copyMessage')).catch(() => showToast('复制失败'));
    return;
  }
  const forwardButton = event.target.closest('[data-forward-message]');
  if (forwardButton) {
    openForwardModal(messageFromAction(forwardButton, 'forwardMessage'));
    return;
  }
  const editButton = event.target.closest('[data-edit-message]');
  if (editButton) {
    const messageId = editButton.dataset.editMessage;
    const bubble = editButton.closest('.bubble');
    editMessageModal.dataset.messageId = messageId;
    editMessageModal.querySelector('[name="content"]').value = bubble.querySelector('p, strong')?.textContent || '';
    editMessageModal.showModal();
    return;
  }
  const deleteButton = event.target.closest('[data-delete-message]');
  if (deleteButton) {
    api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/messages/${encodeURIComponent(deleteButton.dataset.deleteMessage)}`, { method: 'DELETE' })
      .then(() => loadConversations())
      .then(() => showToast('消息已撤回'))
      .catch(() => showToast('撤回消息失败'));
    return;
  }
  const reportButton = event.target.closest('[data-report-message]');
  if (!reportButton) return;
  api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/messages/${encodeURIComponent(reportButton.dataset.reportMessage)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason: '消息内容违规' }),
  })
    .then(() => showToast('举报已提交'))
    .catch(() => showToast('举报提交失败'));
});

editMessageModal.addEventListener('close', () => {
  if (editMessageModal.returnValue !== 'confirm') return;
  const content = editMessageModal.querySelector('[name="content"]').value.trim();
  if (!content) {
    showToast('消息内容不能为空');
    return;
  }
  api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/messages/${encodeURIComponent(editMessageModal.dataset.messageId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
    .then(() => loadConversations())
    .then(() => showToast('消息已编辑'))
    .catch(() => showToast('编辑消息失败'));
});

forwardMessageModal.addEventListener('close', () => {
  if (forwardMessageModal.returnValue !== 'confirm') {
    forwardTarget = null;
    return;
  }
  const roomId = forwardMessageModal.querySelector('[name="forwardRoom"]:checked')?.value;
  if (!roomId || !forwardTarget) {
    showToast('请选择转发会话');
    return;
  }
  api(`/api/app/rooms/${encodeURIComponent(roomId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: `转发 ${forwardTarget.sender}: ${forwardTarget.content}`,
      replyTo: {
        messageId: forwardTarget.messageId,
        sender: forwardTarget.sender,
        content: forwardTarget.content,
      },
    }),
  })
    .then(() => loadConversations())
    .then(() => showToast('消息已转发'))
    .catch(() => showToast('转发失败'))
    .finally(() => {
      forwardTarget = null;
    });
});

document.querySelector('[data-attachment]').addEventListener('click', () => {
  attachmentModal.showModal();
});

attachmentModal.addEventListener('close', () => {
  if (attachmentModal.returnValue !== 'confirm') return;
  const form = document.querySelector('[data-attachment-form]');
  const payload = {
    name: form.name.value.trim(),
    type: form.type.value.trim(),
    size: form.size.value.trim(),
  };
  api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/attachments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
    .then(() => loadConversations())
    .then(() => showToast(`已发送附件 ${payload.name}`))
    .catch(() => showToast('附件发送失败'));
});

filesList.addEventListener('click', (event) => {
  const filterButton = event.target.closest('[data-file-filter]');
  if (filterButton) {
    currentFileFilter = filterButton.dataset.fileFilter;
    const visible = currentFileFilter === '全部' ? files : files.filter((item) => item.type === currentFileFilter);
    renderFiles(visible);
    return;
  }
  const reportButton = event.target.closest('[data-report-file]');
  if (!reportButton) return;
  const row = reportButton.closest('[data-media-id]');
  const mediaId = row?.dataset.mediaId;
  api(`/api/app/files/${encodeURIComponent(mediaId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason: '文件内容违规' }),
  })
    .then(() => showToast('文件举报已提交'))
    .catch(() => showToast('文件举报失败'));
});

contactsList.addEventListener('click', (event) => {
  const filterButton = event.target.closest('[data-contact-filter]');
  if (filterButton) {
    currentContactFilter = filterButton.dataset.contactFilter;
    renderContacts(visibleContacts(document.querySelector('.search input').value.trim()));
    return;
  }
  const startButton = event.target.closest('[data-start-chat]');
  if (!startButton) return;
  const row = startButton.closest('[data-user-id]');
  const userId = row?.dataset.userId;
  api('/api/app/conversations', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
    .then((payload) => {
      activeRoomId = payload.data.roomId;
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      document.querySelector('[data-view="messages"]').classList.add('active');
      return loadConversations();
    })
    .then(() => showToast('已打开单聊'))
    .catch(() => showToast('发起会话失败'));
});

settingsList.addEventListener('click', (event) => {
  const profileButton = event.target.closest('[data-save-profile]');
  if (profileButton) {
    const displayName = settingsList.querySelector('[data-profile-display-name]')?.value.trim();
    const status = settingsList.querySelector('[data-profile-status]')?.value.trim();
    api('/api/app/me', {
      method: 'PUT',
      body: JSON.stringify({ displayName, status }),
    })
      .then(() => loadConversations())
      .then(() => {
        if (currentView === 'settings') renderSettings();
        showToast('个人资料已保存');
      })
      .catch(() => showToast('保存资料失败'));
    return;
  }
  const passwordButton = event.target.closest('[data-change-password]');
  if (passwordButton) {
    const password = settingsList.querySelector('[data-password-input]')?.value.trim();
    api('/api/app/me/password', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    })
      .then(() => {
        settingsList.querySelector('[data-password-input]').value = '';
        showToast('密码已修改');
      })
      .catch(() => showToast('密码至少 6 位'));
    return;
  }
  const removeButton = event.target.closest('[data-remove-device]');
  if (removeButton) {
    const row = removeButton.closest('[data-device-id]');
    const deviceId = row?.dataset.deviceId;
    api(`/api/app/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
      .then(() => loadConversations())
      .then(() => showToast(`已移除设备 ${deviceId}`))
      .catch(() => showToast('移除设备失败'));
    return;
  }
  const button = event.target.closest('[data-refresh-config]');
  if (!button) return;
  loadConversations()
    .then(() => showToast('已刷新客户端配置'))
    .catch(() => showToast('刷新失败'));
});

securityList.addEventListener('click', (event) => {
  const removeButton = event.target.closest('[data-remove-device]');
  if (removeButton) {
    const row = removeButton.closest('[data-device-id]');
    const deviceId = row?.dataset.deviceId;
    api(`/api/app/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
      .then(() => loadConversations())
      .then(() => showToast(`已移除设备 ${deviceId}`))
      .catch(() => showToast('移除设备失败'));
    return;
  }
  const button = event.target.closest('[data-refresh-config]');
  if (!button) return;
  loadConversations()
    .then(() => showToast('安全状态已刷新'))
    .catch(() => showToast('刷新失败'));
});

settingsList.addEventListener('change', (event) => {
  const input = event.target.closest('[data-pref]');
  if (!input) return;
  const payload = {
    ...currentPreferences,
    [input.dataset.pref]: input.checked,
  };
  api('/api/app/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
    .then((response) => {
      currentPreferences = response.data;
      renderSettings();
      showToast('通知偏好已保存');
    })
    .catch(() => showToast('保存偏好失败'));
});

function openNewChatModal() {
  const list = document.querySelector('[data-new-chat-list]');
  list.innerHTML = `
    <label class="login-field">
      <span>群聊名称</span>
      <input name="groupName" value="新项目群">
    </label>
    <p class="modal-copy">选择 1 人创建单聊，选择 2 人以上创建群聊。</p>
    ${contacts.map((contact) => `
    <label class="contact-choice" data-user-id="${contact.userId}">
      <input type="checkbox" name="member" value="${contact.userId}">
      <span class="avatar small ${contact.status === 'online' ? 'teal' : 'gray'}">${escapeHtml(initials(contact.displayName))}</span>
      <span><strong>${escapeHtml(contact.displayName)}</strong><em>${escapeHtml(contact.userId)}</em></span>
    </label>
  `).join('')}`;
  newChatModal.showModal();
}

newChatModal.addEventListener('close', () => {
  if (newChatModal.returnValue !== 'confirm') return;
  const selected = Array.from(newChatModal.querySelectorAll('[name="member"]:checked')).map((input) => input.value);
  if (!selected.length) {
    showToast('请选择联系人');
    return;
  }
  const groupName = newChatModal.querySelector('[name="groupName"]').value.trim();
  const endpoint = selected.length === 1 ? '/api/app/conversations' : '/api/app/group-conversations';
  const body = selected.length === 1
    ? { userId: selected[0] }
    : { name: groupName || '新群聊', userIds: selected };
  api(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
    .then((payload) => {
      activeRoomId = payload.data.roomId;
      return loadConversations();
    })
    .then(() => showToast(selected.length === 1 ? '会话已创建' : '群聊已创建'))
    .catch(() => showToast('新建会话失败'));
});

async function searchCurrentMessages() {
  const input = document.querySelector('[data-message-search-input]');
  const results = document.querySelector('[data-message-search-results]');
  const keyword = input.value.trim().toLowerCase();
  if (!keyword) {
    results.innerHTML = '<p class="modal-copy">请输入关键词</p>';
    return;
  }
  const payload = await api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/messages`);
  const matches = payload.data.filter((message) => `${message.sender} ${message.content}`.toLowerCase().includes(keyword));
  results.innerHTML = matches.map((message) => `
    <div class="search-result">
      <strong>${escapeHtml(message.sender)} · ${escapeHtml(message.time)}</strong>
      <p>${escapeHtml(message.content)}</p>
    </div>
  `).join('') || '<p class="modal-copy">没有找到匹配消息</p>';
}

document.querySelector('[data-search-messages]').addEventListener('click', () => {
  searchCurrentMessages().catch(() => showToast('搜索失败'));
});

async function openRoomModal() {
  const payload = await api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}`);
  const room = payload.data;
  const inviteCandidates = room.type === '群聊'
    ? contacts.filter((contact) => !room.members.some((member) => member.userId === contact.userId))
    : [];
  document.querySelector('[data-room-modal-body]').innerHTML = `
    <section class="setting-card">
      <h3>${escapeHtml(room.name)}</h3>
      <div class="setting-row"><span>类型</span><strong>${escapeHtml(room.type)}</strong></div>
      <div class="setting-row"><span>房间 ID</span><strong>${escapeHtml(room.matrixRoomId)}</strong></div>
      <div class="setting-row"><span>加密</span><strong>${room.encrypted ? '开启' : '关闭'}</strong></div>
      <div class="setting-row"><span>状态</span><strong>${room.status}</strong></div>
    </section>
    <section class="setting-card">
      <h3>成员</h3>
      ${room.members.map((member) => `
        <div class="room-info-row">
          <span class="avatar small ${member.role === 'owner' ? 'teal' : member.role === 'admin' ? 'amber' : 'blue'}">${escapeHtml(initials(member.displayName))}</span>
          <div><strong>${escapeHtml(member.displayName)}</strong><p>${escapeHtml(member.userId)} · ${escapeHtml(member.role)}</p></div>
          ${room.type === '群聊' && member.role !== 'owner' && member.role !== 'me' ? `<button class="tool-btn" data-remove-member="${member.userId}" type="button">R</button>` : ''}
        </div>
      `).join('')}
    </section>
    ${room.type === '群聊' ? `
    <section class="setting-card">
      <h3>邀请成员</h3>
      ${inviteCandidates.map((contact) => `
        <label class="contact-choice compact">
          <input type="checkbox" name="inviteMember" value="${contact.userId}">
          <span class="avatar small ${contact.status === 'online' ? 'teal' : 'gray'}">${escapeHtml(initials(contact.displayName))}</span>
          <span><strong>${escapeHtml(contact.displayName)}</strong><em>${escapeHtml(contact.userId)}</em></span>
        </label>
      `).join('') || '<p class="modal-copy">暂无可邀请联系人</p>'}
      <button class="send full" data-invite-members type="button">邀请选中成员</button>
    </section>
    ` : ''}
    <section class="setting-card">
      <h3>文件</h3>
      ${room.files.map((file) => `
        <div class="room-info-row">
          <span class="file-chip">${escapeHtml(file.type)}</span>
          <div><strong>${escapeHtml(file.name)}</strong><p>${escapeHtml(file.size)}</p></div>
        </div>
      `).join('') || '<p class="modal-copy">暂无共享文件</p>'}
    </section>
    <button class="send full danger-send" data-leave-room type="button">退出会话</button>
  `;
  if (!roomModal.open) roomModal.showModal();
}

roomModal.addEventListener('click', (event) => {
  const inviteButton = event.target.closest('[data-invite-members]');
  if (inviteButton) {
    const selected = Array.from(roomModal.querySelectorAll('[name="inviteMember"]:checked')).map((input) => input.value);
    if (!selected.length) {
      showToast('请选择要邀请的成员');
      return;
    }
    api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds: selected }),
    })
      .then(() => openRoomModal())
      .then(() => loadConversations())
      .then(() => showToast('成员已邀请'))
      .catch(() => showToast('邀请成员失败'));
    return;
  }

  const removeButton = event.target.closest('[data-remove-member]');
  if (removeButton) {
    const userId = removeButton.dataset.removeMember;
    api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' })
      .then(() => openRoomModal())
      .then(() => loadConversations())
      .then(() => showToast('成员已移除'))
      .catch(() => showToast('移除成员失败'));
    return;
  }

  const leaveButton = event.target.closest('[data-leave-room]');
  if (!leaveButton) return;
  api(`/api/app/rooms/${encodeURIComponent(activeRoomId)}/leave`, { method: 'POST' })
    .then(() => {
      roomModal.close();
      activeRoomId = null;
      return loadConversations();
    })
    .then(() => showToast('已退出会话'))
    .catch(() => showToast('退出会话失败'));
});

document.querySelectorAll('.rail-btn, .icon-btn, .tool-btn').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.matches('[data-app-logout]')) {
      localStorage.removeItem(tokenKey);
      setLoggedIn(false);
      showToast('已退出登录');
      return;
    }
    if (button.matches('[data-refresh-config]')) {
      loadConversations()
        .then(() => {
          if (currentView === 'settings') renderSettings();
          showToast('已刷新客户端配置');
        })
        .catch(() => showToast('刷新失败'));
      return;
    }
    if (button.title === '搜索消息') {
      document.querySelector('[data-message-search-input]').value = '';
      document.querySelector('[data-message-search-results]').innerHTML = '';
      searchModal.showModal();
      return;
    }
    if (button.title === '群设置') {
      openRoomModal().catch(() => showToast('打开会话详情失败'));
      return;
    }
    if (button.title === '新建会话') {
      openNewChatModal();
      return;
    }
    if (button.dataset.view === 'contacts') {
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderContacts(visibleContacts());
      showToast('已打开通讯录');
      return;
    }
    if (button.dataset.view === 'files') {
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderFiles(currentFileFilter === '全部' ? files : files.filter((item) => item.type === currentFileFilter));
      showToast('已打开文件');
      return;
    }
    if (button.dataset.view === 'security') {
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderSecurity();
      showToast('已打开安全');
      return;
    }
    if (button.dataset.view === 'messages') {
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderThreads(conversations);
      return;
    }
    if (button.dataset.view === 'settings') {
      document.querySelectorAll('.rail-btn').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      renderSettings();
      showToast('已打开设置');
      return;
    }
    showToast(`${button.title || '功能'} 将在正式版接入`);
  });
});

setLoggedIn(Boolean(localStorage.getItem(tokenKey)));
if (localStorage.getItem(tokenKey)) {
  loadConversations().catch(() => {
    localStorage.removeItem(tokenKey);
    setLoggedIn(false);
    showToast('App Backend 未连接，请重新登录');
  });
}
