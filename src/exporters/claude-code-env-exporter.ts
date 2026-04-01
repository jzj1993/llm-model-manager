import { BaseExporter } from './common'

export class ClaudeCodeEnvExporter extends BaseExporter {
  constructor() {
    super('claude-code-env', 'Claude Code - 环境变量')
    this.entryType = 'env'
  }

  buildEnvPayload({ baseUrl, apiKey }) {
    return {
      vars: {
        ANTHROPIC_BASE_URL: baseUrl,
        ANTHROPIC_AUTH_TOKEN: apiKey
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
      const baseUrl = provider.url
      const apiKey = provider.apiKey
      return {
        title: `#${index + 1} ${providerName} / ${modelId}`,
        content: JSON.stringify(this.buildEnvPayload({ baseUrl, apiKey }), null, 2),
        type: 'env'
      }
    })
  }
}

