/** 供应商 Models 接口：解析、能力提取与探测（均在渲染进程；主进程仅 fetch-http） */

function normalizeProviderBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function buildModelsListHeaders(apiKey, apiType) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiType === 'anthropic') {
    if (apiKey) headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  return headers
}

async function fetchHttpLogged(request) {
  const response = await window.electronAPI.fetchHttp(request)
  console.log('[fetch-http]', {request, response})
  return response
}

function mapModelListItem(item) {
  if (!item || typeof item !== 'object') return null
  const id = String(item.id ?? item.name ?? '').trim()
  if (!id) return null
  const displayName = String(item.display_name ?? item.name ?? item.id ?? '').trim()
  const supported = Array.isArray(item.supported_endpoint_types)
    ? item.supported_endpoint_types.map((x) => String(x))
    : null
  return {
    id,
    name: displayName || id,
    created_at: item.created_at ?? null,
    created: item.created ?? null,
    object: item.object != null ? String(item.object) : null,
    type: item.type != null ? String(item.type) : null,
    owned_by: item.owned_by != null ? String(item.owned_by) : null,
    supported_endpoint_types: supported
  }
}

function inferReasoningMode(modelName) {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const reasoningKeywords = ['reasoner', 'reasoning', 'r1', 'o1', 'o3', 'o4', 'thinking']
  if (reasoningKeywords.some(key => text.includes(key))) return true
  return null
}

function inferInputTypes(modelName) {
  const text = String(modelName || '').toLowerCase()
  if (!text) return null
  const multimodalKeywords = ['vision', 'vl', 'omni', '4o', 'gemini', 'image']
  if (multimodalKeywords.some(key => text.includes(key))) {
    return ['text', 'image']
  }
  return ['text']
}

function extractCapabilityFromModelInfo(modelInfo) {
  if (!modelInfo || typeof modelInfo !== 'object') return null
  const contextWindow = modelInfo.context_window
    ?? modelInfo.contextWindow
    ?? modelInfo.input_token_limit
    ?? modelInfo.max_context_length
    ?? modelInfo.context_length
    ?? null
  const maxTokens = modelInfo.output_token_limit
    ?? modelInfo.max_output_tokens
    ?? modelInfo.max_completion_tokens
    ?? modelInfo.max_tokens
    ?? null

  const normalizedContextWindow = Number.isFinite(Number(contextWindow)) ? Number(contextWindow) : null
  const normalizedMaxTokens = Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : null
  if (!normalizedContextWindow && !normalizedMaxTokens) return null
  return {
    contextWindow: normalizedContextWindow,
    maxTokens: normalizedMaxTokens
  }
}

function enrichModelListItem(raw) {
  const base = mapModelListItem(raw)
  if (!base) return null
  const cap = extractCapabilityFromModelInfo(raw) || {}
  const reasoningMode = inferReasoningMode(base.id)
  const inputTypes = inferInputTypes(base.id)
  return {
    ...base,
    contextWindow: cap.contextWindow ?? null,
    maxTokens: cap.maxTokens ?? null,
    reasoningMode,
    inputTypes
  }
}

function parseModelsListResponseToEnrichedModels(data) {
  let list = []
  if (Array.isArray(data?.data)) {
    list = data.data
  } else if (Array.isArray(data)) {
    list = data
  }
  const seen = new Set()
  const out = []
  for (const raw of list) {
    const m = enrichModelListItem(raw)
    if (m && m.id && !seen.has(m.id)) {
      seen.add(m.id)
      out.push(m)
    }
  }
  return out
}

async function fetchProviderModelsList(provider) {
  const base = normalizeProviderBaseUrl(provider.url)
  if (!base) {
    return { success: false, message: '供应商 URL 为空，无法加载模型列表', models: [] }
  }
  const headers = buildModelsListHeaders(provider.apiKey, provider.apiType)
  const candidates = [`${base}/v1/models`, `${base}/models`]
  let lastMessage = '无法从接口加载模型列表，请检查 URL 和 API Key'

  for (const requestUrl of candidates) {
    const res = await fetchHttpLogged({
      url: requestUrl,
      headers,
      method: 'GET',
      timeoutMs: 30000
    })
    if (!res.ok) {
      lastMessage = res.error || lastMessage
      continue
    }
    if (res.status < 200 || res.status >= 300) {
      lastMessage = `HTTP ${res.status} ${(res.statusText || '').trim()}`.trim()
      continue
    }
    let data
    try {
      data = JSON.parse(res.body)
    } catch (e) {
      lastMessage = `响应不是合法 JSON: ${e.message}`
      continue
    }
    const models = parseModelsListResponseToEnrichedModels(data)
    if (models.length > 0) {
      return { success: true, models, requestUrl }
    }
    lastMessage = '响应中未解析到任何模型'
  }

  return { success: false, message: lastMessage, models: [] }
}

