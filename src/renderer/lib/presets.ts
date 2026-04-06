export interface ProviderPreset {
  id: string
  name: string
  apiType: 'openai' | 'anthropic'
  url: string
  endpoint: string
  website?: string
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

export async function loadPresets(): Promise<{ providers: ProviderPreset[]; models: ModelPreset[] }> {
  const [providerResp, modelResp] = await Promise.all([
    fetch('/presets/provider-presets.json'),
    fetch('/presets/model-presets.json')
  ])
  const providers = providerResp.ok ? ((await providerResp.json()) as ProviderPreset[]) : []
  const models = modelResp.ok ? ((await modelResp.json()) as ModelPreset[]) : []
  return { providers: Array.isArray(providers) ? providers : [], models: Array.isArray(models) ? models : [] }
}
