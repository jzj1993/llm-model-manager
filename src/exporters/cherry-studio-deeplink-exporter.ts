import { BaseExporter } from './common'

export class CherryStudioDeeplinkExporter extends BaseExporter {
  constructor() {
    super('cherry-studio-deeplink', 'Cherry Studio - Deep Link')
  }

  encodeConfig(obj) {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(obj)))))
  }

  buildUrl({ providerId, baseUrl, apiKey }) {
    const payload = {
      id: providerId,
      baseUrl,
      apiKey
    }
    const encoded = this.encodeConfig(payload)
    return `cherrystudio://providers/api-keys?v=1&data=${encoded}`
  }

  export(configs) {
    return configs.map((config, index) => {
      const provider = config.provider
      const model = config.model
      const providerId = provider.id
      const providerName = provider.name || providerId
      const modelId = model.id
      const baseUrl = provider.url
      const apiKey = provider.apiKey
      return {
        title: `#${index + 1} ${providerName} / ${modelId}`,
        content: this.buildUrl({ providerId, baseUrl, apiKey }),
        type: 'deeplink'
      }
    })
  }
}

