class ClaudeCodeEnvExporter extends window.BaseExporter {
  constructor() {
    super('claude-code-env', 'Claude Code - 环境变量')
  }

  buildEnvPayload(ctx) {
    return {
      vars: {
        ANTHROPIC_BASE_URL: ctx.baseUrl,
        ANTHROPIC_AUTH_TOKEN: ctx.apiKey
      }
    }
  }

  export(configs) {
    return configs.map((config, index) => {
      const ctx = buildImportContext(config)
      return {
        title: `#${index + 1} ${config.providerName} / ${config.modelId}`,
        content: JSON.stringify(this.buildEnvPayload(ctx), null, 2),
        type: 'env'
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new ClaudeCodeEnvExporter())
