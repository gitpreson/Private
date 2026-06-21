const defaultAdmins = [
  { key: 'owner', username: 'admin', password: 'admin123', token: 'demo-admin-token', role: 'owner' },
  { key: 'operator', username: 'operator', password: 'ops123', token: 'demo-operator-token', role: 'admin' },
  { key: 'auditor', username: 'auditor', password: 'audit123', token: 'demo-auditor-token', role: 'auditor' },
];

function envName(key, field) {
  return `ADMIN_${key.toUpperCase()}_${field.toUpperCase()}`;
}

export function adminAccounts(env = process.env) {
  return Object.fromEntries(defaultAdmins.map((admin) => {
    const account = {
      username: env[envName(admin.key, 'username')] || admin.username,
      password: env[envName(admin.key, 'password')] || admin.password,
      token: env[envName(admin.key, 'token')] || admin.token,
      role: admin.role,
    };
    return [account.username, account];
  }));
}

export function appAccessToken(env = process.env) {
  return env.APP_DEMO_TOKEN || 'demo-app-token';
}

export function authChecks(accounts = adminAccounts(), appToken = appAccessToken()) {
  const values = Object.values(accounts);
  const defaultPasswordCount = values.filter((account) => {
    const original = defaultAdmins.find((admin) => admin.role === account.role);
    return original?.password === account.password;
  }).length;
  const defaultTokenCount = values.filter((account) => {
    const original = defaultAdmins.find((admin) => admin.role === account.role);
    return original?.token === account.token;
  }).length;

  return [
    {
      key: 'admin_credentials',
      label: '后台管理员凭据',
      status: defaultPasswordCount || defaultTokenCount ? 'warn' : 'pass',
      detail: defaultPasswordCount || defaultTokenCount
        ? '仍在使用 Demo 密码或 Token，部署前必须替换'
        : '已通过环境变量覆盖默认凭据',
    },
    {
      key: 'app_demo_token',
      label: 'App Demo Token',
      status: appToken === 'demo-app-token' ? 'warn' : 'pass',
      detail: appToken === 'demo-app-token' ? '仍在使用默认 App Token' : '已通过 APP_DEMO_TOKEN 覆盖',
    },
  ];
}
