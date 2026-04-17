import { ipcMain, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fsPromises from 'node:fs/promises'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { IPC_CHANNELS, type FetchHttpRequest, type FetchHttpResponse, type ElectronAPI, type SaveResult, type FetchHttpExchange } from '../shared/ipc'
import type { ProviderConfig } from '../shared/types'

function headersObjectFromFetchHeaders(fetchHeaders: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    fetchHeaders.forEach((value, key) => {
      out[key] = value
    })
  } catch (_) {}
  return out
}

function redactHeaders(rawHeaders: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawHeaders || {})) {
    const lowerKey = key.toLowerCase()
    out[key] = lowerKey.includes('authorization') || lowerKey.includes('api-key') ? '[REDACTED]' : value
  }
  return out
}

function truncateForLog(value: string | null, limit = 4000): string {
  const text = String(value ?? '')
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}\n...[truncated ${text.length - limit} chars]`
}

async function requestByHttp(request: FetchHttpRequest): Promise<FetchHttpResponse> {
  let timer: ReturnType<typeof setTimeout> | undefined
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
  const exchange: FetchHttpExchange = {
    request: {
      url,
      method,
      headers: redactHeaders(headers),
      body: bodyString == null ? null : truncateForLog(bodyString)
    }
  }

  try {
    if (!url) return { ok: false, error: 'URL 为空', exchange }
    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), timeoutMs)
    const requestInit: RequestInit = { method, headers, signal: controller.signal }
    if (bodyString != null) requestInit.body = bodyString
    const response = await fetch(url, requestInit)
    clearTimeout(timer)
    const body = await response.text()
    exchange.response = {
      status: response.status,
      statusText: response.statusText,
      headers: headersObjectFromFetchHeaders(response.headers),
      body: truncateForLog(body)
    }
    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      headers: headersObjectFromFetchHeaders(response.headers),
      body,
      exchange
    }
  } catch (error) {
    if (timer) clearTimeout(timer)
    exchange.error = error instanceof Error ? error.message : String(error)
    return { ok: false, error: exchange.error, exchange }
  }
}

export function registerIpcHandlers(args: {
  loadConfigs: ElectronAPI['loadConfigs']
  saveConfigs: (configs: ProviderConfig[]) => Promise<SaveResult>
}): void {
  ipcMain.handle(IPC_CHANNELS.loadConfigs, args.loadConfigs)
  ipcMain.handle(IPC_CHANNELS.saveConfigs, (_event, configs) => args.saveConfigs(configs))
  ipcMain.handle(IPC_CHANNELS.fetchHttp, (_event, request: FetchHttpRequest) => requestByHttp(request))

  ipcMain.handle(IPC_CHANNELS.openExternal, async (_event, target: string): Promise<boolean> => {
    try {
      const value = String(target || '').trim()
      if (!value) return false
      await shell.openExternal(value)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC_CHANNELS.runCommandInTerminal, async (_event, command: string): Promise<SaveResult> => {
    try {
      const script = String(command || '').trim()
      if (!script) return { success: false, message: '命令为空' }
      const scriptPath = path.join(os.tmpdir(), `llm-model-manager-export-${crypto.randomUUID()}.command`)
      const content = ['#!/bin/bash', 'set -e', script, '', 'echo', 'echo "按回车关闭窗口..."', 'read -r _'].join('\n')
      await fsPromises.writeFile(scriptPath, content, { mode: 0o755 })
      await new Promise<void>((resolve, reject) => {
        execFile('open', ['-a', 'Terminal', scriptPath], (error) => (error ? reject(error) : resolve()))
      })
      return { success: true }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.openHTMLWithScript, async (_event, script: string): Promise<SaveResult> => {
    try {
      const javascriptCode = String(script || '').trim()
      if (!javascriptCode) return { success: false, message: 'JavaScript 代码为空' }
      const htmlContent = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>JavaScript 执行页面</title></head><body><script>${javascriptCode}</script></body></html>`
      const htmlPath = path.join(os.tmpdir(), `llm-model-manager-script-${crypto.randomUUID()}.html`)
      await fsPromises.writeFile(htmlPath, htmlContent, 'utf-8')
      await shell.openExternal(`file://${htmlPath}`)
      return { success: true }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) }
    }
  })
}
