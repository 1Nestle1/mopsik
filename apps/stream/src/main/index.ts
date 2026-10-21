import { app, BrowserWindow, session, shell } from 'electron';
import path from 'path';
import { stopAppAudio } from './app-audio';
import { registerIpc } from './ipc';
import { stopWhipSession } from './whip-http';

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 980,
    minHeight: 660,
    title: 'MOPSCORD Stream',
    backgroundColor: '#2e2e2e',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      // the bundler pins __dirname to the source folder, the app path is right in dev and packaged
      preload: path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      // the stream must keep its frame rate while this window sits behind the game
      backgroundThrottling: false
    }
  });

  window.once('ready-to-show', () => window.show());

  // links leave for the real browser instead of opening inside the app
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);

    return { action: 'deny' };
  });

  window.loadFile(path.join(app.getAppPath(), 'dist-renderer', 'index.html'));

  return window;
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [window] = BrowserWindow.getAllWindows();

    if (!window) return;
    if (window.isMinimized()) window.restore();

    window.focus();
  });

  app.whenReady().then(() => {
    // the only permission this app asks the engine for is capturing media
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => callback(permission === 'media')
    );

    const window = createWindow();

    registerIpc(window);
  });

  app.on('window-all-closed', async () => {
    stopAppAudio();
    await stopWhipSession();

    app.quit();
  });
}
