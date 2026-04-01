function renderProviderIdPresetOptions() {
  const presets = Array.isArray(window.PROVIDER_PRESETS) ? window.PROVIDER_PRESETS : []
  const ids = Array.from(new Set(presets.map(item => String(item.id || '').trim()).filter(Boolean)))
  setComboboxOptions('providerId', ids.map(id => ({ value: id, label: id })))
}

function findMatchedPreset(provider) {
  if (!provider) return null
  const normalizedUrl = normalizeUrl(String(provider.url || '').trim())
  const normalizedEndpoint = normalizeEndpoint(String(provider.endpoint || '').trim())
  const normalizedName = String(provider.name || '').trim().toLowerCase()

  const presets = Array.isArray(window.PROVIDER_PRESETS) ? window.PROVIDER_PRESETS : []

  return presets.find((preset) => {
    const sameName = preset.name.toLowerCase() === normalizedName
    const sameUrl = normalizeUrl(String(preset.url || '')) === normalizedUrl
    const sameEndpoint = normalizeEndpoint(String(preset.endpoint || '')) === normalizedEndpoint
    return sameName || (sameUrl && sameEndpoint)
  }) || null
}

function onProviderIdCommitted() {
  const providerIdInput = document.getElementById('providerId')
  if (!providerIdInput) return
  const providerId = String(providerIdInput.value || '').trim()
  if (!providerId) return
  const preset = getProviderPresetById(providerId)
  const providerNameInput = document.getElementById('providerName')
  if (!providerNameInput) return
  if (!preset) {
    providerNameInput.value = formatProviderNameFromId(providerId)
    return
  }

  const apiTypeSelect = document.getElementById('apiType')
  const urlInput = document.getElementById('url')
  const endpointInput = document.getElementById('endpoint')
  const providerWebsiteInput = document.getElementById('providerWebsite')

  providerIdInput.value = preset.id
  providerNameInput.value = preset.name || providerNameInput.value
  apiTypeSelect.value = preset.apiType
  urlInput.value = preset.url
  endpointInput.value = preset.endpoint
  providerWebsiteInput.value = preset.website || preset.url || ''
}

function formatProviderNameFromId(providerId) {
  const normalizedId = String(providerId || '').trim().toLowerCase()
  if (!normalizedId) return ''
  return normalizedId
    .split('-')
    .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '')
    .filter(Boolean)
    .join(' ')
}

function getModelPresetCandidates(providerIndex) {
  const allModelPresets = typeof window.getAllModelPresets === 'function' ? window.getAllModelPresets() : []
  if (!Array.isArray(allModelPresets) || allModelPresets.length === 0) return []
  const provider = providers[providerIndex]
  const matchedProviderPreset = findMatchedPreset(provider)
  if (!matchedProviderPreset) return allModelPresets
  const matchedProviderId = String(matchedProviderPreset.id || '')
  const matchedModels = allModelPresets.filter(item => String(item.provider || '') === matchedProviderId)
  const otherModels = allModelPresets.filter(item => String(item.provider || '') !== matchedProviderId)
  return [...matchedModels, ...otherModels]
}

function getProviderPresetNameById(providerId) {
  const normalizedId = String(providerId || '').trim()
  if (!normalizedId) return ''
  const providerPresets = Array.isArray(window.PROVIDER_PRESETS) ? window.PROVIDER_PRESETS : []
  const matchedProvider = providerPresets.find(item => String(item.id || '').trim() === normalizedId)
  return String(matchedProvider?.name || '').trim()
}

