import { BaseExporter } from './common'

export class OpenCatDeeplinkExporter extends BaseExporter {
  constructor() {
    super('opencat-deeplink', 'OpenCat - Deep Link')
  }

  buildUrl({ baseUrl, apiKey }) {
    const domain = encodeURIComponent(baseUrl)
    return `opencat://team/join?domain=${domain}&token=${apiKey}`
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
        content: this.buildUrl({ baseUrl, apiKey }),
        type: 'deeplink'
      }
    })
  }
}

