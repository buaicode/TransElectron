// TabManager类：管理浏览器标签页的创建、切换、关闭和导航
class TabManager {
    // 构造函数：初始化标签页管理器
    constructor() {
        // tabs: Map存储所有标签页信息
        this.tabs = new Map();
        // activeTabId: 当前激活的标签页ID
        this.activeTabId = null;
        // tabCounter: 标签页计数器，用于生成唯一ID
        this.tabCounter = 0;

        // tabBar: 标签栏DOM元素
        this.tabBar = document.getElementById('tab-bar');
        // backButton: 后退按钮
        this.backButton = document.getElementById('back-button');
        // forwardButton: 前进按钮
        this.forwardButton = document.getElementById('forward-button');
        // refreshButton: 刷新按钮
        this.refreshButton = document.getElementById('refresh-button');
        // homeButton: 主页按钮
        this.homeButton = document.getElementById('home-button');
        // refreshButtonWin: Windows平台的刷新按钮
        this.refreshButtonWin = document.getElementById('refresh-button-win');
        // homeButtonWin: Windows平台的主页按钮
        this.homeButtonWin = document.getElementById('home-button-win');
        // urlBar: URL输入栏
        this.urlBar = document.getElementById('url-bar');
        // copyUrlButton: 复制URL按钮
        this.copyUrlButton = document.getElementById('copy-url-button');
        // openInBrowserButton: 在浏览器中打开按钮
        this.openInBrowserButton = document.getElementById('open-in-browser-button');
        // updateButton: 更新按钮
        this.updateButton = document.getElementById('update-button');

        // 调用初始化方法
        this.init();
    }

