class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.homeUrl = 'https://transall.toolsai.com.cn';

        this.tabBar = document.getElementById('tab-bar');
        this.backButton = document.getElementById('back-button');
        this.forwardButton = document.getElementById('forward-button');
        this.refreshButton = document.getElementById('refresh-button');
        this.homeButton = document.getElementById('home-button');
        this.urlBar = document.getElementById('url-bar');
        this.copyUrlButton = document.getElementById('copy-url-button');
        this.openInBrowserButton = document.getElementById('open-in-browser-button');
        this.updateButton = document.getElementById('update-button');

        this.init();
    }

    init() {
        // Manual update handling
        this.updateButton.style.display = 'none';
        this.updateAvailable = false;

        this.updateButton.addEventListener('click', () => {
            if (this.updateAvailable) {
                window.electronAPI.manualDownloadUpdate();
            } else {
                window.electronAPI.checkForManualUpdate();
            }
        });

        window.electronAPI.onUpdateAvailable((info) => {
            this.updateAvailable = true;
            this.updateButton.style.display = 'flex';
            this.updateButton.style.backgroundColor = '#4CAF50'; // Change color to indicate update available
            alert('Update available! Click the update button to download.');
        });

        window.electronAPI.onUpdateNotAvailable((info) => {
            this.updateAvailable = false;
            this.updateButton.style.display = 'none';
        });

        window.electronAPI.onUpdateDownloaded((path) => {
            alert(`Update downloaded to: ${path}. Please install manually.`);
            console.log('Downloaded to:', path);
            // After download, perhaps reset to not available, but since manual install, keep as is or hide
            // For now, hide button after download
            this.updateAvailable = false;
            this.updateButton.style.display = 'none';
        });

        // Windows controls
        const windowsControls = document.getElementById('windows-controls');
        const minimizeButton = document.getElementById('minimize-button');
        const maximizeButton = document.getElementById('maximize-button');
        const closeButton = document.getElementById('close-button');

        minimizeButton.addEventListener('click', () => window.electronAPI.minimizeWindow());
        maximizeButton.addEventListener('click', () => window.electronAPI.maximizeWindow());
        closeButton.addEventListener('click', () => window.electronAPI.closeWindow());

        window.electronAPI.onPlatform(platform => {
            if (platform !== 'darwin') {
                windowsControls.classList.remove('hidden');
                document.body.classList.add(platform);
            } else {
                document.body.classList.add('darwin');
            }
        });

        window.electronAPI.onWindowMaximized(isMaximized => {
            // You can add styles for maximized state if needed, e.g., changing the maximize icon
        });

        this.backButton.addEventListener('click', () => this.navigate('back'));
        this.forwardButton.addEventListener('click', () => this.navigate('forward'));
        this.refreshButton.addEventListener('click', () => this.navigate('reload'));
        this.homeButton.addEventListener('click', () => this.navigate('home'));

        this.copyUrlButton.addEventListener('click', () => {
            navigator.clipboard.writeText(this.urlBar.value).then(() => {
                const originalIcon = this.copyUrlButton.querySelector('img').src;
                this.copyUrlButton.querySelector('img').src = 'check-icon.svg';
                this.copyUrlButton.disabled = true;

                setTimeout(() => {
                    this.copyUrlButton.querySelector('img').src = originalIcon;
                    this.copyUrlButton.disabled = false;
                }, 1500);
            });
        });

        this.openInBrowserButton.addEventListener('click', () => {
            window.electronAPI.openInBrowser(this.urlBar.value);
        });

        this.urlBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigateTo(this.urlBar.value);
            }
        });

        // Listen for new tab requests from the main process (e.g., from window.open)
        window.electronAPI.onCreateNewTabFromView((url) => {
            this.createTab(url);
        });

        window.electronAPI.onUpdateUrl(({ tabId, url }) => {
            if (tabId === this.activeTabId) {
                this.urlBar.value = url;
            }
        });

        window.electronAPI.onUpdateTitle(({ tabId, title }) => {
            this.updateTabTitle(tabId, title);
        });

        window.electronAPI.onUpdateFavicon(({ tabId, favicon }) => {
            this.updateTabFavicon(tabId, favicon);
        });

        window.electronAPI.onUpdateNavigationState(({ tabId, canGoBack, canGoForward }) => {
            if (tabId === this.activeTabId) {
                this.backButton.disabled = !canGoBack;
                this.forwardButton.disabled = !canGoForward;
            }
        });

        window.electronAPI.onFullscreenChanged((isFullscreen) => {
            if (isFullscreen) {
                document.body.classList.add('fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
            }
        });

        this.createTab(this.homeUrl);
        this.updateTabBarVisibility();
    }



    createTab(url = this.homeUrl) {
        const tabId = `tab-${this.tabCounter++}`;
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = tabId;

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';

        const loadingIcon = document.createElement('img');
        loadingIcon.src = 'loading-icon.svg';
        loadingIcon.classList.add('loading-icon');
        tabContent.appendChild(loadingIcon);

        const faviconPlaceholder = document.createElement('div');
        faviconPlaceholder.className = 'favicon-placeholder';
        faviconPlaceholder.style.display = 'none'; // Hide initially
        tabContent.appendChild(faviconPlaceholder);

        const faviconElement = document.createElement('img');
        faviconElement.className = 'tab-favicon';
        faviconElement.style.display = 'none'; // Hide initially
        tabContent.appendChild(faviconElement);

        const titleElement = document.createElement('span');
        titleElement.className = 'tab-title';
        tabContent.appendChild(titleElement);

        tabElement.appendChild(tabContent);

        const closeButton = document.createElement('button');
        closeButton.className = 'close-tab';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });

        tabElement.appendChild(closeButton);
        this.tabBar.appendChild(tabElement);

        const tab = { id: tabId, element: tabElement, title: titleElement, favicon: faviconElement, faviconPlaceholder, loadingIcon };
        this.tabs.set(tabId, tab);

        window.electronAPI.createTab({ url, tabId });

        tabElement.addEventListener('click', () => this.switchToTab(tabId));
        this.switchToTab(tabId);
        this.updateTabStyles();
        this.updateViewPosition();
        this.updateTabBarVisibility();
    }

    closeTab(tabId) {
        const tabToClose = this.tabs.get(tabId);
        if (!tabToClose) return;

        this.tabBar.removeChild(tabToClose.element);
        this.tabs.delete(tabId);
        window.electronAPI.closeTab(tabId);

        if (this.activeTabId === tabId) {
            if (this.tabs.size > 0) {
                const firstTabId = this.tabs.keys().next().value;
                this.switchToTab(firstTabId);
            } else {
                this.activeTabId = null;
                this.urlBar.value = '';
            }
        }

        if (this.tabs.size === 0) {
            this.createTab();
        }
        this.updateTabStyles();
        this.updateTabBarVisibility();
    }

    switchToTab(tabId) {
        if (this.activeTabId === tabId) return;

        this.activeTabId = tabId;
        this.tabs.forEach((tab, id) => {
            tab.element.classList.toggle('active', id === tabId);
        });
        window.electronAPI.switchTab(tabId);
        this.updateTabStyles();
        // The URL will be updated by the 'update-url' event handler.
    }

    navigate(action) {
        if (this.activeTabId) {
            window.electronAPI.navigate({ tabId: this.activeTabId, action });
        }
    }

    navigateTo(url) {
        if (this.activeTabId) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            window.electronAPI.navigate({ tabId: this.activeTabId, action: url });
        }
    }

    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title.textContent = title;
            tab.loadingIcon.style.display = 'none';

            // Show placeholder icon if title is available and favicon not loaded
            if (title && tab.favicon.style.display === 'none') {
                tab.faviconPlaceholder.textContent = title.charAt(0).toUpperCase();
                tab.faviconPlaceholder.style.display = 'flex';
            }
        }
    }

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
                // If favicon fails to load, keep showing the placeholder
                tab.loadingIcon.style.display = 'none';
                tab.favicon.style.display = 'none';
                if (tab.title.textContent) {
                    tab.faviconPlaceholder.textContent = tab.title.textContent.charAt(0).toUpperCase();
                    tab.faviconPlaceholder.style.display = 'flex';
                }
            };
        } else if (tab) {
            // No favicon URL, ensure placeholder is shown
            tab.loadingIcon.style.display = 'none';
            tab.favicon.style.display = 'none';
            if (tab.title.textContent) { // Only show placeholder if there is a title
                tab.faviconPlaceholder.textContent = tab.title.textContent.charAt(0).toUpperCase();
                tab.faviconPlaceholder.style.display = 'flex';
            }
        }
    }

    updateTabBarVisibility() {
        if (this.tabs.size <= 1) {
            this.tabBar.style.display = 'none';
        } else {
            this.tabBar.style.display = 'flex';
        }
        this.updateViewPosition();
    }

    updateViewPosition() {
        const toolbarHeight = document.getElementById('toolbar').offsetHeight;
        const tabBarHeight = document.getElementById('tab-bar').offsetHeight;
        window.electronAPI.updateViewPosition(toolbarHeight + tabBarHeight);
    }

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

const tabManager = new TabManager();