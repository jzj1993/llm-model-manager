const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

app.commandLine.appendSwitch('no-sandbox')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(createWindow)

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

ipcMain.handle('check-model', async (event, config) => {
  const { url, endpoint, modelName, apiKey, apiType } = config

  try {
    const fullUrl = `${url}${endpoint}`

    const headers = {
      'Content-Type': 'application/json'
    }

    let requestBody

    if (apiType === 'anthropic') {
      if (apiKey) {
        headers['x-api-key'] = apiKey
      }

      requestBody = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      }
    } else {
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      requestBody = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10
      }
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        message: '模型可用',
        details: data
      }
    } else {
      return {
        success: false,
        message: `模型不可用: ${data.error?.message || response.statusText}`,
        details: data
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `请求失败: ${error.message}`,
      details: null
    }
  }
})
