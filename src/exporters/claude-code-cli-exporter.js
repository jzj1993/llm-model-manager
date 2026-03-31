class ClaudeCodeCliExporter extends window.BaseExporter {
  constructor() {
    super('claude-code-cli', 'Claude Code - 命令行')
  }

  export(configs) {
        return configs.map((config, index) => {
      const ctx = buildImportContext(config)
      const escapedBase = ctx.baseUrl.replace(/"/g, '\\"')
      const escapedKey = ctx.apiKey.replace(/"/g, '\\"')
      return {
        title: `#${index + 1} ${config.providerName} / ${config.modelName}`,
        content: [
          `export ANTHROPIC_BASE_URL="${escapedBase}"`,
          `export ANTHROPIC_AUTH_TOKEN="${escapedKey}"`
        ].join('\n'),
        type: 'command'
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new ClaudeCodeCliExporter())
