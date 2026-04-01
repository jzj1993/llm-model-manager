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
    const payload = JSON.stringify(Array.isArray(configs) ? configs : [], null, 2)
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true })
    await fsPromises.writeFile(configPath, payload, 'utf-8')
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

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function inferReasoningMode(modelName) {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const reasoningKeywords = ['reasoner', 'reasoning', 'r1', 'o1', 'o3', 'o4', 'thinking']
  if (reasoningKeywords.some(key => text.includes(key))) return true
  return null
}

function inferInputTypes(modelName) {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const multimodalKeywords = ['vision', 'vl', 'omni', '4o', 'gemini', 'image']
  if (multimodalKeywords.some(key => text.includes(key))) {
    return ['text', 'image']
  }
  return ['text']
}

function extractCapabilityFromModelInfo(modelInfo) {
  if (!modelInfo || typeof modelInfo !== 'object') return null
  const contextWindow = modelInfo.context_window
    ?? modelInfo.contextWindow
    ?? modelInfo.input_token_limit
    ?? modelInfo.max_context_length
    ?? modelInfo.context_length
    ?? null
  const maxTokens = modelInfo.output_token_limit
    ?? modelInfo.max_output_tokens
    ?? modelInfo.max_completion_tokens
    ?? modelInfo.max_tokens
    ?? null

  const normalizedContextWindow = Number.isFinite(Number(contextWindow)) ? Number(contextWindow) : null
  const normalizedMaxTokens = Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : null
  if (!normalizedContextWindow && !normalizedMaxTokens) return null
  return {
    contextWindow: normalizedContextWindow,
    maxTokens: normalizedMaxTokens
  }
}

/** 单次 GET 模型列表尝试；responseBody 为完整响应原文，parsedJson 在解析成功时附带 */
async function fetchModelInfoAttempt(candidateUrl, headers, modelName) {
  const attempt = {
    url: candidateUrl,
    ok: false,
    modelInfo: null,
    status: null,
    statusText: null,
    responseBody: null,
    parsedJson: null,
    error: null
  }
  try {
    const response = await fetch(candidateUrl, { method: 'GET', headers })
    attempt.status = response.status
    attempt.statusText = response.statusText
    const text = await response.text()
    attempt.responseBody = text
    if (!response.ok) {
      attempt.error = `HTTP ${response.status} ${(response.statusText || '').trim()}`.trim()
      return attempt
    }
    let data
    try {
      data = JSON.parse(text)
    } catch (parseErr) {
      attempt.error = `响应不是合法 JSON: ${parseErr.message}`
      return attempt
    }
    attempt.parsedJson = data
    const list = Array.isArray(data?.data) ? data.data : []
    if (list.length === 0) {
      attempt.error = 'JSON 中 data 为空数组，未列出任何模型'
      return attempt
    }
    const lowered = String(modelName || '').toLowerCase()
    const matched = list.find(item => String(item?.id || '').toLowerCase() === lowered)
      || list.find(item => String(item?.name || '').toLowerCase() === lowered)
      || null
    if (!matched) {
      attempt.error = `在返回的 ${list.length} 个模型中未找到与「${modelName}」匹配的 id 或 name`
      return attempt
    }
    attempt.ok = true
    attempt.modelInfo = matched
    return attempt
  } catch (error) {
    attempt.error = `请求异常: ${error.message}`
    return attempt
  }
}

ipcMain.handle('detect-model-capabilities', async (event, config) => {
  const { url, apiKey, apiType, modelName } = config || {}
  const normalizedBaseUrl = normalizeBaseUrl(url)
  if (!normalizedBaseUrl) {
    return {
      success: false,
      message: '供应商 URL 为空，无法探测',
      capabilities: null,
      probeDebug: { phase: 'validation', reason: 'empty_base_url' }
    }
  }
  if (!modelName || !String(modelName).trim()) {
    return {
      success: false,
      message: '模型 ID 为空，无法探测',
      capabilities: null,
      probeDebug: { phase: 'validation', reason: 'empty_model_name' }
    }
  }

  const headers = { 'Content-Type': 'application/json' }
  if (apiType === 'anthropic') {
    if (apiKey) headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const candidateUrls = [
    `${normalizedBaseUrl}/models`,
    `${normalizedBaseUrl}/v1/models`
  ]

  const uniqueCandidateUrls = Array.from(new Set(candidateUrls))

  const emptyCaps = {
    contextWindow: null,
    maxTokens: null,
    reasoningMode: null,
    inputTypes: null
  }

  try {
    const attempts = []
    let modelInfo = null
    for (const candidateUrl of uniqueCandidateUrls) {
      const attempt = await fetchModelInfoAttempt(candidateUrl, headers, modelName)
      attempts.push(attempt)
      if (attempt.ok && attempt.modelInfo) {
        modelInfo = attempt.modelInfo
        break
      }
    }

    const probeMeta = {
      baseUrl: normalizedBaseUrl,
      modelName: String(modelName).trim(),
      candidateUrls: uniqueCandidateUrls
    }

    if (!modelInfo) {
      return {
        success: false,
        message: '无法匹配模型或接口未返回有效列表（详见控制台完整响应）',
        capabilities: emptyCaps,
        probeDebug: {
          ...probeMeta,
          attempts
        }
      }
    }

    const capability = extractCapabilityFromModelInfo(modelInfo) || {}
    const contextWindow = capability.contextWindow ?? null
    const maxTokens = capability.maxTokens ?? null

    if (!contextWindow && !maxTokens) {
      return {
        success: false,
        message: '已匹配模型，但未解析到 Context / Max Tokens（详见控制台）',
        capabilities: emptyCaps,
        probeDebug: {
          ...probeMeta,
          attempts,
          matchedModelInfo: modelInfo
        }
      }
    }

    return {
      success: true,
      message: '探测成功',
      capabilities: {
        contextWindow,
        maxTokens,
        reasoningMode: inferReasoningMode(modelName),
        inputTypes: inferInputTypes(modelName)
      },
      probeDebug: {
        ...probeMeta,
        attempts,
        matchedModelInfo: modelInfo
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `探测失败: ${error.message}`,
      capabilities: null,
      probeDebug: {
        phase: 'exception',
        message: error.message,
        stack: error.stack ? String(error.stack) : null
      }
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
