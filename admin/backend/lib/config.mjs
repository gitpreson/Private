import { resolve } from 'node:path';

export function runtimeConfig(env = process.env) {
  const mode = env.ADMIN_BACKEND_MODE || 'mock';
  const mockDbPath = resolve(env.MOCK_DB_PATH || 'work/runtime/mock-db.json');
  const synapseBaseUrl = env.SYNAPSE_ADMIN_API_BASE_URL || 'http://127.0.0.1:8008';
  return {
    mode,
    port: Number(env.ADMIN_BACKEND_PORT || 4180),
    bindHost: '127.0.0.1',
    mockDbPath,
    synapseBaseUrl,
    hasSynapseToken: Boolean(env.SYNAPSE_ADMIN_TOKEN),
    adminApiExposure: 'internal_only',
  };
}

export function configChecks(config = runtimeConfig()) {
  return [
    {
      key: 'admin_api_public_exposure',
      label: 'Admin API 不暴露公网',
      status: config.bindHost === '127.0.0.1' ? 'pass' : 'warn',
      detail: `当前绑定 ${config.bindHost}`,
    },
    {
      key: 'synapse_token',
      label: 'Synapse 管理 Token',
      status: config.mode === 'mock' || config.hasSynapseToken ? 'pass' : 'fail',
      detail: config.mode === 'mock' ? 'Mock 模式无需 Token' : 'Synapse 模式需要 SYNAPSE_ADMIN_TOKEN',
    },
    {
      key: 'persistence',
      label: '本地持久化',
      status: config.mode === 'mock' ? 'pass' : 'pass',
      detail: config.mode === 'mock' ? config.mockDbPath : 'Synapse/PostgreSQL',
    },
    {
      key: 'homeserver',
      label: 'Homeserver 地址',
      status: config.synapseBaseUrl.startsWith('http://127.0.0.1') || config.synapseBaseUrl.startsWith('http://localhost') ? 'pass' : 'warn',
      detail: config.synapseBaseUrl,
    },
  ];
}

export function deployEnvChecklist(env = process.env) {
  const required = [
    ['ADMIN_BACKEND_MODE', '后台运行模式'],
    ['ADMIN_OWNER_USERNAME', 'Owner 账号'],
    ['ADMIN_OWNER_PASSWORD', 'Owner 密码'],
    ['ADMIN_OWNER_TOKEN', 'Owner Token'],
    ['ADMIN_OPERATOR_USERNAME', '运营账号'],
    ['ADMIN_OPERATOR_PASSWORD', '运营密码'],
    ['ADMIN_OPERATOR_TOKEN', '运营 Token'],
    ['ADMIN_AUDITOR_USERNAME', '审计账号'],
    ['ADMIN_AUDITOR_PASSWORD', '审计密码'],
    ['ADMIN_AUDITOR_TOKEN', '审计 Token'],
    ['APP_DEMO_TOKEN', 'App 访问 Token'],
    ['SYNAPSE_ADMIN_API_BASE_URL', 'Synapse Admin API 地址'],
  ];
  const synapseRequired = [
    ['SYNAPSE_ADMIN_TOKEN', 'Synapse 管理 Token'],
  ];
  const defaults = new Set([
    'admin123',
    'demo-admin-token',
    'ops123',
    'demo-operator-token',
    'audit123',
    'demo-auditor-token',
    'demo-app-token',
  ]);
  const items = [...required, ...(env.ADMIN_BACKEND_MODE === 'synapse' ? synapseRequired : [])].map(([key, label]) => {
    const value = env[key] || '';
    const missing = !value;
    const usingDefault = defaults.has(value);
    return {
      key,
      label,
      status: missing ? 'missing' : usingDefault ? 'default' : 'ready',
      detail: missing ? '未设置' : usingDefault ? '仍在使用默认值' : '已设置',
    };
  });
  const summary = items.reduce((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { ready: 0, default: 0, missing: 0 });
  const example = [
    'ADMIN_BACKEND_MODE=synapse',
    'ADMIN_BACKEND_PORT=4180',
    'ADMIN_OWNER_USERNAME=admin',
    'ADMIN_OWNER_PASSWORD=replace-with-strong-password',
    'ADMIN_OWNER_TOKEN=replace-with-random-token',
    'ADMIN_OPERATOR_USERNAME=operator',
    'ADMIN_OPERATOR_PASSWORD=replace-with-strong-password',
    'ADMIN_OPERATOR_TOKEN=replace-with-random-token',
    'ADMIN_AUDITOR_USERNAME=auditor',
    'ADMIN_AUDITOR_PASSWORD=replace-with-strong-password',
    'ADMIN_AUDITOR_TOKEN=replace-with-random-token',
    'APP_DEMO_TOKEN=replace-with-random-app-token',
    'SYNAPSE_ADMIN_API_BASE_URL=http://127.0.0.1:8008',
    'SYNAPSE_ADMIN_TOKEN=replace-with-synapse-admin-access-token',
    'MOCK_DB_PATH=work/runtime/mock-db.json',
  ].join('\n');
  return {
    readyForSynapseMode: summary.missing === 0 && summary.default === 0,
    summary,
    items,
    example,
  };
}
