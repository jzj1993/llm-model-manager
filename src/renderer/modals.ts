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

function openProviderModal(index = -1) {
  editingProviderIndex = index
  const modal = document.getElementById('providerModal')
  const modalTitle = document.getElementById('providerModalTitle')
  renderProviderIdPresetOptions()
  renderProviderUrlEndpointPresetOptions()

  if (index >= 0) {
    modalTitle.textContent = '编辑供应商'
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
    modalTitle.textContent = '添加供应商'
    document.getElementById('providerName').value = ''
    document.getElementById('providerId').value = ''
    document.getElementById('apiType').value = 'openai'
    document.getElementById('url').value = ''
    updateDefaults()
    document.getElementById('providerWebsite').value = ''
    document.getElementById('apiKey').value = ''
  }

  resetApiKeyVisibility()

  modal.classList.add('active')
}

function closeProviderModal() {
  const modal = document.getElementById('providerModal')
  modal.classList.remove('active')
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

function toggleProviderModalApiKeyVisibility() {
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
  closeProviderModal()
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

function openModelModal(providerIndex, modelIndex = -1) {
  editingModelProviderIndex = providerIndex
  editingModelIndex = modelIndex
  const modal = document.getElementById('modelModal')
  const titleEl = document.getElementById('modelModalTitle')
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
  modal.classList.add('active')
}

function closeModelModal() {
  const modal = document.getElementById('modelModal')
  modal.classList.remove('active')
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
  closeModelModal()
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
    const result = await window.electronAPI.detectModelCapabilities({
      apiType: provider.apiType,
      url: provider.url,
      endpoint: provider.endpoint,
      apiKey: provider.apiKey,
      modelName
    })

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

    console.log('[detectModelCapabilities] 完整结果（含 probeDebug 与各次 responseBody）', result)

    if (probeResultEl) {
      probeResultEl.textContent = result?.message || '探测完成'
      probeResultEl.style.color = result?.success ? '#0f766e' : '#b45309'
    }
  } catch (error) {
    console.error('[detectModelCapabilities] 调用异常', error)
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
  const statusDiv = modelItem.querySelector('.model-status')
  if (!statusDiv) return

  statusDiv.className = 'model-status checking'
  statusDiv.innerHTML = '<span class="status-text">检查中...</span>'

  try {
    const result = await window.electronAPI.checkModel({
      apiType: provider.apiType,
      url: provider.url,
      endpoint: provider.endpoint,
      modelName: model.id,
      apiKey: provider.apiKey
    })

    providers[providerIndex].models[modelIndex].status = result.success ? 'success' : 'error'
    providers[providerIndex].models[modelIndex].lastCheck = new Date().toISOString()
    providers[providerIndex].models[modelIndex].lastMessage = result.message
    saveConfigs()

    statusDiv.className = `model-status ${result.success ? 'success' : 'error'}`
    statusDiv.innerHTML = renderModelStatusHtml(providers[providerIndex].models[modelIndex])
  } catch (error) {
    providers[providerIndex].models[modelIndex].status = 'error'
    providers[providerIndex].models[modelIndex].lastCheck = new Date().toISOString()
    providers[providerIndex].models[modelIndex].lastMessage = error.message
    saveConfigs()

    statusDiv.className = 'model-status error'
    statusDiv.innerHTML = renderModelStatusHtml(providers[providerIndex].models[modelIndex])
  }
}

// 监听预设数据加载完成事件
window.addEventListener('presets-ready', () => {
  // 如果供应商模态框当前是打开的，重新渲染预设选项
  const modal = document.getElementById('providerModal')
  if (modal && modal.classList.contains('active')) {
    renderProviderIdPresetOptions()
    renderProviderUrlEndpointPresetOptions()
    console.log('预设选项已更新')
  }
  const modelModal = document.getElementById('modelModal')
  if (modelModal && modelModal.classList.contains('active') && editingModelProviderIndex >= 0) {
    renderModelNamePresetOptions(editingModelProviderIndex)
  }
  console.log('预设数据已准备好，供应商数量:', window.PROVIDER_PRESETS?.length || 0)
})
