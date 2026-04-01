import { BaseExporter } from './common'

export class CodexCliExporter extends BaseExporter {
  constructor() {
    super('codex-cli', 'Codex - 命令行')
  }

  export(configs) {
    return configs.map((config, index) => {
      const provider = config.provider
      const model = config.model
      const providerId = provider.id
      const providerName = provider.name || providerId
      const apiKey = provider.apiKey
      const baseUrl = provider.url
      const modelId = model.id
      return {
        title: `#${index + 1} ${providerName} - ${modelId}`,
        content: [
          'mkdir -p ~/.codex',
          '[ -f ~/.codex/auth.json ] && cp ~/.codex/auth.json ~/.codex/auth.json.bak',
          '[ -f ~/.codex/config.toml ] && cp ~/.codex/config.toml ~/.codex/config.toml.bak',
          "cat <<'EOF' > ~/.codex/auth.json",
          JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2),
          'EOF',
          "cat <<'EOF' > ~/.codex/config.toml",
          `model = "${modelId}"`,
          '[providers.default]',
          `base_url = "${baseUrl}"`,
          'EOF'
        ].join('\n'),
        type: 'command'
      }
    })
  }
}
