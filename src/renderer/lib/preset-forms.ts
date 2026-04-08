import type { ComboBoxOption } from '@/components/ui/combobox'
import type { ModelPreset, ProviderPreset, ProviderPresetApiConfig } from '@/lib/presets'
import type { ApiType, ModelConfig, ModelParams, ProviderConfig } from '@shared/types'

export type ProviderForm = Omit<ProviderConfig, 'models'>

/** 将 `kebab-case` 的供应商 ID 转为标题大小写词组，用作无预设时的展示名 */
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

/** 在预设列表中查找与当前供应商 id 或名称（不区分大小写）相同的项 */
export function findMatchedProviderPreset(provider: ProviderConfig, providerPresets: ProviderPreset[]): ProviderPreset | null {
  const normalizedId = String(provider.id || '').trim()
  const normalizedName = String(provider.name || '').trim().toLowerCase()

  return (
    providerPresets.find((preset) => {
      const sameId = String(preset.id || '').trim() === normalizedId
      const sameName = String(preset.name || '').trim().toLowerCase() === normalizedName
      return sameId || sameName
    }) || null
  )
}

export function getProviderPresetNameById(providerId: string, presets: ProviderPreset[]): string {
  const t = String(providerId || '').trim()
  if (!t) return ''
  const match = presets.find((p) => String(p.id || '').trim() === t)
  return String(match?.name || '').trim()
}

/** 至少一端非空才视为「有连接信息」（与 Spec：无任何有效连接时只填展示名一致） */
export function hasConnectionInfo(c: ProviderPresetApiConfig): boolean {
  return Boolean(String(c.baseUrl || '').trim() || String(c.endpoint || '').trim())
}

/**
 * 在 `apiConfigs` 中取与当前接口类型匹配、且含有效连接信息的一项；
 * 若没有该类型的项，则用第一项中「有连接信息」的配置（Spec：无该类型时用第一组）。
 */
export function pickProviderPresetApiConfig(
  preset: ProviderPreset | null | undefined,
  preferredApiType?: ApiType
): ProviderPresetApiConfig | null {
  if (!preset?.apiConfigs?.length) return null
  if (!preset.apiConfigs.some(hasConnectionInfo)) return null

  if (preferredApiType) {
    const hit = preset.apiConfigs.find((c) => c.apiType === preferredApiType)
    if (hit) return hasConnectionInfo(hit) ? hit : null
  }

  const first = preset.apiConfigs[0]
  if (first && hasConnectionInfo(first)) return first
  return preset.apiConfigs.find(hasConnectionInfo) ?? null
}

/** 若有与当前供应商匹配的预设，则将该供应商下的模型预设排在列表前，其余模型预设排在后 */
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

/** 合并候选预设中的模型 ID 与本地已保存的模型 ID（去重，预设顺序优先）；选项标签为「模型名 - 供应商预设名」或回退为 ID */
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

export function buildUrlComboOptions(baseUrls: string[]): ComboBoxOption[] {
  const urls = Array.from(
    new Set(baseUrls.map((item) => String(item || '').trim()).filter(Boolean))
  )
  return urls.map((value) => ({ value, label: value }))
}

export function buildEndpointComboOptions(endpoints: string[]): ComboBoxOption[] {
  const list = Array.from(
    new Set(endpoints.map((item) => String(item || '').trim()).filter(Boolean))
  )
  return list.map((value) => ({ value, label: value }))
}

/**
 * 根据所选供应商 ID 写入展示名；若命中预设则再写入与当前接口类型匹配的 `apiType` / `baseUrl` / `endpoint`（无匹配项时用预设中第一项）。
 */
export function applyProviderPresetFromId(
  providerId: string,
  presets: ProviderPreset[],
  options?: { preferredApiType?: ApiType }
): Partial<ProviderForm> {
  const preset = getProviderPresetById(providerId, presets)
  if (!preset) {
    return { name: formatProviderNameFromId(providerId) }
  }
  const cfg = pickProviderPresetApiConfig(preset, options?.preferredApiType)
  if (!cfg) {
    return { name: preset.name }
  }
  return {
    name: preset.name,
    apiType: cfg.apiType,
    baseUrl: cfg.baseUrl,
    endpoint: cfg.endpoint
  }
}

/** 切换「接口类型」时，若当前 ID 在预设中存在对应 `apiType` 的配置，则同步 `baseUrl` / `endpoint`。 */
export function applyProviderPresetApiType(
  providerId: string,
  presets: ProviderPreset[],
  apiType: ApiType
): Partial<ProviderForm> {
  const preset = getProviderPresetById(providerId, presets)
  if (!preset) return {}
  const cfg = preset.apiConfigs.find((c) => c.apiType === apiType)
  if (!cfg || !hasConnectionInfo(cfg)) return {}
  return { baseUrl: cfg.baseUrl, endpoint: cfg.endpoint }
}

type ModelFormPick = Pick<ModelConfig, 'name' | 'params'>

/** 按模型 ID 在候选预设中查找，用预设补全空的展示名及 `params`（上下文窗口、maxTokens、推理、输入类型等） */
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
