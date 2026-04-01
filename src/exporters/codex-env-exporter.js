class CodexEnvExporter extends window.BaseExporter {
  constructor() {
    super('codex-env', 'Codex - 环境变量')
  }

  buildEnvPayload(ctx) {
    return {
      vars: {
        OPENAI_API_KEY: ctx.apiKey,
        OPENAI_BASE_URL: ctx.baseUrl,
        OPENAI_MODEL: ctx.model || 'gpt-5.4'
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

window.ExporterRegistry.registerExporter(new CodexEnvExporter())