function renderModelNamePresetOptions(providerIndex) {
  const candidatePresets = getModelPresetCandidates(providerIndex)
  const localModelIds = providers
    .flatMap(provider => provider.models.map(model => String(model.id || '').trim()))
    .filter(Boolean)

  // 候选预设已按“当前供应商匹配优先”排序，需保持在最前面；
  // 本地模型仅作为补充，追加到末尾，避免打乱优先级。
  const orderedPresetIds = Array.from(
    new Set(candidatePresets.map(item => String(item.id || '').trim()).filter(Boolean))
  )
  const localOnlyIds = Array.from(new Set(localModelIds)).filter(id => !orderedPresetIds.includes(id))
  const mergedIds = [...orderedPresetIds, ...localOnlyIds]

  const options = mergedIds.map((id) => {
    const matched = candidatePresets.find(item => String(item.id || '').trim() === id)
    const modelName = matched ? String(matched.name || '').trim() : ''
    const providerName = matched ? getProviderPresetNameById(matched.provider) : ''
    const hint = modelName && providerName
      ? `${modelName} - ${providerName}`
      : (modelName || providerName)
    return { value: id, label: hint || id }
  })
  setComboboxOptions('modelName', options)
}

function applyModelPresetFromModelName() {
  if (editingModelProviderIndex < 0 || !providers[editingModelProviderIndex]) return
  const modelNameInput = document.getElementById('modelName')
  if (!modelNameInput) return
  const modelId = String(modelNameInput.value || '').trim()
  if (!modelId) return

  const candidatePresets = getModelPresetCandidates(editingModelProviderIndex)
  const preset = candidatePresets.find(item => String(item.id || '').trim() === modelId)
  if (!preset) return

  const modelDisplayNameInput = document.getElementById('modelDisplayName')
  const contextWindowInput = document.getElementById('contextWindow')
  const maxTokensInput = document.getElementById('maxTokens')
  const reasoningModeInput = document.getElementById('reasoningMode')
  const inputTypesInput = document.getElementById('inputTypes')

  if (modelDisplayNameInput && !modelDisplayNameInput.value.trim()) {
    modelDisplayNameInput.value = String(preset.name || '').trim()
  }
  if (contextWindowInput && Number.isFinite(preset.contextWindow) && preset.contextWindow > 0) {
    contextWindowInput.value = String(preset.contextWindow)
  }
  if (maxTokensInput && Number.isFinite(preset.maxCompletionTokens) && preset.maxCompletionTokens > 0) {
    maxTokensInput.value = String(preset.maxCompletionTokens)
  }
  if (reasoningModeInput && typeof preset.reasoning === 'boolean') {
    reasoningModeInput.value = preset.reasoning ? 'true' : 'false'
  }
  if (inputTypesInput && Array.isArray(preset.input) && preset.input.length > 0) {
    inputTypesInput.value = preset.input.join(',')
  }
  updateReasoningModeStyle()
}

function openProviderDialog(index = -1) {
  editingProviderIndex = index
  const dialog = document.getElementById('providerDialog')
  const dialogTitle = document.getElementById('providerDialogTitle')
  renderProviderIdPresetOptions()
  renderProviderUrlEndpointPresetOptions()

  if (index >= 0) {
    dialogTitle.textContent = '编辑供应商'
    const provider = providers[index]
    document.getElementById('providerId').value = provider.id || provider.name || ''
    document.getElementById('providerName').value = provider.name
    document.getElementById('apiType').value = provider.apiType
    document.getElementById('url').value = provider.url
    document.getElementById('endpoint').value = provider.endpoint
    document.getElementById('providerWebsite').value = provider.website || ''
    document.getElementById('apiKey').value = provider.apiKey || ''
    syncApiTypeUrlHint()
  } else {
    dialogTitle.textContent = '添加供应商'
    document.getElementById('providerName').value = ''
    document.getElementById('providerId').value = ''
    document.getElementById('apiType').value = 'openai'
    document.getElementById('url').value = ''
    updateDefaults()
    document.getElementById('providerWebsite').value = ''
    document.getElementById('apiKey').value = ''
  }

  resetApiKeyVisibility()

  dialog.classList.add('active')
}

function closeProviderDialog() {
  const dialog = document.getElementById('providerDialog')
  dialog.classList.remove('active')
  resetApiKeyVisibility()
  editingProviderIndex = -1
}

function resetApiKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey')
  const toggleButton = document.getElementById('toggleApiKeyButton')
  if (apiKeyInput) {
    apiKeyInput.type = 'password'
  }
  if (toggleButton) {
    toggleButton.dataset.visible = 'false'
    toggleButton.setAttribute('aria-label', '显示 API Key')
    toggleButton.setAttribute('title', '显示 API Key')
  }
}

function toggleProviderDialogApiKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey')
  const toggleButton = document.getElementById('toggleApiKeyButton')
  if (!apiKeyInput || !toggleButton) return
  const isPassword = apiKeyInput.type === 'password'
  apiKeyInput.type = isPassword ? 'text' : 'password'
  const visible = isPassword
  toggleButton.dataset.visible = visible ? 'true' : 'false'
  toggleButton.setAttribute('aria-label', visible ? '隐藏 API Key' : '显示 API Key')
  toggleButton.setAttribute('title', visible ? '隐藏 API Key' : '显示 API Key')
}

function saveProvider() {
  const provider = normalizeProviderInput({
    providerId: document.getElementById('providerId').value,
    providerName: document.getElementById('providerName').value,
    apiType: document.getElementById('apiType').value,
    url: document.getElementById('url').value,
    endpoint: document.getElementById('endpoint').value,
    apiKey: document.getElementById('apiKey').value,
    website: document.getElementById('providerWebsite').value
  })

  if (!provider.id || !provider.url || !provider.endpoint) {
    alert('请填写供应商必填字段')
    return
  }

  const nextProvider = {
    ...provider,
    models: editingProviderIndex >= 0 ? providers[editingProviderIndex].models : []
  }

  if (editingProviderIndex >= 0) {
    providers[editingProviderIndex] = nextProvider
  } else {
    providers.push(nextProvider)
  }

  selectedModelKeys.clear()
  visibleApiKeyProviders.clear()
  saveConfigs()
  renderConfigs()
  closeProviderDialog()
}

async function openProviderWebsite(providerIndex, event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  const raw = String(providers[providerIndex]?.website || '').trim()
  if (!raw) return
  const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  const ok = await window.electronAPI.openExternal(target)
  if (!ok) {
    alert('官网链接打开失败，请检查 URL 是否正确')
  }
}

function deleteProvider(providerIndex) {
  if (!confirm('确定要删除这个供应商及其所有模型吗？')) return
  providers.splice(providerIndex, 1)
  selectedModelKeys.clear()
  visibleApiKeyProviders.clear()
  saveConfigs()
  renderConfigs()
}

function buildUniqueCopyValue(initialValue, hasValue) {
  if (!hasValue(initialValue)) return initialValue
  let index = 2
  while (hasValue(`${initialValue}-${index}`)) {
    index += 1
  }
  return `${initialValue}-${index}`
}

function duplicateProvider(providerIndex) {
  const source = providers[providerIndex]
  if (!source) return

  const baseName = `${String(source.name || source.id || '').trim() || 'Provider'}(copy)`
  const baseId = `${String(source.id || '').trim() || 'provider'}-copy`

  const hasProviderName = (name) => providers.some((item) => String(item.name || '').trim() === name)
  const hasProviderId = (providerId) => providers.some((item) => String(item.id || '').trim() === providerId)

  const copiedProvider = {
    id: buildUniqueCopyValue(baseId, hasProviderId),
    name: buildUniqueCopyValue(baseName, hasProviderName),
    apiType: source.apiType,
    url: source.url,
    endpoint: source.endpoint,
    website: source.website || '',
    apiKey: source.apiKey || '',
    models: []
  }

  providers.splice(providerIndex + 1, 0, copiedProvider)
  selectedModelKeys.clear()
  visibleApiKeyProviders.clear()
  saveConfigs()
  renderConfigs()
}

