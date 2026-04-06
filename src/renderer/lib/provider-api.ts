import type { FetchHttpRequest } from '@shared/ipc'
import type { ModelConfig, ProviderConfig } from '@shared/types'

export function normalizeUrl(url: string): string {
  return String(url || '').trim().replace(/\/+$/, '')
}

export function normalizeEndpoint(endpoint: string): string {
  const value = String(endpoint || '').trim()
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

export function joinUrl(url: string, endpoint: string): string {
  return `${normalizeUrl(url)}${normalizeEndpoint(endpoint)}`
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
  return window.electronAPI.fetchHttp(request)
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

export async function checkModelViaHttp(provider: ProviderConfig, modelName: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchHttp({
    url: joinUrl(provider.url, provider.endpoint),
    method: 'POST',
    headers: buildHeaders(provider),
    body: JSON.stringify({ model: modelName, messages: [{ role: 'user', content: 'Hello' }], max_tokens: 10 }),
    timeoutMs: 60000
  })
  if (!res.ok) return { success: false, message: `请求失败: ${res.error}` }
  if (res.status >= 200 && res.status < 300) return { success: true, message: '模型可用' }
  try {
    const parsed = JSON.parse(res.body)
    return { success: false, message: parsed?.error?.message || `HTTP ${res.status}` }
  } catch {
    return { success: false, message: `HTTP ${res.status}` }
  }
}

export async function fetchProviderModelsList(provider: ProviderConfig): Promise<{ success: boolean; models: ModelConfig[]; message?: string }> {
  const base = normalizeUrl(provider.url)
  if (!base) return { success: false, models: [], message: '供应商 URL 为空' }
  const candidates = [`${base}/v1/models`, `${base}/models`]
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
