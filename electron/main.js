const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

Menu.setApplicationMenu(null)

// Configura updater sem logger externo
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: true,
    backgroundColor: '#0D3D7A'
  })

  mainWindow.maximize()

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(true)
    setTimeout(() => {
      mainWindow.setAlwaysOnTop(false)
      // Verifica atualização 3s após carregar
      if (!isDev) {
        autoUpdater.checkForUpdates().catch(err => {
          console.log('Erro ao verificar atualização:', err.message)
        })
      }
    }, 3000)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ── AUTO-UPDATER EVENTS ─────────────────────────────────────────

autoUpdater.on('update-available', (info) => {
  sendToWindow('update-status', { status: 'available', version: info.version })
})

autoUpdater.on('update-not-available', () => {
  sendToWindow('update-status', { status: 'not-available' })
})

autoUpdater.on('download-progress', (progress) => {
  sendToWindow('update-status', {
    status: 'downloading',
    percent: Math.round(progress.percent),
    speed: formatBytes(progress.bytesPerSecond)
  })
})

autoUpdater.on('update-downloaded', (info) => {
  sendToWindow('update-status', { status: 'downloaded', version: info.version })
})

autoUpdater.on('error', (err) => {
  console.log('Erro no updater:', err.message)
  sendToWindow('update-status', { status: 'error', message: err.message })
})

// IPC: instalar agora
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

// IPC: verificar manualmente
ipcMain.on('check-update', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Erro ao verificar:', err.message)
    })
  }
})

// ── HELPERS ─────────────────────────────────────────────────────

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B/s'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB/s'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s'
}

// ── APP LIFECYCLE ────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