function openModelDialog(providerIndex, modelIndex = -1) {
  editingModelProviderIndex = providerIndex
  editingModelIndex = modelIndex
  const dialog = document.getElementById('modelDialog')
  const titleEl = document.getElementById('modelDialogTitle')
  const probeResultEl = document.getElementById('modelProbeResult')
  const probeButtonEl = document.getElementById('probeModelButton')
  renderModelNamePresetOptions(providerIndex)
  if (probeResultEl) {
    probeResultEl.textContent = '尝试调用接口，自动探测 Context Window / Max Tokens'
    probeResultEl.style.color = '#999'
  }
  if (probeButtonEl) {
    probeButtonEl.disabled = false
    probeButtonEl.textContent = '探测模型参数'
  }

  if (modelIndex >= 0) {
    titleEl.textContent = '编辑模型'
    const model = providers[providerIndex].models[modelIndex]
    document.getElementById('modelName').value = model.id || ''
    document.getElementById('modelDisplayName').value = model.name || ''
    document.getElementById('contextWindow').value = model.contextWindow || ''
    document.getElementById('maxTokens').value = model.maxTokens || ''
    document.getElementById('reasoningMode').value = model.reasoningMode === true ? 'true' : model.reasoningMode === false ? 'false' : ''
    document.getElementById('inputTypes').value = Array.isArray(model.inputTypes) ? model.inputTypes.join(',') : ''
  } else {
    titleEl.textContent = '添加模型'
    document.getElementById('modelName').value = ''
    document.getElementById('modelDisplayName').value = ''
    document.getElementById('contextWindow').value = ''
    document.getElementById('maxTokens').value = ''
    document.getElementById('reasoningMode').value = ''
    document.getElementById('inputTypes').value = ''
  }
  updateReasoningModeStyle()
  dialog.classList.add('active')
}

function closeModelDialog() {
  const dialog = document.getElementById('modelDialog')
  dialog.classList.remove('active')
  editingModelProviderIndex = -1
  editingModelIndex = -1
}

function saveModel() {
  if (editingModelProviderIndex < 0 || !providers[editingModelProviderIndex]) {
    alert('供应商不存在')
    return
  }

  const model = normalizeModelInput({
    modelId: document.getElementById('modelName').value,
    modelName: document.getElementById('modelDisplayName').value,
    contextWindow: document.getElementById('contextWindow').value,
    maxTokens: document.getElementById('maxTokens').value,
    reasoningRaw: document.getElementById('reasoningMode').value,
    inputTypes: document.getElementById('inputTypes').value
  })

  if (!model.id) {
    alert('请填写模型 ID')
    return
  }

  const nextModel = withModelRuntimeState(model)

  const modelList = providers[editingModelProviderIndex].models
  if (editingModelIndex >= 0) {
    const old = modelList[editingModelIndex]
    nextModel.status = old.status
    nextModel.lastCheck = old.lastCheck
    nextModel.lastMessage = old.lastMessage
    modelList[editingModelIndex] = nextModel
  } else {
    modelList.push(nextModel)
  }

  selectedModelKeys.clear()
  saveConfigs()
  renderConfigs()
  closeModelDialog()
}

function clearModelCapabilityFields() {
  document.getElementById('contextWindow').value = ''
  document.getElementById('maxTokens').value = ''
  document.getElementById('reasoningMode').value = ''
  document.getElementById('inputTypes').value = ''
  updateReasoningModeStyle()
}

function updateReasoningModeStyle() {
  const select = document.getElementById('reasoningMode')
  if (!select) return
  const isUndefined = select.value === ''
  select.classList.toggle('is-undefined', isUndefined)
}

