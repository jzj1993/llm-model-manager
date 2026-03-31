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

  buildPayload(configs) {
    return {
      providers: configs.map(config => ({
        name: config.name,
        type: config.apiType,
        baseUrl: this.joinUrl(config.url, config.endpoint),
        model: config.modelName,
        apiKey: config.apiKey || ''
      }))
    }
  }

  export(configs) {
    const payload = this.buildPayload(configs)
    const base64 = this.toBase64(JSON.stringify(payload))
    const deepLink = `ccswitch://provider/import?config=${encodeURIComponent(base64)}`
    return [
      {
        title: `#1 ${configs[0]?.providerName || 'Provider'} / ${configs[0]?.modelName || 'Model'} (+${Math.max(0, configs.length - 1)} 项)`,
        type: 'deeplink',
        content: deepLink
      }
    ]
  }
}

window.ExporterRegistry.registerExporter(new CCSwitchDeepLinkExporter())
