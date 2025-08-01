const { app, BrowserWindow, ipcMain, BrowserView, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

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

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    ...(isMac ? { 
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 15, y: 16 }
    } : {})
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('platform', process.platform);
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
  app.commandLine.appendSwitch('disable-webrtc');
  createWindow();
  autoUpdater.checkForUpdates();

// 每小时检查一次更新
setInterval(() => {
  autoUpdater.checkForUpdates();
}, 180000);

// 添加更新事件监听器以记录日志
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
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
  autoUpdater.checkForUpdates();
});

// 处理手动下载更新
ipcMain.on('manual-download-update', () => {
  autoUpdater.downloadUpdate();
});

// 发送更新可用事件到渲染进程
autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  const platform = process.platform;
  let extensions;
  if (platform === 'darwin') {
    extensions = ['.dmg', '.zip'];
  } else if (platform === 'win32') {
    extensions = ['.exe', '.msi'];
  } else {
    extensions = [];
  }
  const hasPlatformUpdate = info.files && info.files.some(file => extensions.some(ext => file.url.endsWith(ext)));
  if (hasPlatformUpdate) {
    mainWindow.webContents.send('update-available', info);
  } else {
    mainWindow.webContents.send('update-not-available', info);
  }
});
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
  view.webContents.loadURL(url || 'https://transall.toolsai.com.cn');

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
        view.webContents.loadURL('https://transall.toolsai.com.cn');
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