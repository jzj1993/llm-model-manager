import type { ComboBoxOption } from '@/components/ui/combobox'
import { normalizeEndpoint, normalizeUrl } from '@/lib/provider-api'
import type { ModelPreset, ProviderPreset } from '@/lib/presets'
import type { ModelConfig, ModelParams, ProviderConfig } from '@shared/types'

export type ProviderForm = Omit<ProviderConfig, 'models'>

const URL_DEFAULTS = ['https://api.anthropic.com', 'https://api.openai.com/v1', '']
const ENDPOINT_DEFAULTS = ['/v1/messages', '/chat/completions', '']

/** 与旧版 modals.ts 一致：无预设时由 ID 生成展示名 */
export function formatProviderNameFromId(providerId: string): string {
  const normalizedId = String(providerId || '').trim().toLowerCase()
  if (!normalizedId) return ''
  return normalizedId
    .split('-')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
    .filter(Boolean)
    .join(' ')
}

export function getProviderPresetById(id: string, presets: ProviderPreset[]): ProviderPreset | null {
  const t = String(id || '').trim()
  if (!t) return null
  return presets.find((p) => String(p.id || '').trim() === t) || null
}

/** 与旧版 findMatchedPreset 一致：按名称或 (url+endpoint) 匹配 */
export function findMatchedProviderPreset(provider: ProviderConfig, providerPresets: ProviderPreset[]): ProviderPreset | null {
  const normalizedUrl = normalizeUrl(String(provider.url || '').trim())
  const normalizedEndpoint = normalizeEndpoint(String(provider.endpoint || '').trim())
  const normalizedName = String(provider.name || '').trim().toLowerCase()

  return (
    providerPresets.find((preset) => {
      const sameName = String(preset.name || '').trim().toLowerCase() === normalizedName
      const sameUrl = normalizeUrl(String(preset.url || '')) === normalizedUrl
      const sameEndpoint = normalizeEndpoint(String(preset.endpoint || '')) === normalizedEndpoint
      return sameName || (sameUrl && sameEndpoint)
    }) || null
  )
}

export function getProviderPresetNameById(providerId: string, presets: ProviderPreset[]): string {
  const t = String(providerId || '').trim()
  if (!t) return ''
  const match = presets.find((p) => String(p.id || '').trim() === t)
  return String(match?.name || '').trim()
}

/** 当前供应商匹配的模型预设优先，其余在后（与旧版 getModelPresetCandidates 一致） */
export function getModelPresetCandidates(
  provider: ProviderConfig | undefined,
  providerPresets: ProviderPreset[],
  allModelPresets: ModelPreset[]
): ModelPreset[] {
  if (!Array.isArray(allModelPresets) || allModelPresets.length === 0) return []
  if (!provider) return allModelPresets
  const matchedProviderPreset = findMatchedProviderPreset(provider, providerPresets)
  if (!matchedProviderPreset) return allModelPresets
  const matchedProviderId = String(matchedProviderPreset.id || '')
  const matchedModels = allModelPresets.filter((item) => String(item.provider || '') === matchedProviderId)
  const otherModels = allModelPresets.filter((item) => String(item.provider || '') !== matchedProviderId)
  return [...matchedModels, ...otherModels]
}

