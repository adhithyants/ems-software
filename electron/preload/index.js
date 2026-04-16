import { contextBridge, ipcRenderer } from 'electron';

function assertToken(value, label) {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }
}

contextBridge.exposeInMainWorld('emsApi', {
  getAuthToken: () => ipcRenderer.invoke('secure-store:get', 'access_token'),
  setAuthToken: (token) => {
    assertToken(token, 'Auth token');
    return ipcRenderer.invoke('secure-store:set', 'access_token', token);
  },
  getRefreshToken: () => ipcRenderer.invoke('secure-store:get', 'refresh_token'),
  setRefreshToken: (token) => {
    assertToken(token, 'Refresh token');
    return ipcRenderer.invoke('secure-store:set', 'refresh_token', token);
  },
  clearAuthTokens: async () => {
    await ipcRenderer.invoke('secure-store:delete', 'access_token');
    await ipcRenderer.invoke('secure-store:delete', 'refresh_token');
    return true;
  },
  onWakeUp: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Wake-up callback must be a function.');
    }

    const listener = () => callback();
    ipcRenderer.on('system:wake-up', listener);

    return () => {
      ipcRenderer.removeListener('system:wake-up', listener);
    };
  },
});
