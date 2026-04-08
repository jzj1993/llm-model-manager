import { BaseExporter } from './common'

export class CodexEnvExporter extends BaseExporter {
  constructor() {
    super('codex-env', 'Codex - 环境变量')
    this.entryType = 'env'
  }

  buildEnvPayload({ apiKey, baseUrl, modelId }) {
    return {
      vars: {
        OPENAI_API_KEY: apiKey,
        OPENAI_BASE_URL: baseUrl,
        OPENAI_MODEL: modelId || 'gpt-5.4'
      }
    }
  }

  export(configs) {
    return configs.map((config, index) => {
      const provider = config.provider
      const model = config.model
      const providerId = provider.id
      const providerName = provider.name || providerId
      const modelId = model.id
      const apiKey = provider.apiKey
      const baseUrl = provider.baseUrl
      return {
        title: `#${index + 1} ${providerName} / ${modelId}`,
        content: JSON.stringify(this.buildEnvPayload({ apiKey, baseUrl, modelId }), null, 2),
        type: 'env'
      }
    })
  }
}
