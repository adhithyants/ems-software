import { ipcMain } from 'electron';
import { deleteSecureValue, getSecureValue, setSecureValue } from './storage.js';

const ALLOWED_KEYS = new Set(['access_token', 'refresh_token']);

function assertValidKey(key) {
  if (typeof key !== 'string' || !ALLOWED_KEYS.has(key)) {
    throw new Error(`Unsupported secure storage key: ${String(key)}`);
  }
}

export function registerIpcHandlers() {
  ipcMain.handle('secure-store:get', async (_event, key) => {
    assertValidKey(key);
    return getSecureValue(key);
  });

  ipcMain.handle('secure-store:set', async (_event, key, value) => {
    assertValidKey(key);
    if (typeof value !== 'string') {
      throw new TypeError('Secure storage values must be strings.');
    }

    return setSecureValue(key, value);
  });

  ipcMain.handle('secure-store:delete', async (_event, key) => {
    assertValidKey(key);
    return deleteSecureValue(key);
  });
}
