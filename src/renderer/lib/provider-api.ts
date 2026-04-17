import type { FetchHttpExchange, FetchHttpRequest } from '@shared/ipc'
import type { ModelConfig, ProviderConfig } from '@shared/types'

/** 将 Base URL 与 Endpoint 拼成完整请求地址：先 trim；若接缝处出现 `//` 则合并为单斜杠；若两侧在接缝处都没有 `/` 则插入一个 `/`。 */
export function joinUrl(url: string, endpoint: string): string {
  const u = String(url || '').trim()
  const e = String(endpoint || '').trim()
  if (!e) return u
  if (!u) return e
  if (u.endsWith('/') && e.startsWith('/')) return u + e.slice(1)
  if (!u.endsWith('/') && !e.startsWith('/')) return `${u}/${e}`
  return u + e
}

function joinBaseAndPath(base: string, path: string): string {
  const b = String(base || '').trim()
  const p = String(path || '').trim().replace(/^\//, '')
  if (!b) return p ? `/${p}` : ''
  if (b.endsWith('/')) return `${b}${p}`
  return `${b}/${p}`
}

function inferReasoningMode(modelName: string): boolean | null {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const reasoningKeywords = ['reasoner', 'reasoning', 'r1', 'o1', 'o3', 'o4', 'thinking']
  return reasoningKeywords.some((key) => text.includes(key)) ? true : null
}

function inferInputTypes(modelName: string): string[] | null {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const multimodalKeywords = ['vision', 'vl', 'omni', '4o', 'gemini', 'image']
  return multimodalKeywords.some((key) => text.includes(key)) ? ['text', 'image'] : ['text']
}

async function fetchHttp(request: FetchHttpRequest) {
  const response = await window.electronAPI.fetchHttp(request)
  logFetchExchange(response.exchange)
  return response
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function collectText(value: unknown): string[] {
  if (typeof value === 'string') {
    const text = value.trim()
    return text ? [text] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectText(item))
  }
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const directKeys = ['text', 'output_text', 'content', 'value']
  for (const key of directKeys) {
    if (typeof record[key] === 'string') {
      const text = String(record[key]).trim()
      if (text) return [text]
    }
  }
  if (Array.isArray(record.content)) {
    const nested = record.content.flatMap((item) => collectText(item))
    if (nested.length > 0) return nested
  }
  const nestedKeys = ['message', 'delta']
  for (const key of nestedKeys) {
    const nested = collectText(record[key])
    if (nested.length > 0) return nested
  }
  return []
}

function extractModelResponseText(payload: any): string {
  if (!payload || typeof payload !== 'object') return ''
  const directCandidates = [
    payload.output_text,
    payload.completion,
    payload.response,
    payload.text
  ]
  for (const candidate of directCandidates) {
    const parts = collectText(candidate)
    if (parts.length > 0) return parts.join('\n').trim()
  }

  const groupedCandidates = [
    payload.output,
    payload.content,
    payload.choices,
    payload.messages
  ]
  for (const candidate of groupedCandidates) {
    const parts = collectText(candidate)
    if (parts.length > 0) return parts.join('\n').trim()
  }
  return ''
}

function summarizeText(text: string, limit = 160): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

function formatExchangeLog(exchange?: FetchHttpExchange): string {
  if (!exchange) return ''
  const sections = [
    '请求:',
    JSON.stringify(exchange.request, null, 2),
    exchange.response ? '响应:' : '错误:',
    exchange.response ? JSON.stringify(exchange.response, null, 2) : String(exchange.error || '')
  ]
  return sections.join('\n')
}

function buildCheckResultMessage(summary: string, exchange?: FetchHttpExchange): string {
  const log = formatExchangeLog(exchange)
  return log ? `${summary}\n\n${log}` : summary
}

function logFetchExchange(exchange?: FetchHttpExchange) {
  if (!exchange) return
  const title = exchange.response
    ? `[HTTP] ${exchange.request.method} ${exchange.request.url} -> ${exchange.response.status} ${exchange.response.statusText}`
    : `[HTTP] ${exchange.request.method} ${exchange.request.url} -> ERROR`

  console.groupCollapsed(title)
  console.log('request', exchange.request)
  if (exchange.response) {
    console.log('response', exchange.response)
  }
  if (exchange.error) {
    console.error('error', exchange.error)
  }
  console.groupEnd()
}

function buildHeaders(provider: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider.apiType === 'anthropic') {
    if (provider.apiKey) headers['x-api-key'] = provider.apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`
  }
  return headers
}

function buildModelCheckRequest(provider: ProviderConfig, modelName: string): FetchHttpRequest {
  const body = provider.apiType === 'anthropic'
    ? {
        model: modelName,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      }
    : {
        model: modelName,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      }
  return {
    url: joinUrl(provider.baseUrl, provider.endpoint),
    method: 'POST',
    headers: buildHeaders(provider),
    body: JSON.stringify(body),
    timeoutMs: 60000
  }
}

export async function checkModelViaHttp(provider: ProviderConfig, modelName: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchHttp(buildModelCheckRequest(provider, modelName))
  if (!res.ok) return { success: false, message: buildCheckResultMessage(`请求失败: ${res.error}`, res.exchange) }

  const parsed = safeJsonParse(res.body)
  if (res.status >= 200 && res.status < 300) {
    const outputText = extractModelResponseText(parsed)
    if (!outputText) {
      return {
        success: false,
        message: buildCheckResultMessage(`模型返回为空，HTTP ${res.status}`, res.exchange)
      }
    }
    return {
      success: true,
      message: buildCheckResultMessage(`模型可用，返回: ${summarizeText(outputText)}`, res.exchange)
    }
  }

  const errorMessage = parsed?.error?.message || parsed?.message || `HTTP ${res.status}`
  return { success: false, message: buildCheckResultMessage(errorMessage, res.exchange) }
}

export async function fetchProviderModelsList(provider: ProviderConfig): Promise<{ success: boolean; models: ModelConfig[]; message?: string }> {
  const base = String(provider.baseUrl || '').trim()
  if (!base) return { success: false, models: [], message: '供应商 URL 为空' }
  const candidates = [joinBaseAndPath(base, 'v1/models'), joinBaseAndPath(base, 'models')]
  for (const url of candidates) {
    const response = await fetchHttp({ url, method: 'GET', headers: buildHeaders(provider), timeoutMs: 30000 })
    if (!response.ok || response.status < 200 || response.status >= 300) continue
    try {
      const parsed = JSON.parse(response.body)
      const list = Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed) ? parsed : []
      const models = list
        .map((item: any) => {
          const id = String(item?.id ?? item?.name ?? '').trim()
          if (!id) return null
          return {
            id,
            name: String(item?.display_name ?? item?.name ?? id),
            params: {
              contextWindow: Number(item?.context_window ?? item?.contextWindow) || null,
              maxTokens: Number(item?.max_tokens ?? item?.maxTokens ?? item?.output_token_limit) || null,
              reasoningMode: inferReasoningMode(id),
              inputTypes: inferInputTypes(id)
            },
            status: 'pending' as const,
            lastCheck: null,
            lastMessage: null
          }
        })
        .filter(Boolean) as ModelConfig[]
      return { success: true, models }
    } catch {}
  }
  return { success: false, models: [], message: '加载模型列表失败' }
}
