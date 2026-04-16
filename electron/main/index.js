import { app, BrowserWindow, net, powerMonitor, protocol } from 'electron';
import log from 'electron-log/main';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { access } from 'node:fs/promises';
import { registerIpcHandlers } from './ipc.js';

const APP_PROTOCOL = 'ems';

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow = null;

function isDevelopment() {
  return !app.isPackaged;
}

function getAppRoot() {
  return app.getAppPath();
}

function getRendererDistPath() {
  return path.join(getAppRoot(), 'dist');
}

function getPreloadPath() {
  return path.join(getAppRoot(), 'dist-electron/preload/index.js');
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveAppAsset(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidatePath = path.join(getRendererDistPath(), relativePath);

  if (await fileExists(candidatePath)) {
    return candidatePath;
  }

  return path.join(getRendererDistPath(), 'index.html');
}

async function registerAppProtocol() {
  protocol.handle(APP_PROTOCOL, async (request) => {
    const filePath = await resolveAppAsset(request.url);
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#101714',
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (isDevelopment() && devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await mainWindow.loadURL(`${APP_PROTOCOL}://app/index.html`);
}

app.whenReady().then(async () => {
  log.initialize();
  log.transports.file.level = 'info';
  log.transports.file.resolvePathFn = () => path.join(app.getPath('appData'), 'ems', 'logs', 'main.log');
  registerIpcHandlers();
  await registerAppProtocol();
  await createWindow();

  powerMonitor.on('resume', () => {
    mainWindow?.webContents.send('system:wake-up');
  });

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
