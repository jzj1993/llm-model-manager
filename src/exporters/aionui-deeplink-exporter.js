class AionUIDeeplinkExporter extends window.BaseExporter {
  constructor() {
    super('aionui-deeplink', 'AionUI - Deep Link')
  }

  encodeDataParam(obj) {
    const json = JSON.stringify(obj || {})
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))))
  }

  // https://github.com/iOfficeAI/AionUi/blob/1495ca102b50e71f98d565ae1c1f76e3a7f56a4c/src/process/utils/deepLink.ts
  // https://github.com/iOfficeAI/AionUi/blob/main/src/renderer/hooks/system/useDeepLink.ts
  buildUrl(ctx) {
    const payload = {
      platform: ctx.provider,
      name: ctx.providerName,
      baseUrl: ctx.baseUrl,
      apiKey: ctx.apiKey,
    }
    const encoded = this.encodeDataParam(payload)
    return `aionui://provider/add?v=1&data=${encoded}`
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

window.ExporterRegistry.registerExporter(new AionUIDeeplinkExporter())
