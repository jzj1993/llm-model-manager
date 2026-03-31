class OpenClawCliExporter extends window.BaseExporter {
  constructor() {
    super('openclaw-cli', 'OpenClaw（命令行）', 'bash')
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
      const providerKey = this.toProviderKey(config.name, config.apiType)
      const apiName = config.apiType === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
      const modelOptions = this.resolveModelOptions(config)
      providers[providerKey] = {
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
    })
    return providers
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
    const providers = this.buildProviders(configs)
    const payload = JSON.stringify(providers, null, 2)
    return [
      "cat <<'EOF' > openclaw-providers.json",
      payload,
      'EOF',
      'openclaw config set models.providers "$(cat openclaw-providers.json)" --strict-json',
      'openclaw config validate'
    ].join('\n')
  }
}

window.ExporterRegistry.registerExporter(new OpenClawCliExporter())
