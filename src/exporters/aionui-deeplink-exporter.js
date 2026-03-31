class AionUIDeeplinkExporter extends window.BaseExporter {
  constructor() {
    super('aionui-deeplink', 'AionUI - Deep Link')
  }

  encodeConfig(obj) {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj)))))
  }

  buildUrl(ctx) {
    const payload = {
      platform: ctx.provider,
      baseUrl: ctx.baseUrl,
      apiKey: ctx.apiKey
    }
    const encoded = this.encodeConfig(payload)
    return `aionui://provider/add?v=1&data=${encoded}`
  }

  export(configs) {
        return configs.map((config, index) => {
      const ctx = buildImportContext(config)
      return {
        title: `#${index + 1} ${config.providerName} / ${config.modelName}`,
        content: this.buildUrl(ctx),
        type: 'deeplink'
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new AionUIDeeplinkExporter())
