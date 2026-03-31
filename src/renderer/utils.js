function normalizeUrl(url) {
  return url.replace(/\/+$/, '')
}

function normalizeEndpoint(endpoint) {
  if (!endpoint) return ''
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

function joinUrl(url, endpoint) {
  return `${normalizeUrl(url)}${normalizeEndpoint(endpoint)}`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function maskApiKey(apiKey) {
  const raw = String(apiKey || '').trim()
  if (!raw) return '未填写'
  if (raw.length <= 11) return `${raw.slice(0, 7)}****`
  const prefix = raw.slice(0, 7)
  const suffix = raw.slice(-4)
  const stars = '*'.repeat(Math.max(8, raw.length - 11))
  return `${prefix}${stars}${suffix}`
}

function getModelKey(providerIndex, modelIndex) {
  return `${providerIndex}:${modelIndex}`
}

function getProviderModelCount(providerIndex) {
  return providers[providerIndex]?.models?.length || 0
}

function getProviderSelectedCount(providerIndex) {
  const total = getProviderModelCount(providerIndex)
  let selected = 0
  for (let i = 0; i < total; i += 1) {
    if (selectedModelKeys.has(getModelKey(providerIndex, i))) {
      selected += 1
    }
  }
  return selected
}

function getProviderSelectionState(providerIndex) {
  const total = getProviderModelCount(providerIndex)
  const selected = getProviderSelectedCount(providerIndex)
  if (total === 0 || selected === 0) {
    return { total, selected, checked: false, indeterminate: false }
  }
  if (selected === total) {
    return { total, selected, checked: true, indeterminate: false }
  }
  return { total, selected, checked: false, indeterminate: true }
}

function getApiKeyDisplay(provider, providerIndex) {
  if (visibleApiKeyProviders.has(providerIndex)) {
    return String(provider.apiKey || '').trim() || '未填写'
  }
  return maskApiKey(provider.apiKey)
}

function parseOptionalInteger(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseInputTypes(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const items = raw
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  if (items.length === 0) return null
  return Array.from(new Set(items))
}

function normalizeOpenAIUrlAndEndpoint(apiType, url, endpoint) {
  if (apiType !== 'openai') {
    return { url, endpoint }
  }

  let normalizedUrl = normalizeUrl(url)
  let normalizedEndpoint = normalizeEndpoint(endpoint)

  if (normalizedEndpoint.startsWith('/v1/')) {
    if (!normalizedUrl.endsWith('/v1')) {
      normalizedUrl = `${normalizedUrl}/v1`
    }
    normalizedEndpoint = normalizedEndpoint.replace(/^\/v1/, '')
    normalizedEndpoint = normalizeEndpoint(normalizedEndpoint)
  }

  return {
    url: normalizedUrl,
    endpoint: normalizedEndpoint
  }
}
