import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import type { ProviderConfig } from './shared/types'
import { registerIpcHandlers } from './main/ipc-handlers'

app.commandLine.appendSwitch('no-sandbox')
const CONFIG_FILE_NAME = 'configs.json'

let mainWindow: BrowserWindow | null = null
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

function createWindow() {
  const devIconPath = path.join(__dirname, '..', 'build', 'icon.png')
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    ...(fs.existsSync(devIconPath) ? { icon: devIconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'))
  }
}

function getConfigFilePath() {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME)
}

async function loadConfigs(): Promise<ProviderConfig[]> {
  try {
    const configPath = getConfigFilePath()
    const content = await fsPromises.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return []
    return []
  }
}

async function saveConfigs(configs: ProviderConfig[]) {
  try {
    const configPath = getConfigFilePath()
    const content = JSON.stringify(Array.isArray(configs) ? configs : [], null, 2)
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true })
    await fsPromises.writeFile(configPath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}

registerIpcHandlers({ loadConfigs, saveConfigs })

app.whenReady().then(createWindow)

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
