function openProviderModal(index = -1) {
  editingProviderIndex = index
  const modal = document.getElementById('providerModal')
  const modalTitle = document.getElementById('providerModalTitle')
  renderInputHistories()

  if (index >= 0) {
    modalTitle.textContent = '编辑供应商'
    const provider = providers[index]
    document.getElementById('providerName').value = provider.name
    document.getElementById('apiType').value = provider.apiType
    document.getElementById('url').value = provider.url
    document.getElementById('endpoint').value = provider.endpoint
    document.getElementById('apiKey').value = provider.apiKey || ''
  } else {
    modalTitle.textContent = '添加供应商'
    document.getElementById('providerName').value = ''
    document.getElementById('apiType').value = 'openai'
    document.getElementById('url').value = ''
    updateDefaults()
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
  renderInputHistories()

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
