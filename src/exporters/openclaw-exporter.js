class OpenClawExporter extends window.BaseExporter {
  constructor() {
    super('openclaw-json', 'OpenClaw（JSON）', 'json')
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

  buildProvider(config) {
    const providerKey = this.toProviderKey(config.name, config.apiType)
    const apiName = config.apiType === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
    const modelOptions = this.resolveModelOptions(config)
    return {
      key: providerKey,
      value: {
        baseUrl: this.joinUrl(config.url, config.endpoint),
        api: apiName,
        apiKey: config.apiKey || 'xxx',
        models: [
          {
            id: config.modelName,
            name: config.modelName,
            contextWindow: modelOptions.contextWindow,
            maxTokens: modelOptions.maxTokens,
            reasoning: modelOptions.reasoning,
            input: modelOptions.input
          }
        ]
      }
    }
  }

  resolveModelOptions(config) {
    const defaults = window.ModelDefaults.getDefaultModelOptions(config.modelName)
    return {
      contextWindow: config.contextWindow || defaults.contextWindow,
      maxTokens: config.maxTokens || defaults.maxTokens,
      reasoning: config.reasoningMode == null ? defaults.reasoning : config.reasoningMode,
      input: Array.isArray(config.inputTypes) && config.inputTypes.length > 0 ? config.inputTypes : defaults.input
    }
  }

  export(configs) {
    const providers = {}
    configs.forEach(config => {
      const provider = this.buildProvider(config)
      providers[provider.key] = provider.value
    })
    return JSON.stringify({ providers }, null, 2)
  }
}

window.ExporterRegistry.registerExporter(new OpenClawExporter())
