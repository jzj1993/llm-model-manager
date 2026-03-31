function renderProviderPresetOptions() {
  const presetSelect = document.getElementById('providerPreset')
  if (!presetSelect) return

  const defaultOption = '<option value="">不使用预设</option>'
  const presetOptions = PROVIDER_PRESETS.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
  presetSelect.innerHTML = [defaultOption, ...presetOptions].join('')
}

function findMatchedPreset(provider) {
  if (!provider) return null
  const normalizedUrl = normalizeUrl(String(provider.url || '').trim())
  const normalizedEndpoint = normalizeEndpoint(String(provider.endpoint || '').trim())
  const normalizedName = String(provider.name || '').trim().toLowerCase()

  return PROVIDER_PRESETS.find((preset) => {
    const sameName = preset.name.toLowerCase() === normalizedName
    const sameUrl = normalizeUrl(String(preset.url || '')) === normalizedUrl
    const sameEndpoint = normalizeEndpoint(String(preset.endpoint || '')) === normalizedEndpoint
    return sameName || (sameUrl && sameEndpoint)
  }) || null
}

function applyProviderPreset() {
  const presetSelect = document.getElementById('providerPreset')
  if (!presetSelect) return
  const preset = getProviderPresetById(presetSelect.value)
  if (!preset) return

  const providerNameInput = document.getElementById('providerName')
  const apiTypeSelect = document.getElementById('apiType')
  const urlInput = document.getElementById('url')
  const endpointInput = document.getElementById('endpoint')
  const providerWebsiteInput = document.getElementById('providerWebsite')

  providerNameInput.value = preset.name
  apiTypeSelect.value = preset.apiType
  urlInput.value = preset.url
  endpointInput.value = preset.endpoint
  providerWebsiteInput.value = preset.website || preset.url || ''
}

function openProviderModal(index = -1) {
  editingProviderIndex = index
  const modal = document.getElementById('providerModal')
  const modalTitle = document.getElementById('providerModalTitle')
  const presetSelect = document.getElementById('providerPreset')
  renderProviderPresetOptions()
  renderInputHistories()

  if (index >= 0) {
    modalTitle.textContent = '编辑供应商'
    const provider = providers[index]
    document.getElementById('providerName').value = provider.name
    document.getElementById('apiType').value = provider.apiType
    document.getElementById('url').value = provider.url
    document.getElementById('endpoint').value = provider.endpoint
    document.getElementById('providerWebsite').value = provider.website || ''
    document.getElementById('apiKey').value = provider.apiKey || ''
    const matchedPreset = findMatchedPreset(provider)
    if (presetSelect) {
      presetSelect.value = matchedPreset ? matchedPreset.id : ''
    }
  } else {
    modalTitle.textContent = '添加供应商'
    if (presetSelect) {
      presetSelect.value = ''
    }
    document.getElementById('providerName').value = ''
    document.getElementById('apiType').value = 'openai'
    document.getElementById('url').value = ''
    updateDefaults()
    document.getElementById('providerWebsite').value = ''
    document.getElementById('apiKey').value = ''
  }

  modal.classList.add('active')
}

function closeProviderModal() {
  const modal = document.getElementById('providerModal')
  modal.classList.remove('active')
  editingProviderIndex = -1
}

function saveProvider() {
  const name = document.getElementById('providerName').value.trim()
  const apiType = document.getElementById('apiType').value
  const rawUrl = normalizeUrl(document.getElementById('url').value.trim())
  const rawEndpoint = normalizeEndpoint(document.getElementById('endpoint').value.trim())
  const apiKey = document.getElementById('apiKey').value.trim()
  const website = document.getElementById('providerWebsite').value.trim()
  const normalizedOpenAI = normalizeOpenAIUrlAndEndpoint(apiType, rawUrl, rawEndpoint)
  const url = normalizedOpenAI.url
  const endpoint = normalizedOpenAI.endpoint

  if (!name || !url || !endpoint) {
    alert('请填写供应商必填字段')
    return
  }

  const provider = {
    name,
    apiType,
    url,
    endpoint,
    website,
    apiKey,
    models: editingProviderIndex >= 0 ? providers[editingProviderIndex].models : []
  }

  if (editingProviderIndex >= 0) {
    providers[editingProviderIndex] = provider
  } else {
    providers.push(provider)
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

function openModelModal(providerIndex, modelIndex = -1) {
  editingModelProviderIndex = providerIndex
  editingModelIndex = modelIndex
  const modal = document.getElementById('modelModal')
  const titleEl = document.getElementById('modelModalTitle')
  const probeResultEl = document.getElementById('modelProbeResult')
  const probeButtonEl = document.getElementById('probeModelButton')
  renderInputHistories()
  if (probeResultEl) {
    probeResultEl.textContent = '可自动探测 Context Window / Max Tokens'
    probeResultEl.style.color = '#999'
  }
  if (probeButtonEl) {
    probeButtonEl.disabled = false
    probeButtonEl.textContent = '探测模型参数'
  }

  if (modelIndex >= 0) {
    titleEl.textContent = '编辑模型'
    const model = providers[providerIndex].models[modelIndex]
    document.getElementById('modelName').value = model.modelName || ''
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

  const modelName = document.getElementById('modelName').value.trim()
  const rawDisplayName = document.getElementById('modelDisplayName').value.trim()
  const name = rawDisplayName || modelName
  const contextWindow = parseOptionalInteger(document.getElementById('contextWindow').value)
  const maxTokens = parseOptionalInteger(document.getElementById('maxTokens').value)
  const reasoningRaw = document.getElementById('reasoningMode').value
  const inputTypes = parseInputTypes(document.getElementById('inputTypes').value)
  const reasoningMode = reasoningRaw === '' ? null : reasoningRaw === 'true'

  if (!modelName) {
    alert('请填写模型 ID')
    return
  }

  const model = withModelRuntimeState({
    name,
    modelName,
    contextWindow,
    maxTokens,
    reasoningMode,
    inputTypes
  })

  const modelList = providers[editingModelProviderIndex].models
  if (editingModelIndex >= 0) {
    const old = modelList[editingModelIndex]
    model.status = old.status
    model.lastCheck = old.lastCheck
    model.lastMessage = old.lastMessage
    modelList[editingModelIndex] = model
  } else {
    modelList.push(model)
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
    if (!result?.success) {
      clearModelCapabilityFields()
    }

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

    if (probeResultEl) {
      probeResultEl.textContent = result?.message || '探测完成'
      probeResultEl.style.color = result?.success ? '#0f766e' : '#b45309'
    }
  } catch (error) {
    clearModelCapabilityFields()
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
      modelName: model.modelName,
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
