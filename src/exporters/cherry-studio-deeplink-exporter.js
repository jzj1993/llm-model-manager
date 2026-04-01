class CherryStudioDeeplinkExporter extends window.BaseExporter {
  constructor() {
    super('cherry-studio-deeplink', 'Cherry Studio - Deep Link')
  }

  encodeConfig(obj) {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj)))))
  }

  buildUrl(ctx) {
    const payload = {
      id: ctx.provider,
      baseUrl: ctx.baseUrl,
      apiKey: ctx.apiKey
    }
    const encoded = this.encodeConfig(payload)
    return `cherrystudio://providers/api-keys?v=1&data=${encoded}`
  }

  export(configs) {
        return configs.map((config, index) => {
      const ctx = buildImportContext(config)
      return {
        title: `#${index + 1} ${config.providerName} / ${config.modelId}`,
        content: this.buildUrl(ctx),
        type: 'deeplink'
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new CherryStudioDeeplinkExporter())
