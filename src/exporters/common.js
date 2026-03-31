// Base exporter contract
class BaseExporter {
  constructor(id, displayName) {
    this.id = id
    this.displayName = displayName
  }

  // export(configs) -> [{ title, type, content }]
  export(_configs) {
    throw new Error('Exporter must implement export(configs)')
  }
}

// Exporter registry
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

// Model defaults
function getDefaultModelOptions(modelName) {
  const id = String(modelName || '').toLowerCase()
  let contextWindow = 128000
  let maxTokens = 8192
  let reasoning = true
  let input = ['text', 'image']

  if (id.includes('haiku') || id.includes('mini') || id.includes('small')) {
    contextWindow = 64000
    maxTokens = 4096
    input = ['text']
  }
  if (id.includes('embedding')) {
    contextWindow = 8192
    maxTokens = 2048
    reasoning = false
    input = ['text']
  }
  if (id.includes('1m') || id.includes('pro')) {
    contextWindow = 1024000
    maxTokens = 32768
  }

  return { contextWindow, maxTokens, reasoning, input }
}

function normalizeUrl(url) {
  return String(url || '').replace(/\/+$/, '')
}

function toSkApiKey(apiKey) {
  const raw = String(apiKey || '').trim()
  if (!raw) return ''
  return raw.startsWith('sk-') ? raw : `sk-${raw}`
}

function buildImportContext(config) {
  const provider = String(config?.providerName || config?.name || 'provider').trim() || 'provider'
  return {
    fullKey: String(config?.apiKey || '').trim().replace(/^sk-/, ''),
    apiKey: toSkApiKey(config?.apiKey),
    baseUrl: normalizeUrl(config?.url),
    model: config?.modelName || '',
    provider
  }
}

function buildFluentPayload(ctx) {
  return { id: ctx.provider, baseUrl: ctx.baseUrl, apiKey: ctx.apiKey, model: ctx.model }
}

window.BaseExporter = BaseExporter
window.ExporterRegistry = { registerExporter, getExporter, getAllExporters }
window.ModelDefaults = { getDefaultModelOptions }
