import { isElectron } from './desktop';

function getWebStorage() {
  return window.localStorage;
}

export function getStoredUser() {
  const stored = getWebStorage().getItem('user');
  return stored ? JSON.parse(stored) : null;
}

export function setStoredUser(user) {
  getWebStorage().setItem('user', JSON.stringify(user));
}

export function clearStoredUser() {
  getWebStorage().removeItem('user');
}

export async function getAccessToken() {
  if (isElectron) {
    return window.emsApi.getAuthToken();
  }

  return getWebStorage().getItem('access_token');
}

export async function setAccessToken(token) {
  if (isElectron) {
    return window.emsApi.setAuthToken(token);
  }

  getWebStorage().setItem('access_token', token);
}

export async function getRefreshToken() {
  if (isElectron) {
    return window.emsApi.getRefreshToken();
  }

  return getWebStorage().getItem('refresh_token');
}

export async function setRefreshToken(token) {
  if (isElectron) {
    return window.emsApi.setRefreshToken(token);
  }

  getWebStorage().setItem('refresh_token', token);
}

export async function clearAuthTokens() {
  if (isElectron) {
    return window.emsApi.clearAuthTokens();
  }

  getWebStorage().removeItem('access_token');
  getWebStorage().removeItem('refresh_token');
}
