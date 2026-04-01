class OpenCatDeeplinkExporter extends window.BaseExporter {
  constructor() {
    super('opencat-deeplink', 'OpenCat - Deep Link')
  }

  buildUrl(ctx) {
    const domain = encodeURIComponent(ctx.baseUrl)
    return `opencat://team/join?domain=${domain}&token=${ctx.apiKey}`
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

window.ExporterRegistry.registerExporter(new OpenCatDeeplinkExporter())
