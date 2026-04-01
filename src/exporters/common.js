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

class EnvWrappedExporter extends BaseExporter {
  constructor(innerExporter) {
    super(innerExporter.id, innerExporter.displayName)
    this.innerExporter = innerExporter
  }

  export(configs) {
    const exportResult = this.innerExporter.export(configs)
    if (Array.isArray(exportResult)) {
      return exportResult.map(entry => this.wrapEnvEntry(entry))
    }
    return this.wrapEnvEntry(exportResult)
  }

  wrapEnvEntry(entry) {
    if (!entry || entry.type !== 'env') return entry
    const payload = JSON.parse(String(entry.content || '{}'))
    const vars = payload?.vars && typeof payload.vars === 'object' ? payload.vars : {}
    return {
      ...entry,
      type: 'command',
      content: this.buildEnvCommandFromVars(vars)
    }
  }

  quoteForSingleShell(value) {
    return `'${String(value || '').replace(/'/g, `'\"'\"'`)}'`
  }

  buildEnvCommandFromVars(vars) {
    const entries = Object.entries(vars || {})
      .filter(([key]) => /^[A-Z_][A-Z0-9_]*$/.test(String(key || '')))

    if (entries.length === 0) {
      throw new Error('环境变量为空')
    }

    const setEnvCommands = entries
      .map(([key, value]) => `set_env "$HOME/.llm_model_mgr_env" ${this.quoteForSingleShell(key)} ${this.quoteForSingleShell(String(value ?? ''))}`)
      .join('\n')

    return `#!/usr/bin/env bash
set -euo pipefail

backup_if_exists() {
  local file_path="$1"
  [ -f "$file_path" ] && cp "$file_path" "$file_path.bak"
}

set_env() {
  local file_path="$1"
  local key="$2"
  local value="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  touch "$file_path"
  cp "$file_path" "$tmp_file"
  sed -E "/^[[:space:]]*export[[:space:]]+\${key}=.*/d" "$tmp_file" > "$tmp_file.next"
  mv "$tmp_file.next" "$tmp_file"
  [ -s "$tmp_file" ] && echo >> "$tmp_file"
  printf "export %s=%q\\n" "$key" "$value" >> "$tmp_file"
  mv "$tmp_file" "$file_path"
}

ensure_source_line() {
  local rc_file="$1"
  local line="$2"
  [ -f "$rc_file" ] || return 0
  if ! rg -Fx -- "$line" "$rc_file" >/dev/null 2>&1; then
    backup_if_exists "$rc_file"
    printf "\\n%s\\n" "$line" >> "$rc_file"
  fi
}

backup_if_exists "$HOME/.llm_model_mgr_env"
${setEnvCommands}
ensure_source_line "\${ZDOTDIR:-$HOME}/.zshrc" 'source ~/.llm_model_mgr_env'
ensure_source_line "$HOME/.bashrc" 'source ~/.llm_model_mgr_env'
ensure_source_line "$HOME/.bash_profile" 'source ~/.llm_model_mgr_env'
ensure_source_line "$HOME/.profile" 'source ~/.llm_model_mgr_env'

echo "已写入: ~/.llm_model_mgr_env"
echo "如有原文件，备份为: ~/.llm_model_mgr_env.bak"
echo "已确保常见 RC 文件包含: source ~/.llm_model_mgr_env"
echo "已处理: \${ZDOTDIR:-$HOME}/.zshrc, $HOME/.bashrc, $HOME/.bash_profile, $HOME/.profile"`
  }
}

// Exporter registry
const exporterRegistry = new Map()

function registerExporter(exporter) {
  const wrapped = exporter instanceof EnvWrappedExporter
    ? exporter
    : new EnvWrappedExporter(exporter)
  exporterRegistry.set(wrapped.id, wrapped)
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
  const provider = String(config?.providerName || 'provider').trim() || 'provider'
  return {
    fullKey: String(config?.providerApiKey || config?.apiKey || '').trim().replace(/^sk-/, ''),
    apiKey: toSkApiKey(config?.providerApiKey || config?.apiKey),
    baseUrl: normalizeUrl(config?.providerUrl || config?.url),
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
