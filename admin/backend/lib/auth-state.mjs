import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const defaultPath = resolve(process.env.AUTH_STATE_PATH || 'work/runtime/auth-state.json');
const lockThreshold = 5;
const lockMs = 60_000;

function loadState(filePath = defaultPath) {
  if (!existsSync(filePath)) return { admins: {} };
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function saveState(state, filePath = defaultPath) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

function accountState(state, username) {
  state.admins[username] = state.admins[username] || { failedLoginCount: 0, lastLoginAt: null, lockedUntil: null };
  return state.admins[username];
}

export function getAdminAuthState(username) {
  return accountState(loadState(), username);
}

export function isAdminLocked(username, now = Date.now()) {
  const record = getAdminAuthState(username);
  return record.lockedUntil && new Date(record.lockedUntil).getTime() > now;
}

export function recordAdminLoginFailure(username, now = new Date()) {
  const state = loadState();
  const record = accountState(state, username || 'unknown');
  record.failedLoginCount = Number(record.failedLoginCount || 0) + 1;
  record.lastFailedLoginAt = now.toISOString();
  if (record.failedLoginCount >= lockThreshold) {
    record.lockedUntil = new Date(now.getTime() + lockMs).toISOString();
  }
  saveState(state);
  return record;
}

export function recordAdminLoginSuccess(username, now = new Date()) {
  const state = loadState();
  const record = accountState(state, username);
  record.failedLoginCount = 0;
  record.lockedUntil = null;
  record.lastLoginAt = now.toISOString();
  saveState(state);
  return record;
}

export function authStateStatus(now = Date.now()) {
  const state = loadState();
  const admins = Object.entries(state.admins || {}).map(([username, record]) => {
    const locked = Boolean(record.lockedUntil && new Date(record.lockedUntil).getTime() > now);
    return {
      username,
      failedLoginCount: Number(record.failedLoginCount || 0),
      lastLoginAt: record.lastLoginAt || null,
      lastFailedLoginAt: record.lastFailedLoginAt || null,
      lockedUntil: record.lockedUntil || null,
      locked,
    };
  });
  return {
    path: defaultPath,
    accounts: admins.length,
    lockedAccounts: admins.filter((record) => record.locked).length,
    failedAttempts: admins.reduce((sum, record) => sum + record.failedLoginCount, 0),
    admins,
  };
}

export function cleanupExpiredAdminLocks(now = Date.now()) {
  const state = loadState();
  let cleared = 0;
  for (const record of Object.values(state.admins || {})) {
    if (record.lockedUntil && new Date(record.lockedUntil).getTime() <= now) {
      record.lockedUntil = null;
      record.failedLoginCount = 0;
      cleared += 1;
    }
  }
  saveState(state);
  return { cleared, status: authStateStatus(now) };
}
