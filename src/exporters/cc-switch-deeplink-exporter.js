class CCSwitchDeepLinkExporter extends window.BaseExporter {
  constructor() {
    super('cc-switch-deeplink', 'CC Switch（Deep Link）', 'plaintext')
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
      '# Deep Link（实验格式，需根据 CC Switch 实际协议验证）',
      deepLink
    ].join('\n')
  }
}

window.ExporterRegistry.registerExporter(new CCSwitchDeepLinkExporter())
