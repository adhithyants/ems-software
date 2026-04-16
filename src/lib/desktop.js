export const isElectron = Boolean(import.meta.env.VITE_IS_ELECTRON) && typeof window !== 'undefined' && Boolean(window.emsApi);
export const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';

export function getCurrentAppPath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  if (isElectron) {
    const hashPath = window.location.hash.replace(/^#/, '');
    return hashPath || '/';
  }

  return window.location.pathname;
}

export function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const target = isElectron ? '/#/' : '/';
  window.location.assign(target);
}