async function probeModelCapabilities() {
  if (editingModelProviderIndex < 0 || !providers[editingModelProviderIndex]) {
    alert('请先选择有效的供应商')
    return
  }

  const modelName = document.getElementById('modelName').value.trim()
  if (!modelName) {
    alert('请先填写模型 ID，再执行探测')
    return
  }

  const provider = providers[editingModelProviderIndex]
  const probeButtonEl = document.getElementById('probeModelButton')
  const probeResultEl = document.getElementById('modelProbeResult')

  if (probeButtonEl) {
    probeButtonEl.disabled = true
    probeButtonEl.textContent = '探测中...'
  }
  if (probeResultEl) {
    probeResultEl.textContent = '正在请求模型元数据，请稍候...'
    probeResultEl.style.color = '#999'
  }

  try {
    const result = await detectModelCapabilitiesFromApi(provider, modelName)

    const capabilities = result?.capabilities || null

    if (result?.success) {
      if (capabilities?.contextWindow) {
        document.getElementById('contextWindow').value = String(capabilities.contextWindow)
      }
      if (capabilities?.maxTokens) {
        document.getElementById('maxTokens').value = String(capabilities.maxTokens)
      }
      if (capabilities?.reasoningMode === true) {
        document.getElementById('reasoningMode').value = 'true'
      } else if (capabilities?.reasoningMode === false) {
        document.getElementById('reasoningMode').value = 'false'
      }
      if (Array.isArray(capabilities?.inputTypes) && capabilities.inputTypes.length > 0) {
        document.getElementById('inputTypes').value = capabilities.inputTypes.join(',')
      }
    }

    console.log('[detectModelCapabilitiesFromApi] 完整结果（含 probeDebug 与各次 responseBody）', result)

    if (probeResultEl) {
      probeResultEl.textContent = result?.message || '探测完成'
      probeResultEl.style.color = result?.success ? '#0f766e' : '#b45309'
    }
  } catch (error) {
    console.error('[detectModelCapabilitiesFromApi] 调用异常', error)
    if (probeResultEl) {
      probeResultEl.textContent = `探测失败: ${error.message}`
      probeResultEl.style.color = '#b91c1c'
    }
  } finally {
    if (probeButtonEl) {
      probeButtonEl.disabled = false
      probeButtonEl.textContent = '探测模型参数'
    }
  }
}

function deleteModel(providerIndex, modelIndex) {
  if (!confirm('确定要删除这个模型吗？')) return
  providers[providerIndex].models.splice(modelIndex, 1)
  selectedModelKeys.clear()
  saveConfigs()
  renderConfigs()
}

async function checkModel(providerIndex, modelIndex) {
  const provider = providers[providerIndex]
  const model = provider?.models?.[modelIndex]
  if (!provider || !model) return

  const modelItem = document.querySelector(`[data-provider-index="${providerIndex}"][data-model-index="${modelIndex}"]`)
  if (!modelItem) return
  const cluster = modelItem.querySelector('.model-check-cluster')
  if (!cluster) return
  const checkBtn = cluster.querySelector('.model-check-button')
  if (!checkBtn || checkBtn.disabled) return

  cluster.outerHTML = renderModelCheckClusterCheckingHtml(providerIndex, modelIndex)

  try {
    const result = await checkModelViaHttp(provider, model.id)

    providers[providerIndex].models[modelIndex].status = result.success ? 'success' : 'error'
    providers[providerIndex].models[modelIndex].lastCheck = new Date().toISOString()
    const detail = normalizeTooltipText(result.message)
    providers[providerIndex].models[modelIndex].lastMessage =
      detail || (result.success ? '模型可用' : '测试失败')
    saveConfigs()

    const updated = providers[providerIndex].models[modelIndex]
    const clusterAfter = modelItem.querySelector('.model-check-cluster')
    if (clusterAfter) {
      clusterAfter.outerHTML = renderModelCheckClusterHtml(providerIndex, modelIndex, updated)
    }
  } catch (error) {
    providers[providerIndex].models[modelIndex].status = 'error'
    providers[providerIndex].models[modelIndex].lastCheck = new Date().toISOString()
    providers[providerIndex].models[modelIndex].lastMessage =
      normalizeTooltipText(error?.message) || '测试失败'
    saveConfigs()

    const updated = providers[providerIndex].models[modelIndex]
    const clusterAfter = modelItem.querySelector('.model-check-cluster')
    if (clusterAfter) {
      clusterAfter.outerHTML = renderModelCheckClusterHtml(providerIndex, modelIndex, updated)
    }
  }
}

