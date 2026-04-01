class OpenClawManualExporter extends window.BaseExporter {
  constructor() {
    super('openclaw-manual', 'OpenClaw - 手动（推荐）')
  }

  normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '')
  }

  normalizeEndpoint(endpoint) {
    const value = String(endpoint || '')
    if (!value) return ''
    return value.startsWith('/') ? value : `/${value}`
  }

  joinUrl(url, endpoint) {
    return `${this.normalizeUrl(url)}${this.normalizeEndpoint(endpoint)}`
  }

  toProviderKey(name, apiType) {
    const normalizedName = (name || 'provider')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `${normalizedName || 'provider'}-${apiType || 'openai'}`
  }

  resolveModelOptions(config) {
    return {
      contextWindow: Number.isFinite(config.modelContextWindow) ? config.modelContextWindow : null,
      maxTokens: Number.isFinite(config.modelMaxTokens) ? config.modelMaxTokens : null,
      reasoning: typeof config.modelReasoningMode === 'boolean' ? config.modelReasoningMode : null,
      input: Array.isArray(config.modelInputTypes) && config.modelInputTypes.length > 0 ? config.modelInputTypes : null
    }
  }

  buildProviders(configs) {
    const providers = {}
    configs.forEach(config => {
      const providerId = String(config.providerId || '').trim()
      const providerName = config.providerName
      const providerKey = providerId || this.toProviderKey(providerName, config.providerApiType)
      const apiName = config.providerApiType === 'anthropic' ? 'anthropic-messages' : 'openai-completions'
      if (!providers[providerKey]) {
        providers[providerKey] = {
          baseUrl: this.joinUrl(config.providerUrl, config.providerEndpoint),
          api: apiName,
          apiKey: config.providerApiKey || 'sk-xxx',
          models: []
        }
      }

      const modelOptions = this.resolveModelOptions(config)
      const model = {
        id: config.modelId,
        name: config.modelId
      }
      if (modelOptions.contextWindow != null) model.contextWindow = modelOptions.contextWindow
      if (modelOptions.maxTokens != null) model.maxTokens = modelOptions.maxTokens
      if (modelOptions.reasoning != null) model.reasoning = modelOptions.reasoning
      if (modelOptions.input != null) model.input = modelOptions.input
      providers[providerKey].models.push(model)
    })
    return providers
  }

  buildAuthProfiles(providers) {
    const profiles = {}
    Object.keys(providers).forEach(providerKey => {
      profiles[`${providerKey}-profile`] = {
        type: 'api_key',
        provider: providerKey,
        key: providers[providerKey].apiKey || 'sk-xxx'
      }
    })
    return {
      profiles
    }
  }

  buildOpenclawConfig(providers) {
    const providerKeys = Object.keys(providers)
    const modelRefs = {}
    providerKeys.forEach(providerKey => {
      const models = providers[providerKey]?.models || []
      models.forEach(model => {
        modelRefs[`${providerKey}/${model.id}`] = {}
      })
    })

    const modelKeys = Object.keys(modelRefs)
    return {
      auth: {
        profiles: providerKeys.reduce((acc, providerKey) => {
          acc[`${providerKey}-profile`] = {
            provider: providerKey,
            mode: 'api_key'
          }
          return acc
        }, {})
      },
      agents: {
        defaults: {
          model: {
            primary: modelKeys[0] || '',
            fallbacks: modelKeys.slice(1)
          },
          models: modelRefs
        }
      }
    }
  }

  export(configs) {
    const providers = this.buildProviders(configs)
    const authProfiles = this.buildAuthProfiles(providers)
    const openclawConfig = this.buildOpenclawConfig(providers)

    const content = [
      '依次修改以下三个文件，保存后运行 `openclaw gateway restart` 重启 OpenClaw 即可生效。',
      '',
      '- **其中 profile 和 provider 的名字可以修改，但需要保持一致。**',
      '- **为了避免自定义 provider 命名冲突，建议使用这里的手动方式配置OpenClaw**',
      '',
      '## `~/.openclaw/agents/main/agent/auth-profiles.json`',
      '```json',
      JSON.stringify(authProfiles, null, 2),
      '```',
      '',
      '## `~/.openclaw/agents/main/agent/models.json`',
      '```json',
      JSON.stringify({ providers }, null, 2),
      '```',
      '',
      '## `~/.openclaw/openclaw.json`',
      '```json',
      JSON.stringify(openclawConfig, null, 2),
      '```'
    ].join('\n')
    return [
      {
        title: `#1 ${configs[0]?.providerName || 'Provider'} / ${configs[0]?.modelId} (+${Math.max(0, configs.length - 1)} 项)`,
        type: 'markdown',
        content
      }
    ]
  }
}

window.ExporterRegistry.registerExporter(new OpenClawManualExporter())
