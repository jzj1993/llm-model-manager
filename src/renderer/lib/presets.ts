import type { ApiType } from '@shared/types'

/** 单条接口类型对应的默认 Base URL 与 Endpoint */
export interface ProviderPresetApiConfig {
  apiType: ApiType
  baseUrl: string
  endpoint: string
}

/** 单条供应商预设：id、展示名，以及按接口类型分组的默认连接信息 */
export interface ProviderPreset {
  id: string
  name: string
  apiConfigs: ProviderPresetApiConfig[]
}

/** 供应商预设文件的根结构：预设列表及用于补全的 Base URL / Endpoint 字符串表 */
export interface ProviderPresetsFile {
  providers: ProviderPreset[]
  /** Base URL 补全列表，仅 URL 字符串 */
  baseUrls: string[]
  /** Endpoint 路径补全列表，仅路径字符串 */
  endpoints: string[]
}

export interface ModelPreset {
  id: string
  name: string
  provider: string
  contextWindow?: number
  maxCompletionTokens?: number
  reasoning?: boolean
  input?: string[]
}

/** 将 JSON 中的单条供应商预设规范为 `ProviderPreset`（须含 `apiConfigs`） */
export function normalizeProviderPreset(raw: unknown): ProviderPreset {
  const p = raw as Record<string, unknown>
  const id = String(p.id ?? '')
  const name = String(p.name ?? '')
  const apiConfigsRaw = Array.isArray(p.apiConfigs) ? p.apiConfigs : []
  const apiConfigs = (apiConfigsRaw as ProviderPresetApiConfig[]).map((c) => ({
    apiType: (c.apiType === 'anthropic' ? 'anthropic' : 'openai') as ApiType,
    baseUrl: String(c.baseUrl ?? ''),
    endpoint: String(c.endpoint ?? '')
  }))
  return { id, name, apiConfigs }
}

function mergeUniqueStrings(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a.map((s) => String(s || '').trim()).filter(Boolean), ...b]))
}

export async function loadPresets(): Promise<{
  providers: ProviderPreset[]
  models: ModelPreset[]
  baseUrls: string[]
  endpoints: string[]
}> {
  const [providerResp, modelResp] = await Promise.all([
    fetch('/presets/provider-presets.json'),
    fetch('/presets/model-presets.json')
  ])
  const raw = providerResp.ok ? await providerResp.json() : null
  let providers: ProviderPreset[] = []
  let fileBaseUrls: string[] = []
  let fileEndpoints: string[] = []
  if (Array.isArray(raw)) {
    providers = raw.map(normalizeProviderPreset)
  } else if (raw && typeof raw === 'object') {
    const file = raw as Partial<ProviderPresetsFile>
    const list = Array.isArray(file.providers) ? file.providers : []
    providers = list.map(normalizeProviderPreset)
    fileBaseUrls = Array.isArray(file.baseUrls) ? file.baseUrls : []
    fileEndpoints = Array.isArray(file.endpoints) ? file.endpoints : []
  }

  const fromConfigsBase = providers.flatMap((pr) => pr.apiConfigs.map((c) => c.baseUrl).filter(Boolean))
  const fromConfigsEp = providers.flatMap((pr) => pr.apiConfigs.map((c) => c.endpoint).filter(Boolean))
  const baseUrls = mergeUniqueStrings(fileBaseUrls, fromConfigsBase)
  const endpoints = mergeUniqueStrings(fileEndpoints, fromConfigsEp)

  const models = modelResp.ok ? ((await modelResp.json()) as ModelPreset[]) : []
  return {
    providers,
    models: Array.isArray(models) ? models : [],
    baseUrls,
    endpoints
  }
}
