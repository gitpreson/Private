import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const defaultPath = resolve('work/runtime/mock-db.json');

export function loadStore(defaultState, filePath = process.env.MOCK_DB_PATH || defaultPath) {
  if (!existsSync(filePath)) return structuredClone(defaultState);

  const raw = readFileSync(filePath, 'utf8');
  const saved = JSON.parse(raw);
  return {
    ...structuredClone(defaultState),
    ...saved,
    appSessions: new Map(),
  };
}

export function saveStore(state, filePath = process.env.MOCK_DB_PATH || defaultPath) {
  mkdirSync(dirname(filePath), { recursive: true });
  const { appSessions, ...serializable } = state;
  writeFileSync(filePath, `${JSON.stringify(serializable, null, 2)}\n`);
}

export function resetStore(defaultState, filePath = process.env.MOCK_DB_PATH || defaultPath) {
  const fresh = structuredClone(defaultState);
  mkdirSync(dirname(filePath), { recursive: true });
  const { appSessions, ...serializable } = fresh;
  writeFileSync(filePath, `${JSON.stringify(serializable, null, 2)}\n`);
  return { ...fresh, appSessions: new Map() };
}

export function storageStatus(filePath = process.env.MOCK_DB_PATH || defaultPath) {
  if (!existsSync(filePath)) {
    return {
      path: filePath,
      exists: false,
      sizeBytes: 0,
      sizeKb: 0,
      updatedAt: null,
      health: 'missing',
      recommendation: '首次写入后会自动创建 Mock 数据文件',
    };
  }
  const stat = statSync(filePath);
  const sizeKb = Number((stat.size / 1024).toFixed(1));
  return {
    path: filePath,
    exists: true,
    sizeBytes: stat.size,
    sizeKb,
    updatedAt: stat.mtime.toISOString(),
    health: sizeKb > 1024 ? 'review' : 'ok',
    recommendation: sizeKb > 1024 ? '建议导出备份后清理历史数据' : '当前本地数据量正常',
  };
}
