class CCSwitchDeepLinkExporter extends window.BaseExporter {
  constructor() {
    super('cc-switch-deeplink', 'CC Switch - Deep Link')
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

  toBase64(text) {
    return btoa(unescape(encodeURIComponent(text)))
  }

  /**
   * CC Switch Deep Link v1 文档（官方）：
   * https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/en/5-faq/5.3-deeplink.md
   *
   * v1 provider 导入格式：
   * ccswitch://v1/import?resource=provider&app={app}&name={name}&...
   *
   * 这里遵循文档中的必填参数：
   * - resource=provider
   * - app=claude/codex/...
   * - name=Provider 名称
   */
  resolveApp(config) {
    // 约定：Anthropic 优先导入到 Claude；其余 OpenAI 兼容优先导入到 Codex
    return config.providerApiType === 'anthropic' ? 'claude' : 'codex'
  }

  buildProviderParams(config) {
    const endpoint = this.joinUrl(config.providerUrl, config.providerEndpoint)
    const providerName = String(config.providerName || config.providerId || 'Provider').trim() || 'Provider'
    const params = new URLSearchParams({
      resource: 'provider',
      app: this.resolveApp(config),
      name: providerName
    })

    if (endpoint) params.set('endpoint', endpoint)
    if (config.providerApiKey) params.set('apiKey', String(config.providerApiKey))
    if (config.modelId) params.set('model', String(config.modelId))

    // 为兼容更多场景，同时附带 JSON 配置（文档中 provider 支持 config + configFormat）
    const providerConfig = {
      type: config.providerApiType,
      endpoint,
      apiKey: config.providerApiKey || '',
      model: config.modelId || ''
    }
    params.set('config', this.toBase64(JSON.stringify(providerConfig)))
    params.set('configFormat', 'json')

    return params
  }

  export(configs) {
    return configs.map((config, index) => {
      const params = this.buildProviderParams(config)
      const deepLink = `ccswitch://v1/import?${params.toString()}`
      return {
        title: `#${index + 1} ${config.providerName || 'Provider'} / ${config.modelId}`,
        type: 'deeplink',
        content: deepLink
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new CCSwitchDeepLinkExporter())
