function withModelRuntimeState(model) {
  return {
    ...model,
    status: model.status || 'pending',
    lastCheck: model.lastCheck || null,
    lastMessage: model.lastMessage || null
  }
}

function toPersistentProvider(provider) {
  return {
    name: provider.name,
    apiType: provider.apiType,
    url: provider.url,
    endpoint: provider.endpoint,
    apiKey: provider.apiKey,
    models: provider.models.map(model => ({
      name: model.name,
      modelName: model.modelName,
      contextWindow: model.contextWindow ?? null,
      maxTokens: model.maxTokens ?? null,
      reasoningMode: model.reasoningMode ?? null,
      inputTypes: model.inputTypes ?? null
    }))
  }
}

function loadConfigs() {
  const saved = localStorage.getItem('modelCheckerProviders')
  if (!saved) {
    providers = []
    return
  }
  const parsed = JSON.parse(saved)
  providers = Array.isArray(parsed)
    ? parsed.map(provider => ({
      ...provider,
      models: Array.isArray(provider.models) ? provider.models.map(withModelRuntimeState) : []
    }))
    : []
}

function saveConfigs() {
  const persistedProviders = providers.map(toPersistentProvider)
  localStorage.setItem('modelCheckerProviders', JSON.stringify(persistedProviders))
}

function renderInputHistories() {
  const modelHistory = Array.from(new Set(
    providers.flatMap(provider => provider.models.map(model => model.modelName)).filter(Boolean)
  ))
  const urlHistory = Array.from(new Set(providers.map(item => item.url).filter(Boolean)))
  const endpointHistory = Array.from(new Set(providers.map(item => item.endpoint).filter(Boolean)))

  const modelHistoryList = document.getElementById('modelNameHistory')
  const urlHistoryList = document.getElementById('urlHistory')
  const endpointHistoryList = document.getElementById('endpointHistory')

  if (modelHistoryList) {
    modelHistoryList.innerHTML = modelHistory.map(value => `<option value="${value}"></option>`).join('')
  }
  if (urlHistoryList) {
    urlHistoryList.innerHTML = urlHistory.map(value => `<option value="${value}"></option>`).join('')
  }
  if (endpointHistoryList) {
    endpointHistoryList.innerHTML = endpointHistory.map(value => `<option value="${value}"></option>`).join('')
  }
}

function updateDefaults() {
  const apiType = document.getElementById('apiType').value
  const urlInput = document.getElementById('url')
  const endpointInput = document.getElementById('endpoint')

  const applyDefault = (input, placeholder, defaultValue, defaultValues) => {
    input.placeholder = placeholder
    const currentValue = input.value.trim()
    if (defaultValues.includes(currentValue)) {
      input.value = defaultValue
    }
  }

  const urlDefaults = ['https://api.anthropic.com', 'https://api.openai.com/v1', '']
  const endpointDefaults = ['/v1/messages', '/chat/completions', '']

  if (apiType === 'anthropic') {
    applyDefault(urlInput, 'https://api.anthropic.com', 'https://api.anthropic.com', urlDefaults)
    applyDefault(endpointInput, '/v1/messages', '/v1/messages', endpointDefaults)
  } else {
    applyDefault(urlInput, 'https://api.openai.com/v1', 'https://api.openai.com/v1', urlDefaults)
    applyDefault(endpointInput, '/chat/completions', '/chat/completions', endpointDefaults)
  }
}

function initExportOptions() {
  // 导出格式在弹窗内动态渲染，这里保留空实现以兼容初始化流程。
}

function getSelectedConfigs() {
  const items = []
  for (const key of selectedModelKeys) {
    const [providerIndexText, modelIndexText] = key.split(':')
    const providerIndex = Number.parseInt(providerIndexText, 10)
    const modelIndex = Number.parseInt(modelIndexText, 10)
    const provider = providers[providerIndex]
    const model = provider?.models?.[modelIndex]
    if (!provider || !model) continue
    items.push({
      name: model.name,
      apiType: provider.apiType,
      url: provider.url,
      endpoint: provider.endpoint,
      modelName: model.modelName,
      apiKey: provider.apiKey,
      contextWindow: model.contextWindow ?? null,
      maxTokens: model.maxTokens ?? null,
      reasoningMode: model.reasoningMode ?? null,
      inputTypes: model.inputTypes ?? null
    })
  }
  return items
}

function renderExportPreview(exporterId) {
  const exporter = window.ExporterRegistry.getExporter(exporterId)
  if (!exporter) return

  const titleEl = document.getElementById('exportTitle')
  const contentEl = document.getElementById('exportCode')
  const typeLabelEl = document.getElementById('exportTypeLabel')
  const formatListEl = document.getElementById('exportFormatList')

  const content = exporter.export(exportModalConfigs)
  contentEl.dataset.raw = content
  contentEl.className = `code-viewer hljs language-${exporter.language}`
  contentEl.innerHTML = window.electronAPI.highlightCode(content, exporter.language)
  typeLabelEl.textContent = exporter.language === 'json' ? 'JSON' : exporter.language === 'bash' ? 'Shell' : '文本'
  titleEl.textContent = exporter.buildTitle(exportModalConfigs.length)

  const exporters = window.ExporterRegistry.getAllExporters()
  formatListEl.innerHTML = exporters
    .map(item => `<button class="export-format-item ${item.id === exporterId ? 'active' : ''}" onclick="selectExportFormat('${escapeHtml(item.id)}')">${escapeHtml(item.displayName)}</button>`)
    .join('')
}

function openExportModal(selectedConfigs) {
  const modal = document.getElementById('exportModal')
  exportModalConfigs = selectedConfigs
  const exporters = window.ExporterRegistry.getAllExporters()
  if (!exporters || exporters.length === 0) {
    alert('未找到导出器')
    return
  }
  renderExportPreview(exporters[0].id)
  modal.classList.add('active')
}

function selectExportFormat(exporterId) {
  renderExportPreview(exporterId)
}

function closeExportModal() {
  const modal = document.getElementById('exportModal')
  modal.classList.remove('active')
}

async function copyExportContent() {
  const contentEl = document.getElementById('exportCode')
  const raw = contentEl.dataset.raw || contentEl.textContent || ''
  try {
    await navigator.clipboard.writeText(raw)
    alert('已复制到剪贴板')
  } catch (error) {
    const temp = document.createElement('textarea')
    temp.value = raw
    document.body.appendChild(temp)
    temp.select()
    document.execCommand('copy')
    document.body.removeChild(temp)
    alert('已复制到剪贴板')
  }
}

function exportSelectedItems() {
  const selectedConfigs = getSelectedConfigs()
  if (selectedConfigs.length === 0) {
    alert('请先选择至少一个模型')
    return
  }
  openExportModal(selectedConfigs)
}
