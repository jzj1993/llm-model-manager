import type { ModelConfig, ProviderConfig } from '@shared/types'
import { normalizeEndpoint, normalizeUrl } from '@/lib/provider-api'
import type { ProviderForm } from '@/lib/preset-forms'

export type ModelForm = Omit<ModelConfig, 'status' | 'lastCheck' | 'lastMessage'>

export const emptyProviderForm: ProviderForm = {
  id: '',
  name: '',
  apiType: 'openai',
  url: '',
  endpoint: '',
  website: '',
  apiKey: ''
}

export const emptyModelForm: ModelForm = {
  id: '',
  name: ''
}

export function modelKey(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`
}

export function maskApiKey(apiKey?: string): string {
  const raw = String(apiKey || '').trim()
  if (!raw) return '未填写'
  if (raw.length <= 12) return `${raw.slice(0, 5)}****`
  return `${raw.slice(0, 7)}${'*'.repeat(Math.max(8, raw.length - 11))}${raw.slice(-4)}`
}

export function normalizeProviders(raw: ProviderConfig[]): ProviderConfig[] {
  return (Array.isArray(raw) ? raw : []).map((provider) => ({
    ...provider,
    id: String(provider.id || '').trim(),
    name: String(provider.name || '').trim(),
    url: normalizeUrl(String(provider.url || '').trim()),
    endpoint: normalizeEndpoint(String(provider.endpoint || '').trim()),
    models: (Array.isArray(provider.models) ? provider.models : []).map((m) => ({
      id: String(m.id || '').trim(),
      name: String(m.name || '').trim() || String(m.id || '').trim(),
      ...(m.params && typeof m.params === 'object' ? { params: m.params } : {}),
      status: m.status || 'pending',
      lastCheck: m.lastCheck || null,
      lastMessage: m.lastMessage || null
    }))
  }))
}
