// 引入Electron模块和相关依赖，用于构建桌面应用
// app: 控制应用生命周期
// BrowserWindow: 创建和管理浏览器窗口
// ipcMain: 主进程与渲染进程通信
// BrowserView: 嵌入web内容
// shell: 与系统交互，如打开外部链接
// dialog: 显示系统对话框
// net: 网络请求
// session: 会话管理
const { app, BrowserWindow, ipcMain, BrowserView, shell, dialog, net, session } = require('electron');
// 引入electron-updater用于应用自动更新
const { autoUpdater } = require('electron-updater');
// 引入path模块用于路径操作
const path = require('path');
// 引入js-yaml用于解析YAML文件
const yaml = require('js-yaml');
// 引入fs模块用于文件系统操作
const fs = require('fs');
// 引入os模块用于获取操作系统信息
const os = require('os');
// 引入配置文件
const config = require('./config.json');

// 加载更新配置文件（从yml）
let updateConfig;
if (process.env.NODE_ENV !== 'production') {
  // 开发模式下加载dev-app-update.yml
  updateConfig = yaml.load(fs.readFileSync(path.join(__dirname, 'dev-app-update.yml'), 'utf8'));
} else {
  // 生产模式下加载app-update.yml
  updateConfig = yaml.load(fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8'));
}
// 从配置中提取GitHub所有者和仓库名
const GITHUB_OWNER = updateConfig.owner;
const GITHUB_REPO = updateConfig.repo;

// 在开发模式下启用热重载
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reloader')(module);
  } catch (err) {
    // 记录热重载启动失败的错误
    console.error('Failed to start electron-reloader:', err);
  }
}

// 声明主窗口变量
let mainWindow;
// 使用Map存储BrowserView实例
const views = new Map();
// 视图偏移量，初始为80，用于调整视图位置
let viewOffset = 80;

// 创建主窗口的函数
function createWindow() {
  // 判断是否为macOS平台
  const isMac = process.platform === 'darwin';
  // 判断是否为Windows平台
  const isWin = process.platform === 'win32';
  // 图标路径变量
  let iconPath;
  if (isMac) {
    // 获取macOS版本
    const darwinVersion = parseInt(os.release().split('.')[0], 10);
    // 根据打包状态选择图标目录
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    // 根据macOS版本选择图标
    iconPath = darwinVersion >= 20 ? path.join(iconsDir, 'build/icons/icon.icns') : path.join(iconsDir, 'build/icons/icon_legacy.icns');
  } else if (isWin) {
    // 根据打包状态选择图标目录
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    // Windows图标路径
    iconPath = path.join(iconsDir, 'build/icons/icon.ico');
  } else {
    // 警告不支持的平台
    console.warn('Unsupported platform: ' + process.platform);
    // 设置默认图标目录
    const iconsDir = app.isPackaged ? process.resourcesPath : __dirname;
    // 使用PNG作为回退
    iconPath = path.join(iconsDir, '');
  }
  // 创建BrowserWindow实例
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    webPreferences: {
      // 预加载脚本路径
      preload: path.join(__dirname, 'preload.js'),
      // 启用上下文隔离
      contextIsolation: true,
      // 禁用Node.js集成
      nodeIntegration: false,
    },
    // 无边框窗口
    frame: false,
    // 设置窗口图标
    icon: iconPath,
    ...(isMac ? { 
      // macOS特定样式
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 15, y: 16 }
    } : (isWin ? {} : {}))
  });

  // 加载index.html文件
  mainWindow.loadFile('index.html');

  // 当web内容加载完成时
  mainWindow.webContents.on('did-finish-load', () => {
    // 发送平台信息到渲染进程
    mainWindow.webContents.send('platform', process.platform);
    // 发送配置信息到渲染进程
    mainWindow.webContents.send('config', config);
  });

  // 窗口关闭事件
  mainWindow.on('closed', function () {
    // 清空主窗口引用
    mainWindow = null;
  });

  // 进入全屏事件
  mainWindow.on('enter-full-screen', () => {
    // 发送全屏状态到渲染进程
    mainWindow.webContents.send('fullscreen-changed', true);
  });

  // 离开全屏事件
  mainWindow.on('leave-full-screen', () => {
    // 发送全屏状态到渲染进程
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  // 窗口最大化事件
  mainWindow.on('maximize', () => {
    // 发送最大化状态到渲染进程
    mainWindow.webContents.send('window-maximized', true);
  });

  // 窗口取消最大化事件
  mainWindow.on('unmaximize', () => {
    // 发送最大化状态到渲染进程
    mainWindow.webContents.send('window-maximized', false);
  });

  // 窗口大小改变事件
  mainWindow.on('resize', () => {
    // 获取内容边界
    const contentBounds = mainWindow.getContentBounds();
    // 更新所有视图的位置和大小
    for (const view of views.values()) {
      view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
    }
  });

  // 监听更新视图位置的事件
  ipcMain.on('update-view-position', (event, offset) => {
    // 更新偏移量
    viewOffset = offset;
    // 获取内容边界
    const contentBounds = mainWindow.getContentBounds();
    // 更新所有视图的位置和大小
    for (const view of views.values()) {
        view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
    }
  });

  // mainWindow.webContents.openDevTools(); // 注释掉的开发工具打开
}

// 窗口控制（针对Windows/Linux）
// 监听最小化窗口事件
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    // 最小化窗口
    mainWindow.minimize();
  }
});