    // 初始化方法：设置事件监听器和初始配置
    init() {
        // 监听配置事件，设置主页URL和文档标题，并创建初始标签页
        window.electronAPI.onConfig((config) => {
            this.homeUrl = config.homeUrl;
            document.title = config.title;
            this.createTab(this.homeUrl);
        });

        // 手动更新处理
        // 初始隐藏更新按钮
        this.updateButton.style.display = 'none';
        // 变量存储更新下载URL
        let updateDownloadUrl = null;

        // 更新按钮点击事件：下载更新或检查更新
        this.updateButton.addEventListener('click', async () => {
          if (updateDownloadUrl) {
            const result = await window.electronAPI.downloadUpdateFile(updateDownloadUrl);
            if (result.success) {
              console.log(`Update downloaded to: ${result.filePath}`);
            } else {
              console.error('Download failed:', result.error);
            }
          } else {
            window.electronAPI.checkForManualUpdate();
          }
        });

        // 监听更新可用事件，显示更新按钮并设置下载URL
        window.electronAPI.onUpdateAvailable((data) => {
          updateDownloadUrl = data.downloadUrl;
          this.updateButton.style.display = 'flex';
          
        });

        // 监听更新不可用事件，隐藏更新按钮
        window.electronAPI.onUpdateNotAvailable((info) => {
          updateDownloadUrl = null;
          this.updateButton.style.display = 'none';
        });

        // 监听更新下载完成事件，记录路径
        window.electronAPI.onUpdateDownloaded((path) => {
            console.log('Downloaded to:', path);
        });

        // Windows控件
        // 获取Windows控件容器
        const windowsControls = document.getElementById('windows-controls');
        // 最小化按钮
        const minimizeButton = document.getElementById('minimize-button');
        // 最大化按钮
        const maximizeButton = document.getElementById('maximize-button');
        // 关闭按钮
        const closeButton = document.getElementById('close-button');
        // Windows工具栏组
        const winToolbarGroup = document.getElementById('win-toolbar-group');
        // macOS工具栏组
        const macToolbarGroup = document.getElementById('mac-toolbar-group');

        // 最小化按钮点击事件
        minimizeButton.addEventListener('click', () => window.electronAPI.minimizeWindow());
        // 最大化按钮点击事件
        maximizeButton.addEventListener('click', () => window.electronAPI.maximizeWindow());
        // 关闭按钮点击事件
        closeButton.addEventListener('click', () => window.electronAPI.closeWindow());

        // 监听平台事件，调整UI以适应不同操作系统
        window.electronAPI.onPlatform(platform => {
            const isMac = platform === 'darwin';
            const isWin = platform === 'win32';
            if (isMac) {
                macToolbarGroup.classList.remove('hidden');
                document.body.classList.add('darwin');
            } else if (isWin) {
                windowsControls.classList.remove('hidden');
                winToolbarGroup.classList.remove('hidden');
                document.body.classList.add('win32');
            } else {
                console.warn('Unsupported platform:', platform);
                document.body.classList.add(platform);
            }
        });

        // 监听窗口最大化状态变化，更新最大化按钮图标
        window.electronAPI.onWindowMaximized(isMaximized => {
            const maximizeImg = document.querySelector('#maximize-button img');
            if (isMaximized) {
                maximizeImg.src = 'assets/icons/restore.svg';
                maximizeImg.alt = 'Restore';
            } else {
                maximizeImg.src = 'assets/icons/maximize.svg';
                maximizeImg.alt = 'Maximize';
            }
        });

        // 后退按钮点击事件
        this.backButton.addEventListener('click', () => this.navigate('back'));
        // 前进按钮点击事件
        this.forwardButton.addEventListener('click', () => this.navigate('forward'));
        // 刷新按钮点击事件
        this.refreshButton.addEventListener('click', () => this.navigate('reload'));
        // 主页按钮点击事件
        this.homeButton.addEventListener('click', () => this.navigate('home'));
        // Windows刷新按钮点击事件
        this.refreshButtonWin.addEventListener('click', () => this.navigate('reload'));
        // Windows主页按钮点击事件
        this.homeButtonWin.addEventListener('click', () => this.navigate('home'));
        // 复制URL按钮点击事件：复制URL并临时更改图标
        this.copyUrlButton.addEventListener('click', () => {
            navigator.clipboard.writeText(this.urlBar.value).then(() => {
                const originalIcon = this.copyUrlButton.querySelector('img').src;
                this.copyUrlButton.querySelector('img').src = 'assets/icons/check-icon.svg';
                this.copyUrlButton.disabled = true;

                setTimeout(() => {
                    this.copyUrlButton.querySelector('img').src = originalIcon;
                    this.copyUrlButton.disabled = false;
                }, 1500);
            });
        });

        // 在浏览器中打开按钮点击事件
        this.openInBrowserButton.addEventListener('click', () => {
            window.electronAPI.openInBrowser(this.urlBar.value);
        });

        // URL栏键盘事件：Enter键导航到输入URL
        this.urlBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigateTo(this.urlBar.value);
            }
        });

        // 监听从主进程创建新标签的请求
        window.electronAPI.onCreateNewTabFromView((url) => {
            this.createTab(url);
        });

        // 监听URL更新事件，更新URL栏
        window.electronAPI.onUpdateUrl(({ tabId, url }) => {
            if (tabId === this.activeTabId) {
                this.urlBar.value = url;
            }
        });

        // 监听标题更新事件，更新标签标题
        window.electronAPI.onUpdateTitle(({ tabId, title }) => {
            this.updateTabTitle(tabId, title);
        });

        // 监听图标更新事件，更新标签图标
        window.electronAPI.onUpdateFavicon(({ tabId, favicon }) => {
            this.updateTabFavicon(tabId, favicon);
        });

        // 监听导航状态更新事件，启用/禁用后退前进按钮
        window.electronAPI.onUpdateNavigationState(({ tabId, canGoBack, canGoForward }) => {
            if (tabId === this.activeTabId) {
                this.backButton.disabled = !canGoBack;
                this.forwardButton.disabled = !canGoForward;
            }
        });

        // 监听全屏变化事件，调整body类
        window.electronAPI.onFullscreenChanged((isFullscreen) => {
            if (isFullscreen) {
                document.body.classList.add('fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
            }
        });

        // 更新标签栏可见性
        this.updateTabBarVisibility();
    }



    // 创建新标签页方法
    createTab(url = this.homeUrl) {
        // 生成唯一标签ID
        const tabId = `tab-${this.tabCounter++}`;
        // 创建标签DOM元素
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = tabId;

        // 创建标签内容容器
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';

        // 创建加载图标
        const loadingIcon = document.createElement('img');
        loadingIcon.src = 'assets/icons/loading-icon.svg';
        loadingIcon.classList.add('loading-icon');
        tabContent.appendChild(loadingIcon);

        // 创建图标占位符
        const faviconPlaceholder = document.createElement('div');
        faviconPlaceholder.className = 'favicon-placeholder';
        faviconPlaceholder.style.display = 'none'; // 初始隐藏
        tabContent.appendChild(faviconPlaceholder);

        // 创建图标元素
        const faviconElement = document.createElement('img');
        faviconElement.className = 'tab-favicon';
        faviconElement.style.display = 'none'; // 初始隐藏
        tabContent.appendChild(faviconElement);

        // 创建标题元素
        const titleElement = document.createElement('span');
        titleElement.className = 'tab-title';
        tabContent.appendChild(titleElement);

        tabElement.appendChild(tabContent);

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.className = 'close-tab';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });

        tabElement.appendChild(closeButton);
        this.tabBar.appendChild(tabElement);

        // 存储标签信息
        const tab = { id: tabId, element: tabElement, title: titleElement, favicon: faviconElement, faviconPlaceholder, loadingIcon };
        this.tabs.set(tabId, tab);

        // 调用主进程创建标签
        window.electronAPI.createTab({ url, tabId });

        // 添加点击事件切换标签
        tabElement.addEventListener('click', () => this.switchToTab(tabId));
        // 切换到新标签
        this.switchToTab(tabId);
        // 更新标签样式
        this.updateTabStyles();
        // 更新视图位置
        this.updateViewPosition();
        // 更新标签栏可见性
        this.updateTabBarVisibility();
    }

    // 关闭标签页方法
    closeTab(tabId) {
        const tabToClose = this.tabs.get(tabId);
        if (!tabToClose) return;

        // 移除DOM元素
        this.tabBar.removeChild(tabToClose.element);
        // 删除从Map中
        this.tabs.delete(tabId);
        // 调用主进程关闭标签
        window.electronAPI.closeTab(tabId);

        if (this.activeTabId === tabId) {
            if (this.tabs.size > 0) {
                // 切换到第一个标签
                const firstTabId = this.tabs.keys().next().value;
                this.switchToTab(firstTabId);
            } else {
                // 无标签时清空URL栏
                this.activeTabId = null;
                this.urlBar.value = '';
            }
        }

        if (this.tabs.size === 0) {
            // 如果无标签，创建新标签
            this.createTab();
        }
        // 更新标签样式
        this.updateTabStyles();
        // 更新标签栏可见性
        this.updateTabBarVisibility();
    }

    // 切换到指定标签方法
    switchToTab(tabId) {
        if (this.activeTabId === tabId) return;

        this.activeTabId = tabId;
        this.tabs.forEach((tab, id) => {
            tab.element.classList.toggle('active', id === tabId);
        });
        // 调用主进程切换标签
        window.electronAPI.switchTab(tabId);
        // 更新标签样式
        this.updateTabStyles();
    }

    // 导航方法：后退、前进、刷新、主页
    navigate(action) {
        if (this.activeTabId) {
            window.electronAPI.navigate({ tabId: this.activeTabId, action });
        }
    }

    // 导航到指定URL方法
    navigateTo(url) {
        if (this.activeTabId) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.electronAPI.navigate({ tabId: this.activeTabId, action: url });
        }
    }

    // 更新标签标题方法
    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title.textContent = title;
            tab.loadingIcon.style.display = 'none';

            // 如果有标题且无图标，显示占位符
            if (title && tab.favicon.style.display === 'none') {
                tab.faviconPlaceholder.textContent = title.charAt(0).toUpperCase();
                tab.faviconPlaceholder.style.display = 'flex';
            }
        }
    }

    // 更新标签图标方法
    updateTabFavicon(tabId, favicon) {
        const tab = this.tabs.get(tabId);
        if (tab && favicon) {
            tab.favicon.src = favicon;
            tab.favicon.onload = () => {
                tab.loadingIcon.style.display = 'none';
                tab.faviconPlaceholder.style.display = 'none';
                tab.favicon.style.display = 'inline';
            };
            tab.favicon.onerror = () => {
                tab.loadingIcon.style.display = 'none';
                tab.favicon.style.display = 'none';
                if (tab.title.textContent) {
                    tab.faviconPlaceholder.textContent = tab.title.textContent.charAt(0).toUpperCase();
                    tab.faviconPlaceholder.style.display = 'flex';
                }
            };
        } else if (tab) {
            tab.loadingIcon.style.display = 'none';
            tab.favicon.style.display = 'none';
            if (tab.title.textContent) { 
                tab.faviconPlaceholder.textContent = tab.title.textContent.charAt(0).toUpperCase();
                tab.faviconPlaceholder.style.display = 'flex';
            }
        }
    }

    // 更新标签栏可见性方法
    updateTabBarVisibility() {
        if (this.tabs.size <= 1) {
            this.tabBar.style.display = 'none';
        } else {
            this.tabBar.style.display = 'flex';
        }
        // 更新视图位置
        this.updateViewPosition();
    }

    // 更新视图位置方法
    updateViewPosition() {
        const toolbarHeight = document.getElementById('toolbar').offsetHeight;
        const tabBarHeight = document.getElementById('tab-bar').offsetHeight;
        window.electronAPI.updateViewPosition(toolbarHeight + tabBarHeight);
    }

    // 更新标签样式方法
    updateTabStyles() {
        const numTabs = this.tabs.size;
        if (numTabs <= 1) {
            this.tabBar.style.display = 'none';
        } else {
            this.tabBar.style.display = 'flex';
            const tabWidth = 100 / numTabs;
            this.tabs.forEach(tab => {
                tab.element.style.width = `${tabWidth}%`;
            });
        }
    }
}

// 创建TabManager实例
const tabManager = new TabManager();