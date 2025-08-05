const { app, BrowserWindow, ipcMain, BrowserView, shell, dialog, net, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const os = require('os');
const config = require('./config.json');

// Enable hot-reloading in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module);
  } catch (err) {
    console.error('Failed to start electron-reloader:', err);
  }
}

let mainWindow;
const views = new Map();
let viewOffset = 80;

function createWindow() {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  let iconPath;
  if (isMac) {
    const darwinVersion = parseInt(os.release().split('.')[0], 10);
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    iconPath = darwinVersion >= 20 ? path.join(iconsDir, 'build/icons/icon.icns') : path.join(iconsDir, 'build/icons/icon_legacy.icns');
  } else if (isWin) {
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    iconPath = path.join(iconsDir, 'build/icons/icon.ico');
  } else {
    console.warn('Unsupported platform: ' + process.platform);
    // Set a default icon or handle accordingly
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    iconPath = path.join(iconsDir, ''); // Using PNG as fallback
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    icon: iconPath,
    ...(isMac ? { 
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 15, y: 16 }
    } : (isWin ? {} : {}))
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('platform', process.platform);
    mainWindow.webContents.send('config', config);
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });

  mainWindow.on('resize', () => {
    const contentBounds = mainWindow.getContentBounds();
    for (const view of views.values()) {
      // The y-position should account for the height of the toolbar and tab bar.
      view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
    }
  });

  ipcMain.on('update-view-position', (event, offset) => {
    viewOffset = offset;
    const contentBounds = mainWindow.getContentBounds();
    for (const view of views.values()) {
        view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
    }
  });

  // mainWindow.webContents.openDevTools();
}

// --- Window Controls (for Windows/Linux) ---
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});



ipcMain.on('open-in-browser', (event, url) => {
    shell.openExternal(url);
});

app.on('ready', () => {
  app.setName(config.appName);
  app.commandLine.appendSwitch('disable-webrtc');
  createWindow();
  autoUpdater.autoDownload = false;
  autoUpdater.forceDevUpdateConfig = true;
  autoUpdater.checkForUpdates().catch(err => console.error('Initial update check failed:', err));

// 每3分钟检查一次更新
setInterval(() => {
  autoUpdater.checkForUpdates().catch(err => console.error('Periodic update check failed:', err));
}, 180000);

// 添加更新事件监听器以记录日志
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});
// 添加下载处理
ipcMain.handle('download-update-file', async (event, downloadUrl) => {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  let defaultPath;
  let extension;
  if (isMac) {
    defaultPath = path.join(app.getPath('downloads'), path.basename(downloadUrl));
    extension = 'dmg';
  } else if (isWin) {
    defaultPath = path.join(app.getPath('desktop'), path.basename(downloadUrl));
    extension = 'exe';
  } else {
    defaultPath = path.join(app.getPath('downloads'), path.basename(downloadUrl));
    extension = 'zip'; // Fallback
  }
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'Installer', extensions: [extension] }]
  });
  if (canceled || !filePath) return { success: false };

  return new Promise((resolve) => {
    const request = net.request(downloadUrl);
    request.on('response', (response) => {
      if (response.statusCode === 200) {
        const file = require('fs').createWriteStream(filePath);
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve({ success: true, filePath }));
        });
      } else {
        resolve({ success: false, error: `Failed to download: ${response.statusCode}` });
      }
    });
    request.end();
  });
});


autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  mainWindow.webContents.send('update-not-available', info);
});
autoUpdater.on('error', (err) => {
  console.error('Update error:', err);
});
autoUpdater.on('download-progress', (progressObj) => {
  console.log('Download progress:', progressObj);
});
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  mainWindow.webContents.send('update-downloaded', autoUpdater.downloadedUpdateHelper.cacheDir);
});

// 处理手动更新检查
ipcMain.on('check-for-manual-update', () => {
  autoUpdater.checkForUpdates().catch(err => console.error('Manual update check failed:', err));
});

// 处理手动下载更新
ipcMain.on('manual-download-update', () => {
  autoUpdater.downloadUpdate();
});

