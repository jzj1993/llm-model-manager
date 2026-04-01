// Base exporter contract
export class BaseExporter {
  constructor(id, displayName) {
    this.id = id
    this.displayName = displayName
  }

  // export(configs) -> [{ title, type, content }]
  export(_configs) {
    throw new Error('Exporter must implement export(configs)')
  }
}