// 监听预设数据加载完成事件
window.addEventListener('presets-ready', () => {
  // 如果供应商模态框当前是打开的，重新渲染预设选项
  const dialog = document.getElementById('providerDialog')
  if (dialog && dialog.classList.contains('active')) {
    renderProviderIdPresetOptions()
    renderProviderUrlEndpointPresetOptions()
    console.log('预设选项已更新')
  }
  const modelDialog = document.getElementById('modelDialog')
  if (modelDialog && modelDialog.classList.contains('active') && editingModelProviderIndex >= 0) {
    renderModelNamePresetOptions(editingModelProviderIndex)
  }
  console.log('预设数据已准备好，供应商数量:', window.PROVIDER_PRESETS?.length || 0)
})

function formatModelListCreated(model) {
  const raw = model.created_at ?? model.created
  if (raw == null || raw === '') return ''
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString('zh-CN', { hour12: false })
  }
  return String(raw)
}

function buildModelListDetailHtml(model) {
  const parts = []
  const id = String(model.id || '').trim()
  const name = String(model.name || '').trim()
  if (id) {
    parts.push({ k: 'ID', v: id })
  }
  if (name && id && name !== id) {
    parts.push({ k: '显示名', v: name })
  }
  if (model.type) {
    parts.push({ k: '类型', v: String(model.type) })
  }
  if (model.object) {
    parts.push({ k: 'object', v: String(model.object) })
  }
  const created = formatModelListCreated(model)
  if (created) {
    parts.push({ k: '创建', v: created })
  }
  if (model.owned_by) {
    parts.push({ k: 'owned_by', v: String(model.owned_by) })
  }
  if (Array.isArray(model.supported_endpoint_types) && model.supported_endpoint_types.length > 0) {
    parts.push({ k: '端点', v: model.supported_endpoint_types.join(', ') })
  }
  if (model.contextWindow != null && Number(model.contextWindow) > 0) {
    parts.push({ k: 'Context', v: String(model.contextWindow) })
  }
  if (model.maxTokens != null && Number(model.maxTokens) > 0) {
    parts.push({ k: 'Max', v: String(model.maxTokens) })
  }
  if (parts.length === 0) return ''
  const inner = parts.map((p) => (
    `<span class="model-list-detail-pair"><span class="model-list-detail-k">${escapeHtml(p.k)}</span><span class="model-list-detail-v">${escapeHtml(p.v)}</span></span>`
  )).join('')
  return `<div class="model-list-details">${inner}</div>`
}

function setModelListDialogToolbarVisible(show) {
  const wrap = document.getElementById('modelListDialogToolbarWrap')
  if (wrap) wrap.style.display = show ? '' : 'none'
}

function setModelListAddButtonEnabled(enabled) {
  const btn = document.getElementById('addModelListFromListButton')
  if (btn) btn.disabled = !enabled
}

function showModelListDialogError(message) {
  const listContainer = document.getElementById('modelListDialogList')
  const selectAll = document.getElementById('selectAllModelList')
  if (!listContainer) return
  setModelListDialogToolbarVisible(false)
  setModelListAddButtonEnabled(false)
  if (selectAll) {
    selectAll.checked = false
    selectAll.indeterminate = false
    selectAll.disabled = true
  }
  const selectedCountSpan = document.getElementById('modelListSelectedCount')
  if (selectedCountSpan) selectedCountSpan.textContent = '已选 0 项'
  listContainer.innerHTML = `
    <div class="model-list-status model-list-status-error">
      <span class="model-list-status-title">加载失败</span>
      <p class="model-list-error-message">${escapeHtml(message)}</p>
      <button type="button" class="button button-third" onclick="retryLoadModelList()">重试</button>
    </div>
  `
}