// 监听最大化窗口事件
ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      // 如果已最大化，则还原
      mainWindow.unmaximize();
    } else {
      // 否则最大化
      mainWindow.maximize();
    }
  }
});

// 监听关闭窗口事件
ipcMain.on('close-window', () => {
  if (mainWindow) {
    // 关闭窗口
    mainWindow.close();
  }
});

// 监听在浏览器中打开事件
ipcMain.on('open-in-browser', (event, url) => {
    // 使用shell打开外部链接
    shell.openExternal(url);
});

// 应用就绪事件
app.on('ready', () => {
  // 设置应用名称
  app.setName(config.appName);
  // 禁用WebRTC
  app.commandLine.appendSwitch('disable-webrtc');
  // 创建窗口
  createWindow();
  // 禁用自动下载更新
  autoUpdater.autoDownload = false;
  // 强制开发更新配置
  autoUpdater.forceDevUpdateConfig = true;
  // 初始检查更新
  autoUpdater.checkForUpdates().catch(err => console.error('Initial update check failed:', err));

// 每3分钟检查一次更新
setInterval(() => {
  // 周期性检查更新
  autoUpdater.checkForUpdates().catch(err => console.error('Periodic update check failed:', err));
}, 180000);

// 添加更新事件监听器以记录日志
// 检查更新中事件
autoUpdater.on('checking-for-update', () => {
  // 记录日志
  console.log('Checking for update...');
});
// 添加下载处理
// 处理下载更新文件的事件
ipcMain.handle('download-update-file', async (event, downloadUrl) => {
  // 判断平台
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  let defaultPath;
  let extension;
  if (isMac) {
    // macOS默认路径和扩展名
    defaultPath = path.join(app.getPath('downloads'), path.basename(downloadUrl));
    extension = 'dmg';
  } else if (isWin) {
    // Windows默认路径和扩展名
    defaultPath = path.join(app.getPath('desktop'), path.basename(downloadUrl));
    extension = 'exe';
  } else {
    // 其他平台默认路径和扩展名
    defaultPath = path.join(app.getPath('downloads'), path.basename(downloadUrl));
    extension = 'zip';
  }
  // 显示保存对话框
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'Installer', extensions: [extension] }]
  });
  if (canceled || !filePath) return { success: false };

  // 返回下载承诺
  return new Promise((resolve) => {
    // 创建网络请求
    const request = net.request(downloadUrl);
    request.on('response', (response) => {
      if (response.statusCode === 200) {
        // 创建文件写入流
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


// 更新不可用事件
autoUpdater.on('update-not-available', (info) => {
  // 记录日志
  console.log('Update not available:', info);
  // 发送到渲染进程
  mainWindow.webContents.send('update-not-available', info);
});
// 更新错误事件
autoUpdater.on('error', (err) => {
  // 记录错误
  console.error('Update error:', err);
});
// 下载进度事件
autoUpdater.on('download-progress', (progressObj) => {
  // 记录进度
  console.log('Download progress:', progressObj);
});
// 更新下载完成事件
autoUpdater.on('update-downloaded', (info) => {
  // 记录日志
  console.log('Update downloaded:', info);
  // 发送到渲染进程
  mainWindow.webContents.send('update-downloaded', autoUpdater.downloadedUpdateHelper.cacheDir);
});

// 处理手动更新检查
// 监听手动检查更新事件
ipcMain.on('check-for-manual-update', () => {
  // 检查更新
  autoUpdater.checkForUpdates().catch(err => console.error('Manual update check failed:', err));
});

// 处理手动下载更新
// 监听手动下载更新事件
ipcMain.on('manual-download-update', () => {
  // 下载更新
  autoUpdater.downloadUpdate();
});

// 发送更新可用事件到渲染进程
// 更新可用事件
autoUpdater.on('update-available', (info) => {
  try {
    // 记录日志
    console.log('Update available:', info);
    const platform = process.platform;
    let extensions;
    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';
    let file;
    if (isMac) {
      // 查找macOS更新文件
      file = info.files.find(f => f.url.endsWith('.dmg')) || info.files.find(f => f.url.endsWith('.zip'));
    } else if (isWin) {
      extensions = ['.exe', '.msi'];
      // 查找Windows更新文件
      file = info.files.find(f => extensions.some(ext => f.url.endsWith(ext)));
    } else {
      // 警告不支持的平台
      console.warn('Unsupported platform for update:', process.platform);
      // 发送不可用
      mainWindow.webContents.send('update-not-available', info);
      return;
    }
    if (file) {
      // 构建GitHub仓库URL
      const githubRepoUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
      // 构建下载URL
      const downloadUrl = `${githubRepoUrl}/releases/download/v${info.version}/${file.url}`;
      // 发送到渲染进程
      mainWindow.webContents.send('update-available', { downloadUrl });
    } else {
      // 发送不可用
      mainWindow.webContents.send('update-not-available', info);
    }
  } catch (err) {
    // 记录错误
    console.error('Error in update-available handler:', err);
  }
});

// 修改响应头以允许跨域
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  if (details.url.startsWith(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`)) {
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

// 所有窗口关闭事件
app.on('window-all-closed', function () {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  if (!isMac) {
    if (isWin) {
      // Windows下显式退出
      app.quit();
    } else {
      // 警告不支持的平台
      console.warn('Unsupported platform for window-all-closed:', process.platform);
      // 默认退出
      app.quit();
    }
  } // 对于macOS，不做任何事以保持应用运行
});

// 激活事件
app.on('activate', function () {
  if (mainWindow === null) {
    // 创建窗口
    createWindow();
    // 检查更新
    autoUpdater.checkForUpdates().catch(err => console.error('Activate update check failed:', err));
  }
});

// BrowserView管理

// 监听创建标签事件
ipcMain.on('create-tab', (event, { url, tabId }) => {
  
  // 创建BrowserView实例
  const view = new BrowserView({
    webPreferences: {
      // 预加载脚本
      preload: path.join(__dirname, 'view-preload.js'),
      // 启用上下文隔离以确保预加载脚本正确工作并访问加载页面的window对象
      contextIsolation: true,
    }
  });
  // 设置背景色
  view.setBackgroundColor('#FFFFFF');
  // 存储视图
  views.set(tabId, view);
  // 添加到主窗口
  mainWindow.addBrowserView(view);
  
  // 获取内容边界
  const contentBounds = mainWindow.getContentBounds();
  // 设置视图边界
  view.setBounds({ x: 0, y: viewOffset, width: contentBounds.width, height: contentBounds.height - viewOffset });
  // 设置自动调整大小
  view.setAutoResize({ width: true, height: true });
  // 加载URL
  view.webContents.loadURL(url || config.homeUrl);

  // 中继导航事件到渲染进程以更新URL栏
  // 更新导航状态函数
  const updateNavigationState = () => {
    if (!mainWindow) return;
    // 检查是否能后退
    const canGoBack = view.webContents.canGoBack();
    // 检查是否能前进
    const canGoForward = view.webContents.canGoForward();
    
    // 发送更新到主窗口
    mainWindow.webContents.send('update-navigation-state', { tabId, canGoBack, canGoForward });
  };

  // 导航完成事件
  view.webContents.on('did-navigate', (event, url) => {
    if (!mainWindow) return;
    // 发送URL更新
    mainWindow.webContents.send('update-url', { tabId, url });
    // 更新导航状态
    updateNavigationState();
  });

  // 页面内导航事件
  view.webContents.on('did-navigate-in-page', (event, url) => {
    if (!mainWindow) return;
    // 发送URL更新
    mainWindow.webContents.send('update-url', { tabId, url });
    // 更新导航状态
    updateNavigationState();
  });

  // 中继页面标题更新到渲染进程
  // 页面标题更新事件
  view.webContents.on('page-title-updated', (event, title) => {
    if (!mainWindow) return;
    // 发送标题更新
    mainWindow.webContents.send('update-title', { tabId, title });
    // 更新导航状态
    updateNavigationState();
  });

  // 页面图标更新事件
  view.webContents.on('page-favicon-updated', (event, favicons) => {
    if (!mainWindow) return;
    if (favicons && favicons.length > 0) {
      // 发送图标更新
      mainWindow.webContents.send('update-favicon', { tabId, favicon: favicons[0] });
    }
  });

  // 设置窗口打开处理程序
  view.webContents.setWindowOpenHandler(({ url }) => {
    // 发送创建新标签事件
    event.sender.send('create-new-tab-from-view', url);
    // 拒绝默认行为
    return { action: 'deny' };
  });
});

// 监听切换标签事件
ipcMain.on('switch-tab', (event, activeTabId) => {
  if (!mainWindow) return;
  // 获取视图
  const view = views.get(activeTabId);
  if (view) {
    // 设置背景色
    view.setBackgroundColor('#FFFFFF');
    // 设置为顶部视图
    mainWindow.setTopBrowserView(view);
    // 获取当前URL
    const url = view.webContents.getURL();
    // 发送URL更新
    mainWindow.webContents.send('update-url', { tabId: activeTabId, url });
    // 检查后退
    const canGoBack = view.webContents.canGoBack();
    // 检查前进
    const canGoForward = view.webContents.canGoForward();
    // 发送导航状态
    mainWindow.webContents.send('update-navigation-state', { tabId: activeTabId, canGoBack, canGoForward });
  }
});

// 监听关闭标签事件
ipcMain.on('close-tab', (event, tabId) => {
  // 获取视图
  const view = views.get(tabId);
  if (view) {
    if (mainWindow) {
      // 从主窗口移除视图
      mainWindow.removeBrowserView(view);
    }
    // 销毁web内容
    view.webContents.destroy();
    // 删除从Map中
    views.delete(tabId);
  }
});

// 监听导航事件
ipcMain.on('navigate', (event, { tabId, action }) => {
  
  // 获取视图
  const view = views.get(tabId);
  if (view) {
    switch (action) {
      case 'back':
        // 如果能后退，则后退
        if (view.webContents.canGoBack()) view.webContents.goBack();
        break;
      case 'forward':
        // 如果能前进，则前进
        if (view.webContents.canGoForward()) view.webContents.goForward();
        break;
      case 'reload':
        // 重新加载
        view.webContents.reload();
        break;
      case 'home':
        // 加载主页URL
        view.webContents.loadURL(config.homeUrl);
        break;
    }
  }
});

// 监听打开开发工具事件
ipcMain.on('open-dev-tools', (event, tabId) => {
    // 获取视图
    const view = views.get(tabId);
    if (view) {
        // 打开开发工具
        view.webContents.openDevTools();
    }
});


// 此监听器处理由History API触发的导航事件
// （例如pushState, replaceState）从BrowserView的预加载脚本中。
// 监听手动导航事件
ipcMain.on('manual-navigation', (event, url) => {
    // 获取发送者web内容
    const webContents = event.sender;
    let foundTabId = null;
    // 查找与发送事件的BrowserView关联的tabId
    for (const [tabId, browserView] of views.entries()) {
        if (browserView.webContents.id === webContents.id) {
            foundTabId = tabId;
            break;
        }
    }

    if (foundTabId) {
        // 更新主窗口渲染器的URL栏
        mainWindow.webContents.send('update-url', { tabId: foundTabId, url });
        // 更新导航状态（后退/前进按钮）
        const canGoBack = webContents.canGoBack();
        const canGoForward = webContents.canGoForward();
        mainWindow.webContents.send('update-navigation-state', { tabId: foundTabId, canGoBack, canGoForward });
    }
});

// 证书错误事件
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (error === 'net::ERR_CERT_COMMON_NAME_INVALID') {
    // 防止默认行为并允许
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});