const exporterRegistry = new Map()

function registerExporter(exporter) {
  exporterRegistry.set(exporter.id, exporter)
}

function getExporter(id) {
  return exporterRegistry.get(id)
}

function getAllExporters() {
  return Array.from(exporterRegistry.values())
}

window.ExporterRegistry = {
  registerExporter,
  getExporter,
  getAllExporters
}