async function fetchModelInfoAttemptViaHttp(candidateUrl, headers, modelName) {
  const attempt = {
    url: candidateUrl,
    ok: false,
    modelInfo: null,
    status: null,
    statusText: null,
    responseBody: null,
    parsedJson: null,
    error: null
  }
  const res = await fetchHttpLogged({
    url: candidateUrl,
    headers,
    method: 'GET',
    timeoutMs: 30000
  })
  if (!res.ok) {
    attempt.error = res.error || '请求失败'
    return attempt
  }
  attempt.status = res.status
  attempt.statusText = res.statusText
  attempt.responseBody = res.body
  if (res.status < 200 || res.status >= 300) {
    attempt.error = `HTTP ${res.status} ${(res.statusText || '').trim()}`.trim()
    return attempt
  }
  let data
  try {
    data = JSON.parse(res.body)
  } catch (parseErr) {
    attempt.error = `响应不是合法 JSON: ${parseErr.message}`
    return attempt
  }
  attempt.parsedJson = data
  const list = Array.isArray(data?.data) ? data.data : []
  if (list.length === 0) {
    attempt.error = 'JSON 中 data 为空数组，未列出任何模型'
    return attempt
  }
  const lowered = String(modelName || '').toLowerCase()
  const matched = list.find(item => String(item?.id || '').toLowerCase() === lowered)
    || list.find(item => String(item?.name || '').toLowerCase() === lowered)
    || null
  if (!matched) {
    attempt.error = `在返回的 ${list.length} 个模型中未找到与「${modelName}」匹配的 id 或 name`
    return attempt
  }
  attempt.ok = true
  attempt.modelInfo = matched
  return attempt
}

async function detectModelCapabilitiesFromApi(provider, modelName) {
  const normalizedBaseUrl = normalizeProviderBaseUrl(provider.url)
  const trimmedName = String(modelName || '').trim()
  const emptyCaps = {
    contextWindow: null,
    maxTokens: null,
    reasoningMode: null,
    inputTypes: null
  }

  if (!normalizedBaseUrl) {
    return {
      success: false,
      message: '供应商 URL 为空，无法探测',
      capabilities: null,
      probeDebug: { phase: 'validation', reason: 'empty_base_url' }
    }
  }
  if (!trimmedName) {
    return {
      success: false,
      message: '模型 ID 为空，无法探测',
      capabilities: null,
      probeDebug: { phase: 'validation', reason: 'empty_model_name' }
    }
  }

  const headers = buildModelsListHeaders(provider.apiKey, provider.apiType)
  const candidateUrls = Array.from(new Set([
    `${normalizedBaseUrl}/models`,
    `${normalizedBaseUrl}/v1/models`
  ]))

  try {
    const attempts = []
    let modelInfo = null
    for (const candidateUrl of candidateUrls) {
      const attempt = await fetchModelInfoAttemptViaHttp(candidateUrl, headers, trimmedName)
      attempts.push(attempt)
      if (attempt.ok && attempt.modelInfo) {
        modelInfo = attempt.modelInfo
        break
      }
    }

    const probeMeta = {
      baseUrl: normalizedBaseUrl,
      modelName: trimmedName,
      candidateUrls
    }

    if (!modelInfo) {
      return {
        success: false,
        message: '无法匹配模型或接口未返回有效列表',
        capabilities: emptyCaps,
        probeDebug: {
          ...probeMeta,
          attempts
        }
      }
    }

    const capability = extractCapabilityFromModelInfo(modelInfo) || {}
    const contextWindow = capability.contextWindow ?? null
    const maxTokens = capability.maxTokens ?? null

    if (!contextWindow && !maxTokens) {
      return {
        success: false,
        message: '已匹配模型，但未解析到 Context / Max Tokens',
        capabilities: emptyCaps,
        probeDebug: {
          ...probeMeta,
          attempts,
          matchedModelInfo: modelInfo
        }
      }
    }

    return {
      success: true,
      message: '探测成功',
      capabilities: {
        contextWindow,
        maxTokens,
        reasoningMode: inferReasoningMode(trimmedName),
        inputTypes: inferInputTypes(trimmedName)
      },
      probeDebug: {
        ...probeMeta,
        attempts,
        matchedModelInfo: modelInfo
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `探测失败: ${error.message}`,
      capabilities: null,
      probeDebug: {
        phase: 'exception',
        message: error.message,
        stack: error.stack ? String(error.stack) : null
      }
    }
  }
}

/** 发送一条最小对话请求验证模型是否可用；成功/失败在渲染进程判断 */
async function checkModelViaHttp(provider, modelName) {
  const fullUrl = joinUrl(provider.url, provider.endpoint)
  const headers = { 'Content-Type': 'application/json' }
  if (provider.apiType === 'anthropic') {
    if (provider.apiKey) headers['x-api-key'] = provider.apiKey
  } else if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`
  }
  const requestBody = {
    model: modelName,
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 10
  }
  const res = await fetchHttpLogged({
    url: fullUrl,
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    timeoutMs: 60000
  })
  if (!res.ok) {
    return { success: false, message: `请求失败: ${res.error}`, details: null }
  }
  let data = null
  try {
    data = res.body ? JSON.parse(res.body) : null
  } catch (e) {
    return {
      success: false,
      message: `响应不是合法 JSON: ${e.message}`,
      details: res.body
    }
  }
  if (res.status >= 200 && res.status < 300) {
    return { success: true, message: '模型可用', details: data }
  }
  const errMsg = data?.error?.message || res.statusText || `HTTP ${res.status}`
  return { success: false, message: `模型不可用: ${errMsg}`, details: data }
}
