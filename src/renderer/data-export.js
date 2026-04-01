function withModelRuntimeState(model) {
  return {
    ...model,
    status: model.status || 'pending',
    lastCheck: model.lastCheck || null,
    lastMessage: model.lastMessage || null
  }
}

function toPersistentProvider(provider) {
  const providerId = String(provider.providerId || '').trim()
  const providerName = String(provider.name || providerId).trim()
  return {
    providerId,
    name: providerName,
    apiType: provider.apiType,
    url: provider.url,
    endpoint: provider.endpoint,
    website: provider.website || '',
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
      providerId: String(provider.providerId || provider.name || '').trim(),
      name: String(provider.name || provider.providerId || '').trim(),
      models: Array.isArray(provider.models) ? provider.models.map(withModelRuntimeState) : []
    }))
    : []
}

function saveConfigs() {
  const persistedProviders = providers.map(toPersistentProvider)
  localStorage.setItem('modelCheckerProviders', JSON.stringify(persistedProviders))
}

function renderProviderUrlEndpointPresetOptions() {
  const providerPresets = Array.isArray(window.PROVIDER_PRESETS) ? window.PROVIDER_PRESETS : []
  const urls = Array.from(
    new Set(
      providerPresets
        .map(item => normalizeUrl(String(item.url || '').trim()))
        .filter(Boolean)
    )
  )
  const endpoints = Array.from(
    new Set(
      providerPresets
        .map(item => normalizeEndpoint(String(item.endpoint || '').trim()))
        .filter(Boolean)
    )
  )

  setComboboxOptions('url', urls.map(value => ({ value, label: value })))
  setComboboxOptions('endpoint', endpoints.map(value => ({ value, label: value })))
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

function getActionButtonText(type) {
  if (type === 'command') return '在命令行运行'
  if (type === 'deeplink') return '调起应用'
  if (type === 'javascript') return '在浏览器运行'
  return null
}

function isRunnableType(type) {
  return type === 'command' || type === 'deeplink' || type === 'javascript'
}

function getRenderLanguageFromType(type) {
  if (type === 'command') return 'bash'
  if (type === 'deeplink') return 'plaintext'
  if (type === 'json') return 'json'
  if (type === 'markdown') return 'markdown'
  if (type === 'bash') return 'bash'
  if (type === 'javascript') return 'javascript'
  return 'plaintext'
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
      providerId: provider.providerId,
      providerName: provider.name || provider.providerId,
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

async function renderExportPreview(exporterId) {
  const exporter = window.ExporterRegistry.getExporter(exporterId)
  if (!exporter) return

  const titleEl = document.getElementById('exportTitle')
  const contentEl = document.getElementById('exportCode')
  const entriesEl = document.getElementById('exportEntries')
  const formatListEl = document.getElementById('exportFormatList')
  const runButtonEl = document.getElementById('runExportActionButton')
  const copyButtonEl = document.getElementById('copyExportContentButton')

  const exportResult = exporter.export(exportModalConfigs)
  exportEntryItems = Array.isArray(exportResult)
    ? exportResult.map((entry, index) => ({
      title: entry?.title || `#${index + 1} ${exportModalConfigs[index]?.providerName || 'Provider'} / ${exportModalConfigs[index]?.modelName || 'Model'}`,
      content: String(entry?.content || ''),
      type: entry?.type || null
    }))
    : [{
      title: '#1 Provider / Model',
      content: String(exportResult || ''),
      type: 'plaintext'
    }]

  if (exportEntryItems.length > 1) {
    contentEl.style.display = 'none'
    entriesEl.style.display = 'flex'
    entriesEl.innerHTML = exportEntryItems.map((entry, index) => {
      const renderLanguage = getRenderLanguageFromType(entry.type)
      const body = window.electronAPI.highlightCode(String(entry.content || ''), renderLanguage)
      return [
        '<div class="export-entry-item">',
        `<div class="export-entry-title">${escapeHtml(entry.title || `#${index + 1}`)}</div>`,
        `<pre class="export-entry-code hljs language-${renderLanguage}">${body}</pre>`,
        '<div class="export-entry-actions">',
        `<button class="button" onclick="copyExportEntry(${index})">复制</button>`,
        isRunnableType(entry.type) ? `<button class="button button-success" onclick="runExportEntry(${index})">${getActionButtonText(entry.type)}</button>` : '',
        '</div>',
        '</div>'
      ].join('')
    }).join('')
    if (copyButtonEl) copyButtonEl.style.display = 'none'
    if (runButtonEl) runButtonEl.style.display = 'none'
  } else {
    entriesEl.style.display = 'none'
    entriesEl.innerHTML = ''
    const singleEntry = exportEntryItems[0] || null
    const content = singleEntry ? singleEntry.content : String(exportResult || '')
    const singleType = singleEntry ? singleEntry.type : null
    const singleRenderLanguage = getRenderLanguageFromType(singleType)
    contentEl.style.display = 'block'
    contentEl.dataset.raw = content
    if (singleRenderLanguage === 'markdown') {
      contentEl.className = 'markdown-view markdown-body'
      contentEl.innerHTML = await window.electronAPI.renderMarkdown(content)
    } else {
      contentEl.className = `code-viewer hljs language-${singleRenderLanguage}`
      contentEl.innerHTML = window.electronAPI.highlightCode(content, singleRenderLanguage)
    }
    if (copyButtonEl) copyButtonEl.style.display = 'inline-flex'

    if (runButtonEl) {
      if (isRunnableType(singleType)) {
        runButtonEl.textContent = getActionButtonText(singleType)
        runButtonEl.dataset.type = singleType
        runButtonEl.style.display = 'inline-flex'
      } else {
        runButtonEl.textContent = ''
        runButtonEl.dataset.type = ''
        runButtonEl.style.display = 'none'
      }
    }
  }

  titleEl.textContent = `导出到 ${exporter.displayName} (${exportModalConfigs.length} 项)`

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
  void renderExportPreview(exporters[0].id)
  modal.classList.add('active')
}

function selectExportFormat(exporterId) {
  void renderExportPreview(exporterId)
}

function closeExportModal() {
  const modal = document.getElementById('exportModal')
  modal.classList.remove('active')
  exportEntryItems = []
}

async function copyExportContent() {
  const contentEl = document.getElementById('exportCode')
  const raw = contentEl.dataset.raw || contentEl.textContent || ''
  await copyText(raw)
}

function exportSelectedItems() {
  const selectedConfigs = getSelectedConfigs()
  if (selectedConfigs.length === 0) {
    alert('请先选择至少一个模型')
    return
  }
  openExportModal(selectedConfigs)
}

async function runExportAction() {
  const runButtonEl = document.getElementById('runExportActionButton')
  const contentEl = document.getElementById('exportCode')
  const raw = contentEl.dataset.raw || contentEl.textContent || ''
  await executeRun(runButtonEl?.dataset?.type || '', raw)
}

async function runExportEntry(index) {
  const entry = exportEntryItems[index]
  if (!entry || !isRunnableType(entry.type)) return
  await executeRun(entry.type, entry.content || '')
}

async function copyExportEntry(index) {
  const entry = exportEntryItems[index]
  if (!entry) return
  await copyText(entry.content || '')
}

async function copyText(text) {
  const raw = String(text || '')
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

async function executeRun(runType, content) {
  if (!runType) {
    return
  }

  if (runType === 'deeplink') {
    const url = String(content || '').trim()
    if (!url) {
      alert('没有可调起的 URL')
      return
    }
    const ok = await window.electronAPI.openExternal(url)
    if (!ok) {
      alert('URL 调起失败，请检查协议是否已安装')
    }
    return
  }

  if (runType === 'command') {
    const confirmed = window.confirm(
      '即将在命令行执行导出脚本，存在配置写入失败或误覆盖风险。\n\n请先备份相关配置文件后再继续。\n\n是否确认运行？'
    )
    if (!confirmed) {
      return
    }

    const command = String(content || '').trim()
    if (!command) {
      alert('没有可执行的命令内容')
      return
    }
    const result = await window.electronAPI.runCommandInTerminal(command)
    if (!result?.success) {
      alert(`调起 Terminal 失败: ${result?.message || '未知错误'}`)
    }
  }

  if (runType === 'javascript') {
    const script = String(content || '').trim()
    if (!script) {
      alert('没有可执行的 JavaScript 代码')
      return
    }
    const result = await window.electronAPI.openHTMLWithScript(script)
    if (!result?.success) {
      alert(`调起浏览器失败: ${result?.message || '未知错误'}`)
    }
  }
}
