class CodexCliExporter extends window.BaseExporter {
  constructor() {
    super('codex-cli', 'Codex - 命令行')
  }

  export(configs) {
    return configs.map((config, index) => {
      const ctx = buildImportContext(config)
      const escapedBase = ctx.baseUrl.replace(/"/g, '\\"')
      const escapedModel = String(ctx.model || '').replace(/"/g, '\\"')
      return {
        title: `#${index + 1} ${config.providerName} - ${config.modelId}`,
        content: [
          'mkdir -p ~/.codex',
          '[ -f ~/.codex/auth.json ] && cp ~/.codex/auth.json ~/.codex/auth.json.bak',
          '[ -f ~/.codex/config.toml ] && cp ~/.codex/config.toml ~/.codex/config.toml.bak',
          "cat <<'EOF' > ~/.codex/auth.json",
          JSON.stringify({ OPENAI_API_KEY: ctx.apiKey }, null, 2),
          'EOF',
          "cat <<'EOF' > ~/.codex/config.toml",
          `model = "${escapedModel || 'gpt-5.4'}"`,
          '[providers.default]',
          `base_url = "${escapedBase}"`,
          'EOF'
        ].join('\n'),
        type: 'command'
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new CodexCliExporter())
