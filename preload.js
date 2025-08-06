const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    createTab: ({ url, tabId }) => ipcRenderer.send('create-tab', { url, tabId }),
    switchTab: (tabId) => ipcRenderer.send('switch-tab', tabId),
    closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),
    navigate: ({ tabId, action }) => ipcRenderer.send('navigate', { tabId, action }),
    openDevTools: (tabId) => ipcRenderer.send('open-dev-tools', tabId),
    onUpdateNavigationState: (callback) => ipcRenderer.on('update-navigation-state', (_event, value) => callback(value)),
    onUpdateTitle: (callback) => ipcRenderer.on('update-title', (_event, value) => callback(value)),
    onCreateNewTabFromView: (callback) => ipcRenderer.on('create-new-tab-from-view', (_event, value) => callback(value)),
    onUpdateUrl: (callback) => ipcRenderer.on('update-url', (_event, value) => callback(value)),
    updateViewPosition: (offset) => ipcRenderer.send('update-view-position', offset),
    onUpdateFavicon: (callback) => ipcRenderer.on('update-favicon', (_event, value) => callback(value)),
    onConfig: (callback) => ipcRenderer.on('config', (_event, value) => callback(value)),

    onFullscreenChanged: (callback) => ipcRenderer.on('fullscreen-changed', (_event, value) => callback(value)),

    // Window controls
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    onPlatform: (callback) => ipcRenderer.on('platform', (_event, value) => callback(value)),
    onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', (_event, value) => callback(value)),
    openInBrowser: (url) => ipcRenderer.send('open-in-browser', url),
    checkForManualUpdate: () => ipcRenderer.send('check-for-manual-update'),
    manualDownloadUpdate: () => ipcRenderer.send('manual-download-update'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, path) => callback(path)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
    downloadUpdateFile: (downloadUrl) => ipcRenderer.invoke('download-update-file', downloadUrl),
});