function retryLoadModelList() {
  if (modelListTargetProviderIndex < 0) return
  loadProviderModelList(modelListTargetProviderIndex)
}

function renderModelListDialogBody(providerIndex) {
  const dialogTitle = document.getElementById('modelListDialogTitle')
  const listContainer = document.getElementById('modelListDialogList')
  const selectAllCheckbox = document.getElementById('selectAllModelList')
  const selectedCountSpan = document.getElementById('modelListSelectedCount')

  if (!listContainer) return

  const provider = providers[providerIndex]
  if (dialogTitle) {
    dialogTitle.textContent = `${provider.name || provider.id} - 模型列表`
  }

  const existingModelIds = new Set(provider.models.map(m => m.id))
  setModelListDialogToolbarVisible(true)
  if (selectAllCheckbox) {
    selectAllCheckbox.disabled = false
  }

  if (!Array.isArray(loadedModelsList) || loadedModelsList.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">接口未返回任何模型</div>'
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false
      selectAllCheckbox.disabled = true
    }
    if (selectedCountSpan) {
      selectedCountSpan.textContent = '已选 0 项'
    }
    setModelListAddButtonEnabled(false)
    return
  }

  listContainer.innerHTML = loadedModelsList.map((model) => {
    const alreadyExists = existingModelIds.has(model.id)
    const titleText = String(model.name || model.id || '').trim() || model.id
    const detailHtml = buildModelListDetailHtml(model)
    return `
      <div class="model-list-item" data-model-id="${escapeHtml(model.id)}">
        <label class="row-checkbox-hit">
          <input
            class="row-checkbox model-list-checkbox"
            data-model-id="${escapeHtml(model.id)}"
            type="checkbox"
            ${alreadyExists ? 'disabled' : ''}
            onchange="updateModelListSelection()"
          >
        </label>
        <div class="model-list-content">
          <div class="model-list-title-row">
            <span class="model-list-title">${escapeHtml(titleText)}</span>
            ${alreadyExists ? '<span class="model-list-exists">已添加</span>' : ''}
          </div>
          ${detailHtml}
        </div>
      </div>
    `
  }).join('')

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false
    selectAllCheckbox.disabled = loadedModelsList.every(m => existingModelIds.has(m.id))
  }
  if (selectedCountSpan) {
    selectedCountSpan.textContent = '已选 0 项'
  }

  const hasSelectable = loadedModelsList.some(m => !existingModelIds.has(m.id))
  setModelListAddButtonEnabled(hasSelectable)
}

async function loadProviderModelList(providerIndex) {
  if (!providers[providerIndex]) {
    alert('供应商不存在')
    return
  }

  const token = ++modelListLoadToken
  modelListTargetProviderIndex = providerIndex
  loadedModelsList = []

  const dialog = document.getElementById('modelListDialog')
  const dialogTitle = document.getElementById('modelListDialogTitle')
  const listContainer = document.getElementById('modelListDialogList')
  const provider = providers[providerIndex]

  if (!dialog || !listContainer) return

  if (dialogTitle) {
    dialogTitle.textContent = `${provider.name || provider.id} - 模型列表`
  }
  listContainer.innerHTML = '<div class="model-list-status model-list-status-loading"><span class="model-list-status-text">正在请求接口…</span></div>'
  setModelListDialogToolbarVisible(false)
  setModelListAddButtonEnabled(false)
  const selectAll = document.getElementById('selectAllModelList')
  if (selectAll) {
    selectAll.checked = false
    selectAll.indeterminate = false
    selectAll.disabled = true
  }
  const selectedCountSpan = document.getElementById('modelListSelectedCount')
  if (selectedCountSpan) selectedCountSpan.textContent = '已选 0 项'

  dialog.classList.add('active')

  try {
    const result = await fetchProviderModelsList(provider)

    if (token !== modelListLoadToken) return
    if (modelListTargetProviderIndex !== providerIndex) return
    if (!dialog.classList.contains('active')) return

    if (result.success) {
      loadedModelsList = result.models || []
      renderModelListDialogBody(providerIndex)
    } else {
      showModelListDialogError(String(result.message || '加载失败'))
    }
  } catch (error) {
    if (token !== modelListLoadToken) return
    if (modelListTargetProviderIndex !== providerIndex) return
    if (!dialog.classList.contains('active')) return
    showModelListDialogError(String(error.message || '加载失败'))
  }
}

