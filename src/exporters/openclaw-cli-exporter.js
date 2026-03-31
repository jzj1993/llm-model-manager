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
      const providerName = config.providerName || config.name
      const providerKey = this.toProviderKey(providerName, config.apiType)
      const apiName = config.apiType === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
      const modelOptions = this.resolveModelOptions(config)
      if (!providers[providerKey]) {
        providers[providerKey] = {
          baseUrl: this.joinUrl(config.url, config.endpoint),
          api: apiName,
          apiKey: config.apiKey || 'xxx',
          models: []
        }
      }
      const model = {
        id: config.modelName,
        name: config.modelName
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
      contextWindow: Number.isFinite(config.contextWindow) ? config.contextWindow : null,
      maxTokens: Number.isFinite(config.maxTokens) ? config.maxTokens : null,
      reasoning: typeof config.reasoningMode === 'boolean' ? config.reasoningMode : null,
      input: Array.isArray(config.inputTypes) && config.inputTypes.length > 0 ? config.inputTypes : null
    }
  }

  export(configs) {
    const providers = this.buildProviders(configs)
    const providerKeys = Object.keys(providers)
    const scripts = providerKeys.map((providerKey, index) => {
      const provider = providers[providerKey]
      const modelJson = JSON.stringify(provider.models)
      return [
        `# Provider ${index + 1}: ${providerKey}`,
        `PROVIDER_NAME="${providerKey}"`,
        `API_BASE_URL="${provider.baseUrl}"`,
        `API_KEY="${provider.apiKey || 'sk-xxxxxxxxx'}"`,
        '',
        'echo "🔧 自动配置自定义 Provider: $PROVIDER_NAME"',
        'openclaw config set "models.providers.$PROVIDER_NAME.baseUrl" "$API_BASE_URL"',
        'openclaw config set "models.providers.$PROVIDER_NAME.apiKey" "$API_KEY"',
        `openclaw config set "models.providers.$PROVIDER_NAME.api" "${provider.api}"`,
        `openclaw config set "models.providers.$PROVIDER_NAME.models" '${modelJson}'`,
        ''
      ].join('\n')
    }).join('\n')

    const firstProviderKey = providerKeys[0]
    const firstModelId = firstProviderKey && providers[firstProviderKey]?.models?.[0]?.id
      ? `${firstProviderKey}/${providers[firstProviderKey].models[0].id}`
      : ''

    const content = [
      scripts,
      firstModelId ? `openclaw config set "agents.defaults.model.primary" "${firstModelId}"` : '',
      '# 统一重启网关生效',
      'openclaw gateway restart'
    ].join('\n')

    return [
      {
        title: `#1 ${configs[0]?.providerName || 'Provider'} / ${configs[0]?.modelName || 'Model'} (+${Math.max(0, configs.length - 1)} 项)`,
        type: 'command',
        content
      }
    ]
  }
}

window.ExporterRegistry.registerExporter(new OpenClawCliExporter())
