class BaseExporter {
  constructor(id, displayName, language = 'plaintext') {
    this.id = id
    this.displayName = displayName
    this.language = language
  }

  buildTitle(count) {
    return `导出到 ${this.displayName} (${count} 项)`
  }

  export(_configs) {
    throw new Error('Exporter must implement export(configs)')
  }
}

window.BaseExporter = BaseExporter
