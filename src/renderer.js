let configs = []
let editingIndex = -1
let selectedIndexes = new Set()
let dragSourceIndex = -1
let visibleApiKeyIndexes = new Set()

function normalizeUrl(url) {
  return url.replace(/\/+$/, '')
}

function normalizeEndpoint(endpoint) {
  if (!endpoint) return ''
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
}

function joinUrl(url, endpoint) {
  return `${normalizeUrl(url)}${normalizeEndpoint(endpoint)}`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function maskApiKey(apiKey) {
  const raw = String(apiKey || '').trim()
  if (!raw) return '未填写'
  if (raw.length <= 11) return `${raw.slice(0, 7)}****`
  const prefix = raw.slice(0, 7)
  const suffix = raw.slice(-4)
  const stars = '*'.repeat(Math.max(8, raw.length - 11))
  return `${prefix}${stars}${suffix}`
}

function getApiKeyDisplay(config, index) {
  if (visibleApiKeyIndexes.has(index)) {
    return String(config.apiKey || '').trim() || '未填写'
  }
  return maskApiKey(config.apiKey)
}

function toggleApiKeyVisibility(index, event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  const raw = String(configs[index]?.apiKey || '').trim()
  if (!raw) {
    alert('该配置未填写 API Key')
    return
  }

  if (visibleApiKeyIndexes.has(index)) {
    visibleApiKeyIndexes.delete(index)
  } else {
    visibleApiKeyIndexes.add(index)
  }

  renderConfigs()
}

function openExportModal(title, content, language = 'plaintext') {
  const modal = document.getElementById('exportModal')
  const titleEl = document.getElementById('exportTitle')
  const contentEl = document.getElementById('exportCode')
  const typeLabelEl = document.getElementById('exportTypeLabel')
  titleEl.textContent = title
  contentEl.dataset.raw = content
  contentEl.className = `code-viewer hljs language-${language}`
  const highlighted = window.electronAPI.highlightCode(content, language)
  contentEl.innerHTML = highlighted
  typeLabelEl.textContent = language === 'json' ? 'JSON' : language === 'bash' ? 'Shell' : '文本'
  modal.classList.add('active')
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

function getSelectedConfigs() {
  return Array.from(selectedIndexes)
    .filter(index => configs[index])
    .map(index => configs[index])
}

function parseOptionalInteger(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function parseInputTypes(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const items = raw
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  if (items.length === 0) return null
  return Array.from(new Set(items))
}

function normalizeOpenAIUrlAndEndpoint(apiType, url, endpoint) {
  if (apiType !== 'openai') {
    return { url, endpoint }
  }

  let normalizedUrl = normalizeUrl(url)
  let normalizedEndpoint = normalizeEndpoint(endpoint)

  if (normalizedEndpoint.startsWith('/v1/')) {
    if (!normalizedUrl.endsWith('/v1')) {
      normalizedUrl = `${normalizedUrl}/v1`
    }
    normalizedEndpoint = normalizedEndpoint.replace(/^\/v1/, '')
    normalizedEndpoint = normalizeEndpoint(normalizedEndpoint)
  }

  return {
    url: normalizedUrl,
    endpoint: normalizedEndpoint
  }
}

function initExportOptions() {
  const exportModeSelect = document.getElementById('exportMode')
  if (!exportModeSelect || !window.ExporterRegistry) return
  const exporters = window.ExporterRegistry.getAllExporters()
  exportModeSelect.innerHTML = exporters
    .map(exporter => `<option value="${exporter.id}">${exporter.displayName}</option>`)
    .join('')
}

function exportSelectedItems() {
  const mode = document.getElementById('exportMode')?.value || 'cc-switch-cli'
  const exporter = window.ExporterRegistry.getExporter(mode)
  const selectedConfigs = getSelectedConfigs()
  if (!exporter) {
    alert('未找到导出器')
    return
  }
  if (selectedConfigs.length === 0) {
    alert('请先选择至少一个配置')
    return
  }
  const content = exporter.export(selectedConfigs)
  openExportModal(exporter.buildTitle(selectedConfigs.length), content, exporter.language)
}

function toggleSelect(index) {
  if (selectedIndexes.has(index)) {
    selectedIndexes.delete(index)
  } else {
    selectedIndexes.add(index)
  }
  updateSelectionControls()
}

function handleDragStart(index, event) {
  dragSourceIndex = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(index))
  const item = event.target.closest('.config-item')
  if (item) {
    const rect = item.getBoundingClientRect()
    const offsetX = Math.max(0, rect.width - 12)
    const offsetY = Math.max(0, Math.min(rect.height / 2, rect.height - 1))
    event.dataTransfer.setDragImage(item, offsetX, offsetY)
  }
}

function handleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function handleDrop(targetIndex, event) {
  event.preventDefault()
  const sourceIndex = dragSourceIndex
  dragSourceIndex = -1

  if (sourceIndex < 0 || sourceIndex === targetIndex) {
    return
  }

  const moved = configs[sourceIndex]
  configs.splice(sourceIndex, 1)
  configs.splice(targetIndex, 0, moved)

  selectedIndexes.clear()
  saveConfigs()
  renderConfigs()
}

function toggleSelectAll(checked) {
  selectedIndexes.clear()
  if (checked) {
    configs.forEach((_, index) => selectedIndexes.add(index))
  }
  renderConfigs()
}

function updateSelectionControls() {
  const allCheckbox = document.getElementById('selectAllConfigs')
  const selectedCountEl = document.getElementById('selectedCount')
  const exportBtn = document.getElementById('exportSelectedButton')
  const selectedCount = selectedIndexes.size
  const allSelected = configs.length > 0 && selectedCount === configs.length

  if (allCheckbox) {
    allCheckbox.checked = allSelected
  }
  if (selectedCountEl) {
    selectedCountEl.textContent = `已选 ${selectedCount} 项`
  }
  if (exportBtn) {
    exportBtn.disabled = selectedCount === 0
  }
}

function renderInputHistories() {
  const modelHistory = Array.from(new Set(configs.map(item => item.modelName).filter(Boolean)))
  const urlHistory = Array.from(new Set(configs.map(item => item.url).filter(Boolean)))
  const endpointHistory = Array.from(new Set(configs.map(item => item.endpoint).filter(Boolean)))

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

function withRuntimeState(config) {
  return {
    ...config,
    status: 'pending',
    lastCheck: null,
    lastMessage: null
  }
}

function toPersistentConfig(config) {
  return {
    name: config.name,
    apiType: config.apiType,
    url: config.url,
    endpoint: config.endpoint,
    modelName: config.modelName,
    apiKey: config.apiKey,
    contextWindow: config.contextWindow ?? null,
    maxTokens: config.maxTokens ?? null,
    reasoningMode: config.reasoningMode ?? null,
    inputTypes: config.inputTypes ?? null
  }
}

function loadConfigs() {
  const saved = localStorage.getItem('modelCheckerConfigs')
  if (saved) {
    const parsed = JSON.parse(saved)
    configs = parsed.map(withRuntimeState)
  }
}

function saveConfigs() {
  const persistedConfigs = configs.map(toPersistentConfig)
  localStorage.setItem('modelCheckerConfigs', JSON.stringify(persistedConfigs))
}

function updateDefaults() {
  const apiType = document.getElementById('apiType').value
  const urlInput = document.getElementById('url')
  const endpointInput = document.getElementById('endpoint')
  const modelNameInput = document.getElementById('modelName')

  const applyDefault = (input, placeholder, defaultValue, defaultValues) => {
    input.placeholder = placeholder
    const currentValue = input.value.trim()
    if (defaultValues.includes(currentValue)) {
      input.value = defaultValue
    }
  }

  const urlDefaults = ['https://api.anthropic.com', 'https://api.openai.com/v1', '']
  const endpointDefaults = ['/v1/messages', '/chat/completions', '']
  const modelDefaults = ['claude-opus-4-6', 'gpt-5.4', '']

  if (apiType === 'anthropic') {
    applyDefault(urlInput, 'https://api.anthropic.com', 'https://api.anthropic.com', urlDefaults)
    applyDefault(endpointInput, '/v1/messages', '/v1/messages', endpointDefaults)
    applyDefault(modelNameInput, 'claude-opus-4-6', 'claude-opus-4-6', modelDefaults)
  } else {
    applyDefault(urlInput, 'https://api.openai.com/v1', 'https://api.openai.com/v1', urlDefaults)
    applyDefault(endpointInput, '/chat/completions', '/chat/completions', endpointDefaults)
    applyDefault(modelNameInput, 'gpt-5.4', 'gpt-5.4', modelDefaults)
  }
}

function openModal(index = -1) {
  editingIndex = index
  const modal = document.getElementById('configModal')
  const modalTitle = document.querySelector('.modal-title')
  renderInputHistories()

  if (index >= 0) {
    modalTitle.textContent = '编辑配置'
    const config = configs[index]
    document.getElementById('configName').value = config.name
    document.getElementById('apiType').value = config.apiType
    document.getElementById('url').value = config.url
    document.getElementById('endpoint').value = config.endpoint
    document.getElementById('modelName').value = config.modelName
    document.getElementById('apiKey').value = config.apiKey || ''
    document.getElementById('contextWindow').value = config.contextWindow || ''
    document.getElementById('maxTokens').value = config.maxTokens || ''
    document.getElementById('reasoningMode').value = config.reasoningMode === true ? 'true' : config.reasoningMode === false ? 'false' : ''
    document.getElementById('inputTypes').value = Array.isArray(config.inputTypes) ? config.inputTypes.join(',') : ''
  } else {
    modalTitle.textContent = '添加配置'
    document.getElementById('configName').value = ''
    document.getElementById('apiType').value = 'openai'
    document.getElementById('url').value = ''
    document.getElementById('modelName').value = ''
    updateDefaults()
    document.getElementById('apiKey').value = ''
    document.getElementById('contextWindow').value = ''
    document.getElementById('maxTokens').value = ''
    document.getElementById('reasoningMode').value = ''
    document.getElementById('inputTypes').value = ''
  }

  modal.classList.add('active')
}

function closeModal() {
  const modal = document.getElementById('configModal')
  modal.classList.remove('active')
  editingIndex = -1
}

function saveConfig() {
  const name = document.getElementById('configName').value.trim()
  const apiType = document.getElementById('apiType').value
  const rawUrl = normalizeUrl(document.getElementById('url').value.trim())
  const rawEndpoint = normalizeEndpoint(document.getElementById('endpoint').value.trim())
  const modelName = document.getElementById('modelName').value.trim()
  const apiKey = document.getElementById('apiKey').value.trim()
  const contextWindow = parseOptionalInteger(document.getElementById('contextWindow').value)
  const maxTokens = parseOptionalInteger(document.getElementById('maxTokens').value)
  const reasoningRaw = document.getElementById('reasoningMode').value
  const inputTypes = parseInputTypes(document.getElementById('inputTypes').value)
  const reasoningMode = reasoningRaw === '' ? null : reasoningRaw === 'true'
  const normalizedOpenAI = normalizeOpenAIUrlAndEndpoint(apiType, rawUrl, rawEndpoint)
  const url = normalizedOpenAI.url
  const endpoint = normalizedOpenAI.endpoint

  if (!name || !url || !endpoint || !modelName) {
    alert('请填写所有必填字段')
    return
  }

  const config = {
    name,
    apiType,
    url,
    endpoint,
    modelName,
    apiKey,
    contextWindow,
    maxTokens,
    reasoningMode,
    inputTypes,
    'status': 'pending',
    'lastCheck': null,
    'lastMessage': null
  }

  if (editingIndex >= 0) {
    configs[editingIndex] = config
  } else {
    configs.push(config)
  }

  selectedIndexes.clear()
  visibleApiKeyIndexes.clear()
  saveConfigs()
  renderConfigs()
  closeModal()
}

function deleteConfig(index) {
  if (confirm('确定要删除这个配置吗？')) {
    configs.splice(index, 1)
    selectedIndexes.clear()
    visibleApiKeyIndexes.clear()
    saveConfigs()
    renderConfigs()
  }
}

async function checkConfig(index) {
  const config = configs[index]
  const configItem = document.querySelector(`[data-index="${index}"]`)

  if (!configItem) {
    console.error('Config item not found for index:', index)
    return
  }

  const statusDiv = configItem.querySelector('.config-status')

  if (!statusDiv) {
    console.error('Status div not found in config item')
    return
  }

  console.log("Checking config:", config)
  statusDiv.className = 'config-status checking'
  statusDiv.textContent = '检查中...'

  try {
    const result = await window.electronAPI.checkModel({
      apiType: config.apiType,
      url: config.url,
      endpoint: config.endpoint,
      modelName: config.modelName,
      apiKey: config.apiKey
    })

    configs[index].status = result.success ? 'success' : 'error'
    configs[index].lastCheck = new Date().toISOString()
    configs[index].lastMessage = result.message
    saveConfigs()

    statusDiv.className = `config-status ${result.success ? 'success' : 'error'}`
    statusDiv.textContent = result.success ? '✅ 模型可用' : `❌ ${result.message}`
  } catch (error) {
    configs[index].status = 'error'
    configs[index].lastCheck = new Date().toISOString()
    configs[index].lastMessage = error.message
    saveConfigs()

    statusDiv.className = 'config-status error'
    statusDiv.textContent = `❌ 检查失败: ${error.message}`
  }
}

function renderConfigs() {
  const configList = document.getElementById('configList')
  renderInputHistories()

  if (configs.length === 0) {
    configList.innerHTML = '<div class="empty-state">暂无配置，点击下方按钮添加配置</div>'
    return
  }

  configList.innerHTML = configs.map((config, index) => {
    const apiTypeLabel = config.apiType === 'anthropic' ? 'Anthropic' : 'OpenAI'
    const normalizedStatus = config.status || 'pending'
    let statusClass = 'pending'
    let statusText = '○ 未检查'

    if (normalizedStatus === 'success') {
      statusClass = 'success'
      statusText = '✅ 模型可用'
    } else if (normalizedStatus === 'error') {
      statusClass = 'error'
      statusText = `❌ ${config.lastMessage || '模型不可用'}`
    }

    const statusHtml = `<div class="config-status ${statusClass}">${statusText}</div>`
    const contextWindowText = config.contextWindow || '自动'
    const maxTokensText = config.maxTokens || '自动'
    const reasoningText = config.reasoningMode === true ? '启用' : config.reasoningMode === false ? '禁用' : '自动'
    const inputTypesText = Array.isArray(config.inputTypes) && config.inputTypes.length > 0 ? config.inputTypes.join(', ') : '自动'
    const apiKeyDisplay = getApiKeyDisplay(config, index)
    const apiKeyEye = visibleApiKeyIndexes.has(index) ? '🙈' : '👁️'

    return `
      <div class="config-item" data-index="${index}" ondragover="handleDragOver(event)" ondrop="handleDrop(${index}, event)">
        <div class="config-row">
          <label class="row-checkbox-hit">
            <input class="row-checkbox" type="checkbox" ${selectedIndexes.has(index) ? 'checked' : ''} onchange="toggleSelect(${index})">
          </label>
          <div class="config-content">
            <div class="config-top">
              <h2 class="config-name">${config.name}</h2>
            </div>
            <div class="config-meta">
              <div class="config-detail config-meta-item"><span class="meta-label selectable-item">接口:</span> <span class="meta-value selectable-item">${apiTypeLabel}</span></div>
              <div class="config-detail config-meta-item"><span class="meta-label selectable-item">模型:</span> <span class="meta-value selectable-item">${escapeHtml(config.modelName)}</span></div>
              <div class="config-detail config-meta-item config-meta-item-url" title="${escapeHtml(joinUrl(config.url, config.endpoint))}"><span class="meta-label selectable-item">地址:</span> <span class="meta-value selectable-item">${escapeHtml(joinUrl(config.url, config.endpoint))}</span></div>
            </div>
            <div class="config-params">
              <span class="param-item api-key-row"><span class="api-key-label selectable-item">API Key:</span><span class="api-key-text selectable-item">${escapeHtml(apiKeyDisplay)}</span></span><button class="api-key-eye" onclick="toggleApiKeyVisibility(${index}, event)" title="显示或隐藏 API Key">${apiKeyEye}</button>
            </div>
            <div class="config-params">
              <span class="param-item"><span class="selectable-item">Context Window:</span> <span class="selectable-item">${contextWindowText}</span></span> |
              <span class="param-item"><span class="selectable-item">Max Tokens:</span> <span class="selectable-item">${maxTokensText}</span></span> |
              <span class="param-item"><span class="selectable-item">Reasoning:</span> <span class="selectable-item">${reasoningText}</span></span> |
              <span class="param-item"><span class="selectable-item">Input:</span> <span class="selectable-item">${inputTypesText}</span></span>
            </div>
          </div>
          ${statusHtml}
          <div class="config-actions">
            <button class="button button-success" onclick="checkConfig(${index})">检查</button>
            <button class="button button-secondary" onclick="openModal(${index})">编辑</button>
            <button class="button button-danger" onclick="deleteConfig(${index})">删除</button>
            <span class="drag-handle" draggable="true" ondragstart="handleDragStart(${index}, event)" title="拖拽排序">⠿</span>
          </div>
        </div>
      </div>
    `
  }).join('')
  updateSelectionControls()
}

document.addEventListener('DOMContentLoaded', () => {
  initExportOptions()
  loadConfigs()
  renderConfigs()
})

document.getElementById('configModal').addEventListener('click', (e) => {
  if (e.target.id === 'configModal') {
    closeModal()
  }
})

document.getElementById('exportModal').addEventListener('click', (e) => {
  if (e.target.id === 'exportModal') {
    closeExportModal()
  }
})
