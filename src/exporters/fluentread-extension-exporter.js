class FluentReadExtensionExporter extends window.BaseExporter {
  constructor() {
    super('fluentread-extension', 'FluentRead - 扩展桥接')
  }

  export(configs) {
        return configs.map((config, index) => {
      const payload = buildFluentPayload(buildImportContext(config))
      return {
        title: `#${index + 1} ${config.providerName} / ${config.modelName}`,
        content: [
          "const container = document.getElementById('fluent-model-checker-container')",
          "if (!container) throw new Error('未检测到 FluentRead 扩展容器')",
          `const payload = ${JSON.stringify(payload, null, 2)}`,
          "container.dispatchEvent(new CustomEvent('fluent:prefill', { detail: payload }))"
        ].join('\n'),
        type: null
      }
    })
  }
}

window.ExporterRegistry.registerExporter(new FluentReadExtensionExporter())
