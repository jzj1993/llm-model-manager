const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs/promises')
const crypto = require('crypto')
const { execFile } = require('child_process')

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

function normalizeUrl(url) {
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

async function tryFetchModelInfo(candidateUrl, headers, modelName) {
  const response = await fetch(candidateUrl, { method: 'GET', headers })
  if (!response.ok) return null
  const data = await response.json()
  const list = Array.isArray(data?.data) ? data.data : []
  if (list.length === 0) return null
  const lowered = String(modelName || '').toLowerCase()
  const matched = list.find(item => String(item?.id || '').toLowerCase() === lowered)
    || list.find(item => String(item?.name || '').toLowerCase() === lowered)
    || null
  return matched || null
}

ipcMain.handle('detect-model-capabilities', async (event, config) => {
  const { url, apiKey, apiType, modelName } = config || {}
  const normalizedBaseUrl = normalizeUrl(url)
  if (!normalizedBaseUrl) {
    return { success: false, message: '供应商 URL 为空，无法探测', capabilities: null }
  }
  if (!modelName || !String(modelName).trim()) {
    return { success: false, message: '模型 ID 为空，无法探测', capabilities: null }
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

  try {
    let modelInfo = null
    for (const candidateUrl of uniqueCandidateUrls) {
      try {
        modelInfo = await tryFetchModelInfo(candidateUrl, headers, modelName)
        if (modelInfo) break
      } catch (error) {
        // 忽略单个端点失败，继续尝试其他候选地址
      }
    }

    const capability = extractCapabilityFromModelInfo(modelInfo) || {}
    const contextWindow = capability.contextWindow ?? null
    const maxTokens = capability.maxTokens ?? null

    if (!contextWindow && !maxTokens) {
      return {
        success: false,
        message: '未从模型元数据接口获取到 Context Window / Max Tokens',
        capabilities: {
          contextWindow: null,
          maxTokens: null,
          reasoningMode: inferReasoningMode(modelName),
          inputTypes: inferInputTypes(modelName)
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
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `探测失败: ${error.message}`,
      capabilities: null
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

    const scriptPath = path.join(os.tmpdir(), `model-checker-export-${crypto.randomUUID()}.command`)
    const content = ['#!/bin/bash', 'set -e', script, '', 'echo', 'echo "按回车关闭窗口..."', 'read -r _'].join('\n')
    await fs.writeFile(scriptPath, content, { mode: 0o755 })

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
