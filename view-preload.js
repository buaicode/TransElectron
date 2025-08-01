const { ipcRenderer } = require('electron');

// Immediately override pushState and replaceState to ensure they are captured
const originalPushState = window.history.pushState;
window.history.pushState = function(...args) {
  originalPushState.apply(this, args);
  ipcRenderer.send('manual-navigation', window.location.href);
};

const originalReplaceState = window.history.replaceState;
window.history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  ipcRenderer.send('manual-navigation', window.location.href);
};

window.addEventListener('popstate', () => {
  ipcRenderer.send('manual-navigation', window.location.href);
});