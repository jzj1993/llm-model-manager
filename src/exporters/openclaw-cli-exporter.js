class OpenClawCliExporter extends window.BaseExporter {
  constructor() {
    super('openclaw-cli', 'OpenClaw - 命令行')
  }

  normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '')
  }

  normalizeEndpoint(endpoint) {
    const value = String(endpoint || '')
    if (!value) return ''
    return value.startsWith('/') ? value : `/${value}`
  }

  joinUrl(url, endpoint) {
    return `${this.normalizeUrl(url)}${this.normalizeEndpoint(endpoint)}`
  }

  toProviderKey(name, apiType) {
    const normalizedName = (name || 'provider')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${normalizedName || 'provider'}-${apiType || 'openai'}`
  }

  buildProviders(configs) {
    const providers = {}
    configs.forEach(config => {
      const providerId = String(config.providerId || '').trim()
      const providerName = config.providerName
      const providerKey = providerId || this.toProviderKey(providerName, config.providerApiType)
      const apiName = config.providerApiType === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
      const modelOptions = this.resolveModelOptions(config)
      if (!providers[providerKey]) {
        providers[providerKey] = {
          baseUrl: this.joinUrl(config.providerUrl, config.providerEndpoint),
          api: apiName,
          apiKey: config.providerApiKey || 'xxx',
          models: []
        }
      }
      const model = {
        id: config.modelId,
        name: config.modelId
      }
      if (modelOptions.contextWindow != null) model.contextWindow = modelOptions.contextWindow
      if (modelOptions.maxTokens != null) model.maxTokens = modelOptions.maxTokens
      if (modelOptions.reasoning != null) model.reasoning = modelOptions.reasoning
      if (modelOptions.input != null) model.input = modelOptions.input
      providers[providerKey].models.push(model)
    })
    return providers
  }

  resolveModelOptions(config) {
    return {
      contextWindow: Number.isFinite(config.modelContextWindow) ? config.modelContextWindow : null,
      maxTokens: Number.isFinite(config.modelMaxTokens) ? config.modelMaxTokens : null,
      reasoning: typeof config.modelReasoningMode === 'boolean' ? config.modelReasoningMode : null,
      input: Array.isArray(config.modelInputTypes) && config.modelInputTypes.length > 0 ? config.modelInputTypes : null
    }
  }

  // docs: https://docs.openclaw.ai/cli
  // 文档中的 `openclaw config set <path> <value>` 支持非交互配置写入。
  export(configs) {
    const providers = this.buildProviders(configs)
    const providerKeys = Object.keys(providers)
    const allowedModelIds = providerKeys.flatMap(providerKey => {
      const models = Array.isArray(providers[providerKey]?.models) ? providers[providerKey].models : []
      return models
        .map(model => `${providerKey}/${model.id}`)
        .filter(Boolean)
    })
    const allowedModels = Object.fromEntries(
      allowedModelIds.map(modelId => [modelId, {}])
    )
    const addProviderScripts = providerKeys.map((providerKey, index) => {
      const provider = providers[providerKey]
      const providerPayload = JSON.stringify({
        api: provider.api,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey || 'sk-xxxxxxxxx',
        models: provider.models
      }, null, 2)

      return `# Provider ${index + 1}: ${providerKey}
EXISTING_PROVIDER_JSON="$(openclaw config get models.providers.${providerKey} 2>/dev/null || echo '{}')"
NEW_PROVIDER_JSON="$(cat <<'JSON'
${providerPayload}
JSON
)"
MERGED_PROVIDER_JSON="$(merge_json_objects "$EXISTING_PROVIDER_JSON" "$NEW_PROVIDER_JSON")"
openclaw config set models.providers.${providerKey} "$MERGED_PROVIDER_JSON"
`
    }).join('\n')
    const allowedModelsPayload = JSON.stringify(allowedModels, null, 2)

    const firstProviderKey = providerKeys[0]
    const firstModelId = firstProviderKey && providers[firstProviderKey]?.models?.[0]?.id
      ? `${firstProviderKey}/${providers[firstProviderKey].models[0].id}`
      : ''

    const mergeJsonFunction = `merge_json_objects() {
  local existing_json="\${1:-{}}"
  local new_json="\${2:-{}}"
  EXISTING_JSON="$existing_json" NEW_JSON="$new_json" node -e 'const parse = (s, fallback) => { try { return JSON.parse(s) } catch { return fallback } }; const existing = parse(process.env.EXISTING_JSON || "{}", {}); const next = parse(process.env.NEW_JSON || "{}", {}); const merged = { ...(existing && typeof existing === "object" ? existing : {}), ...(next && typeof next === "object" ? next : {}) }; process.stdout.write(JSON.stringify(merged));'
}
`

    const content = `${mergeJsonFunction}
${addProviderScripts}
# 模型写入允许列表（agents.defaults.models）
EXISTING_MODELS_JSON="$(openclaw config get agents.defaults.models 2>/dev/null || echo '{}')"
NEW_MODELS_JSON="$(cat <<'JSON'
${allowedModelsPayload}
JSON
)"
MERGED_MODELS_JSON="$(merge_json_objects "$EXISTING_MODELS_JSON" "$NEW_MODELS_JSON")"
openclaw config set agents.defaults.models "$MERGED_MODELS_JSON"`

    return [
      {
        title: '步骤1：运行命令导入Provider',
        type: 'command',
        content
      },
      {
        title: '步骤2：设置默认模型（可选）',
        type: 'command',
        content: `openclaw models set "${firstModelId || '<provider>/<model>'}"`
      },
      {
        title: '步骤3：重启网关使配置生效',
        type: 'command',
        content: 'openclaw gateway restart'
      }
    ]
  }
}

window.ExporterRegistry.registerExporter(new OpenClawCliExporter())