function closeModelListDialog() {
  modelListLoadToken += 1
  const dialog = document.getElementById('modelListDialog')
  if (dialog) {
    dialog.classList.remove('active')
  }
  modelListTargetProviderIndex = -1
  loadedModelsList = []
  setModelListDialogToolbarVisible(true)
  setModelListAddButtonEnabled(true)
  const selectAll = document.getElementById('selectAllModelList')
  if (selectAll) {
    selectAll.disabled = false
  }
}

function updateModelListSelection() {
  const checkboxes = document.querySelectorAll('.model-list-checkbox:not(:disabled)')
  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length
  const totalCount = checkboxes.length
  const selectAllCheckbox = document.getElementById('selectAllModelList')
  const selectedCountSpan = document.getElementById('modelListSelectedCount')

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = totalCount > 0 && checkedCount === totalCount
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount
  }
  if (selectedCountSpan) {
    selectedCountSpan.textContent = `已选 ${checkedCount} 项`
  }
}

function toggleSelectAllModelList(checked) {
  const checkboxes = document.querySelectorAll('.model-list-checkbox:not(:disabled)')
  checkboxes.forEach(cb => {
    cb.checked = checked
  })
  updateModelListSelection()
}

function addSelectedModelsFromList() {
  if (modelListTargetProviderIndex < 0 || !providers[modelListTargetProviderIndex]) {
    alert('供应商不存在')
    return
  }

  const checkboxes = document.querySelectorAll('.model-list-checkbox:not(:disabled):checked')
  const selectedModelIds = Array.from(checkboxes).map(cb => cb.dataset.modelId).filter(Boolean)

  if (selectedModelIds.length === 0) {
    alert('请选择至少一个模型')
    return
  }

  const provider = providers[modelListTargetProviderIndex]
  const existingModelIds = new Set(provider.models.map(m => m.id))
  let addedCount = 0

  loadedModelsList.forEach(loadedModel => {
    if (selectedModelIds.includes(loadedModel.id) && !existingModelIds.has(loadedModel.id)) {
      const reasoningRaw = loadedModel.reasoningMode === true
        ? 'true'
        : loadedModel.reasoningMode === false
          ? 'false'
          : ''
      const inputTypesStr = Array.isArray(loadedModel.inputTypes) && loadedModel.inputTypes.length > 0
        ? loadedModel.inputTypes.join(',')
        : ''
      const model = normalizeModelInput({
        modelId: loadedModel.id,
        modelName: loadedModel.name || loadedModel.id,
        contextWindow: loadedModel.contextWindow != null ? String(loadedModel.contextWindow) : '',
        maxTokens: loadedModel.maxTokens != null ? String(loadedModel.maxTokens) : '',
        reasoningRaw,
        inputTypes: inputTypesStr
      })
      const newModel = withModelRuntimeState(model)
      provider.models.push(newModel)
      addedCount++
    }
  })

  if (addedCount > 0) {
    selectedModelKeys.clear()
    saveConfigs()
    renderConfigs()
    closeModelListDialog()
    alert(`成功添加 ${addedCount} 个模型`)
  } else {
    alert('没有新模型被添加')
  }
}
