import { BaseExporter } from './common'

export class AionUIDeeplinkExporter extends BaseExporter {
  constructor() {
    super('aionui-deeplink', 'AionUI - Deep Link')
  }

  encodeDataParam(obj) {
    const json = JSON.stringify(obj || {})
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))))
  }

  // https://github.com/iOfficeAI/AionUi/blob/1495ca102b50e71f98d565ae1c1f76e3a7f56a4c/src/process/utils/deepLink.ts
  // https://github.com/iOfficeAI/AionUi/blob/main/src/renderer/hooks/system/useDeepLink.ts
  buildUrl({ providerId, providerName, baseUrl, apiKey }) {
    const payload = {
      platform: providerId,
      name: providerName,
      baseUrl,
      apiKey
    }
    const encoded = this.encodeDataParam(payload)
    return `aionui://provider/add?v=1&data=${encoded}`
  }

  export(configs) {
    return configs.map((config, index) => {
      const provider = config.provider
      const model = config.model
      const providerId = provider.id
      const providerName = provider.name || providerId
      const modelId = model.id
      const baseUrl = provider.baseUrl
      const apiKey = provider.apiKey
      return {
        title: `#${index + 1} ${providerName} / ${modelId}`,
        content: this.buildUrl({ providerId, providerName, baseUrl, apiKey }),
        type: 'deeplink'
      }
    })
  }
}

