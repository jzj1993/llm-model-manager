class AMADeeplinkExporter extends window.BaseExporter {
  constructor() {
    super('ama-deeplink', 'AMA 问天 - Deep Link')
  }

  buildUrl(ctx) {
    const server = encodeURIComponent(ctx.baseUrl)
    return `ama://set-api-key?server=${server}&key=${ctx.apiKey}`
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

window.ExporterRegistry.registerExporter(new AMADeeplinkExporter())
