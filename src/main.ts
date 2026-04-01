import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'

app.commandLine.appendSwitch('no-sandbox')
const CONFIG_FILE_NAME = 'configs.json'

let mainWindow
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

ipcMain.handle('load-configs', async () => {
  try {
    const configPath = getConfigFilePath()
    const content = await fsPromises.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    return []
  }
})

ipcMain.handle('save-configs', async (event, configs) => {
  try {
    const configPath = getConfigFilePath()
    const content = JSON.stringify(Array.isArray(configs) ? configs : [], null, 2)
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true })
    await fsPromises.writeFile(configPath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

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

function headersObjectFromFetchHeaders(fetchHeaders) {
  const out = {}
  try {
    fetchHeaders.forEach((value, key) => {
      out[key] = value
    })
  } catch (_) {}
  return out
}

/** 渲染进程发起 GET/POST 等请求；不做业务解析 */
ipcMain.handle('fetch-http', async (event, request) => {
  let timer
  const url = String(request?.url || '').trim()
  const rawHeaders = request?.headers
  const headers = rawHeaders && typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)
    ? { ...rawHeaders }
    : { 'Content-Type': 'application/json' }
  const method = String(request?.method || 'GET').toUpperCase()
  const timeoutMs = Number.isFinite(request?.timeoutMs) ? Number(request.timeoutMs) : 30000
  const rawBody = request?.body
  const bodyString = rawBody != null && method !== 'GET' && method !== 'HEAD'
    ? (typeof rawBody === 'string' ? rawBody : String(rawBody))
    : null

  try {
    if (!url) {
      return { ok: false, error: 'URL 为空' }
    }

    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), timeoutMs)
    const requestInit = {
      method,
      headers,
      signal: controller.signal
    }
    if (bodyString != null) {
      requestInit.body = bodyString
    }

    const response = await fetch(url, requestInit)
    clearTimeout(timer)
    timer = undefined
    const body = await response.text()

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      headers: headersObjectFromFetchHeaders(response.headers),
      body
    }
  } catch (error) {
    if (timer) clearTimeout(timer)
    return {
      ok: false,
      error: error?.message || String(error)
    }
  }
})

ipcMain.handle('open-external', async (event, target) => {
  try {
    const value = String(target || '').trim()
    if (!value) return false
    await shell.openExternal(value)
    return true
  } catch (error) {
    return false
  }
})

ipcMain.handle('run-command-in-terminal', async (event, command) => {
  try {
    const script = String(command || '').trim()
    if (!script) {
      return { success: false, message: '命令为空' }
    }

    const scriptPath = path.join(os.tmpdir(), `llm-model-manager-export-${crypto.randomUUID()}.command`)
    const content = ['#!/bin/bash', 'set -e', script, '', 'echo', 'echo "按回车关闭窗口..."', 'read -r _'].join('\n')
    await fsPromises.writeFile(scriptPath, content, { mode: 0o755 })

    await new Promise((resolve, reject) => {
      execFile('open', ['-a', 'Terminal', scriptPath], (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('open-html-with-script', async (event, script) => {
  try {
    const javascriptCode = String(script || '').trim()
    if (!javascriptCode) {
      return { success: false, message: 'JavaScript 代码为空' }
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScript 执行页面</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-top: 0;
    }
    .info {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .status {
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 500;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>JavaScript 执行页面</h1>
    <p class="info">此页面由 LLM Model Manager 生成，用于执行传入的 JavaScript 代码。</p>
    <div id="status"></div>
  </div>

  <script>
    try {
      ${javascriptCode}
      document.getElementById('status').innerHTML = '<div class="status success">JavaScript 执行完成。</div>';
    } catch (error) {
      document.getElementById('status').innerHTML = '<div class="status error">错误: ' + escapeHtml(error.message) + '</div>';
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`

    const htmlPath = path.join(os.tmpdir(), `llm-model-manager-script-${crypto.randomUUID()}.html`)
    await fsPromises.writeFile(htmlPath, htmlContent, 'utf-8')

    await shell.openExternal(`file://${htmlPath}`)

    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})
