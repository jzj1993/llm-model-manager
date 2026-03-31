class CCSwitchExporter extends window.BaseExporter {
  constructor() {
    super('cc-switch-cli', 'CC Switch（命令行）', 'bash')
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

  buildCommand(config) {
    const fullUrl = this.joinUrl(config.url, config.endpoint)
    const escapedApiKey = config.apiKey ? config.apiKey.replace(/'/g, "'\\''") : '<YOUR_API_KEY>'
    return `cc-switch provider add --name "${config.name}" --type "${config.apiType}" --base-url "${fullUrl}" --model "${config.modelName}" --api-key '${escapedApiKey}'`
  }

  export(configs) {
    return configs.map(config => this.buildCommand(config)).join('\n')
  }
}

window.ExporterRegistry.registerExporter(new CCSwitchExporter())
