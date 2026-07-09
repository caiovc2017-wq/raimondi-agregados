const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  // Auto-update
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data)),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkUpdate: () => ipcRenderer.send('check-update'),
  removeUpdateListener: () => ipcRenderer.removeAllListeners('update-status')
})