// 发送更新可用事件到渲染进程
autoUpdater.on('update-available', (info) => {
  try {
    console.log('Update available:', info);
    const platform = process.platform;
    let extensions;
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';
    // Load environment variables from .env file
    require('dotenv').config();
    
    // In the update-available handler:
    let file;
    if (isMac) {
      file = info.files.find(f => f.url.endsWith('.dmg')) || info.files.find(f => f.url.endsWith('.zip'));
    } else if (isWin) {
      extensions = ['.exe', '.msi'];
      file = info.files.find(f => extensions.some(ext => f.url.endsWith(ext)));
    } else {
      console.warn('Unsupported platform for update:', process.platform);
      mainWindow.webContents.send('update-not-available', info);
      return;
    }
    if (file) {
      const githubRepoUrl = `https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;
      const downloadUrl = `${githubRepoUrl}/releases/download/v${info.version}/${file.url}`;
      mainWindow.webContents.send('update-available', { downloadUrl });
    } else {
      mainWindow.webContents.send('update-not-available', info);
    }
  } catch (err) {
    console.error('Error in update-available handler:', err);
  }
});

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  if (details.url.startsWith(`https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/releases/latest`)) {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*']
      }
    });
  } else {
    callback({ responseHeaders: details.responseHeaders });
  }
});

});

app.on('window-all-closed', function () {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  if (!isMac) {
    if (isWin) {
      app.quit(); // Explicit for Windows
    } else {
      console.warn('Unsupported platform for window-all-closed:', process.platform);
      app.quit(); // Default behavior for other platforms
    }
  } // For macOS, do nothing to keep the app running
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- BrowserView Management ---

ipcMain.on('create-tab', (event, { url, tabId }) => {
  
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'view-preload.js'),
      // We need to enable contextIsolation for the preload script to work correctly
      // and have access to the window object of the loaded page.
      contextIsolation: true,
    }
  });
  view.setBackgroundColor('#FFFFFF'); // Set background on creation
  views.set(tabId, view);
  mainWindow.addBrowserView(view);
  
  const contentBounds = mainWindow.getContentBounds();
  view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
  view.setAutoResize({ width: true, height: true });
  view.webContents.loadURL(url || config.homeUrl);

  // Relay navigation events to the renderer process for URL bar updates
  const updateNavigationState = () => {
    if (!mainWindow) return;
    const canGoBack = view.webContents.canGoBack();
    const canGoForward = view.webContents.canGoForward();
    
    mainWindow.webContents.send('update-navigation-state', { tabId, canGoBack, canGoForward });
  };

  view.webContents.on('did-navigate', (event, url) => {
    if (!mainWindow) return;
    mainWindow.webContents.send('update-url', { tabId, url });
    updateNavigationState();
  });

  view.webContents.on('did-navigate-in-page', (event, url) => {
    if (!mainWindow) return;
    mainWindow.webContents.send('update-url', { tabId, url });
    updateNavigationState();
  });

  // Relay page title updates to the renderer process
  view.webContents.on('page-title-updated', (event, title) => {
    if (!mainWindow) return;
    mainWindow.webContents.send('update-title', { tabId, title });
    updateNavigationState();
  });

  view.webContents.on('page-favicon-updated', (event, favicons) => {
    if (!mainWindow) return;
    if (favicons && favicons.length > 0) {
      mainWindow.webContents.send('update-favicon', { tabId, favicon: favicons[0] });
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    event.sender.send('create-new-tab-from-view', url);
    return { action: 'deny' };
  });
});

ipcMain.on('switch-tab', (event, activeTabId) => {
  if (!mainWindow) return;
  const view = views.get(activeTabId);
  if (view) {
    view.setBackgroundColor('#FFFFFF');
    mainWindow.setTopBrowserView(view);
    const url = view.webContents.getURL();
    mainWindow.webContents.send('update-url', { tabId: activeTabId, url });
    const canGoBack = view.webContents.canGoBack();
    const canGoForward = view.webContents.canGoForward();
    mainWindow.webContents.send('update-navigation-state', { tabId: activeTabId, canGoBack, canGoForward });
  }
});

ipcMain.on('close-tab', (event, tabId) => {
  const view = views.get(tabId);
  if (view) {
    if (mainWindow) {
      mainWindow.removeBrowserView(view);
    }
    view.webContents.destroy();
    views.delete(tabId);
  }
});

ipcMain.on('navigate', (event, { tabId, action }) => {
  
  const view = views.get(tabId);
  if (view) {
    switch (action) {
      case 'back':
        if (view.webContents.canGoBack()) view.webContents.goBack();
        break;
      case 'forward':
        if (view.webContents.canGoForward()) view.webContents.goForward();
        break;
      case 'reload':
        view.webContents.reload();
        break;
      case 'home':
        view.webContents.loadURL(config.homeUrl);
        break;
    }
  }
});

ipcMain.on('open-dev-tools', (event, tabId) => {
    const view = views.get(tabId);
    if (view) {
        view.webContents.openDevTools();
    }
});


// This listener handles navigation events triggered by the History API
// (e.g., pushState, replaceState) from within a BrowserView's preload script.
ipcMain.on('manual-navigation', (event, url) => {
    const webContents = event.sender;
    let foundTabId = null;
    // Find the tabId associated with the BrowserView that sent the event
    for (const [tabId, browserView] of views.entries()) {
        if (browserView.webContents.id === webContents.id) {
            foundTabId = tabId;
            break;
        }
    }

    if (foundTabId) {
        // Update the URL bar in the main window renderer
        mainWindow.webContents.send('update-url', { tabId: foundTabId, url });
        // Update the navigation state (back/forward buttons)
        const canGoBack = webContents.canGoBack();
        const canGoForward = webContents.canGoForward();
        mainWindow.webContents.send('update-navigation-state', { tabId: foundTabId, canGoBack, canGoForward });
    }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (error === 'net::ERR_CERT_COMMON_NAME_INVALID') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});