/** 预设 ID + 本地已有模型 ID 合并；标签为「名称 - 供应商预设名」（与旧版 renderModelNamePresetOptions 一致） */
export function buildModelIdComboOptions(
  providers: ProviderConfig[],
  providerPresets: ProviderPreset[],
  candidatePresets: ModelPreset[]
): ComboBoxOption<ModelPreset | null>[] {
  const localModelIds = providers
    .flatMap((p) => p.models.map((m) => String(m.id || '').trim()))
    .filter(Boolean)

  const orderedPresetIds = Array.from(
    new Set(candidatePresets.map((item) => String(item.id || '').trim()).filter(Boolean))
  )
  const localOnlyIds = Array.from(new Set(localModelIds)).filter((id) => !orderedPresetIds.includes(id))
  const mergedIds = [...orderedPresetIds, ...localOnlyIds]

  return mergedIds.map((id) => {
    const matched = candidatePresets.find((item) => String(item.id || '').trim() === id) || null
    const modelName = matched ? String(matched.name || '').trim() : ''
    const providerName = matched ? getProviderPresetNameById(matched.provider, providerPresets) : ''
    const hint =
      modelName && providerName ? `${modelName} - ${providerName}` : modelName || providerName || id
    return {
      value: id,
      label: hint,
      keywords: [modelName, providerName, hint].filter(Boolean),
      data: matched
    }
  })
}

export function buildUrlComboOptions(providerPresets: ProviderPreset[]): ComboBoxOption[] {
  const urls = Array.from(
    new Set(providerPresets.map((item) => normalizeUrl(String(item.url || '').trim())).filter(Boolean))
  )
  return urls.map((value) => ({ value, label: value }))
}

export function buildEndpointComboOptions(providerPresets: ProviderPreset[]): ComboBoxOption[] {
  const endpoints = Array.from(
    new Set(providerPresets.map((item) => normalizeEndpoint(String(item.endpoint || '').trim())).filter(Boolean))
  )
  return endpoints.map((value) => ({ value, label: value }))
}

/** 与旧版 data-export.ts updateDefaults 一致：仅在值为占位/默认时切换 */
export function applyApiTypeUrlEndpointDefaults(form: ProviderForm): ProviderForm {
  const u = String(form.url || '').trim()
  const e = String(form.endpoint || '').trim()
  if (form.apiType === 'anthropic') {
    return {
      ...form,
      url: URL_DEFAULTS.includes(u) ? 'https://api.anthropic.com' : form.url,
      endpoint: ENDPOINT_DEFAULTS.includes(e) ? '/v1/messages' : form.endpoint
    }
  }
  return {
    ...form,
    url: URL_DEFAULTS.includes(u) ? 'https://api.openai.com/v1' : form.url,
    endpoint: ENDPOINT_DEFAULTS.includes(e) ? '/chat/completions' : form.endpoint
  }
}

export function applyProviderPresetFromId(providerId: string, presets: ProviderPreset[]): Partial<ProviderForm> {
  const preset = getProviderPresetById(providerId, presets)
  if (!preset) {
    return { name: formatProviderNameFromId(providerId) }
  }
  return {
    id: preset.id,
    name: preset.name,
    apiType: preset.apiType,
    url: preset.url,
    endpoint: preset.endpoint,
    website: preset.website || preset.url || ''
  }
}

type ModelFormPick = Pick<ModelConfig, 'name' | 'params'>

/** 与旧版 applyModelPresetFromModelName 一致 */
export function applyModelPresetById(modelId: string, candidates: ModelPreset[], prev: ModelFormPick): Partial<ModelConfig> {
  const preset = candidates.find((item) => String(item.id || '').trim() === String(modelId || '').trim())
  if (!preset) return {}

  const next: Partial<ModelConfig> = {}
  if (!String(prev.name || '').trim() && preset.name) {
    next.name = String(preset.name).trim()
  }

  const params: ModelParams = { ...(prev.params || {}) }
  if (Number.isFinite(preset.contextWindow) && preset.contextWindow! > 0) {
    params.contextWindow = preset.contextWindow!
  }
  if (Number.isFinite(preset.maxCompletionTokens) && preset.maxCompletionTokens! > 0) {
    params.maxTokens = preset.maxCompletionTokens!
  }
  if (typeof preset.reasoning === 'boolean') {
    params.reasoningMode = preset.reasoning
  }
  if (Array.isArray(preset.input) && preset.input.length > 0) {
    params.inputTypes = preset.input
  }
  if (Object.keys(params).length > 0) {
    next.params = params
  }
  return next
}
