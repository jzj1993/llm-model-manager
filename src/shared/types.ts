export type ApiType = 'openai' | 'anthropic'

/** 模型能力/请求相关参数，全部可选，便于扩展 */
export interface ModelParams {
  contextWindow?: number | null
  maxTokens?: number | null
  reasoningMode?: boolean | null
  inputTypes?: string[] | null
}

export interface ModelConfig {
  id: string
  name?: string
  params?: ModelParams
  status?: 'pending' | 'success' | 'error'
  lastCheck?: string | null
  lastMessage?: string | null
}

export interface ProviderConfig {
  id: string
  name?: string
  apiType: ApiType
  baseUrl: string
  endpoint: string
  website?: string
  apiKey?: string
  models: ModelConfig[]
}

export interface ExportEntry {
  title: string
  content: string
  type?: string | null
}

/** 从远端拉取模型列表时 UI 状态：未打开、加载中、失败（含错误信息）、成功（含模型数组） */
export type ModelListDialogState =
  | null
  | { providerIndex: number; status: 'loading' }
  | { providerIndex: number; status: 'error'; message: string }
  | { providerIndex: number; status: 'ready'; models: ModelConfig[] }
