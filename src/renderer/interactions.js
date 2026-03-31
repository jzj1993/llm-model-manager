function updateSelectionControls() {
  const allCheckbox = document.getElementById('selectAllConfigs')
  const selectedCountEl = document.getElementById('selectedCount')
  const exportBtn = document.getElementById('exportSelectedButton')
  const totalCount = providers.reduce((sum, provider) => sum + provider.models.length, 0)
  const selectedCount = selectedModelKeys.size
  const allSelected = totalCount > 0 && selectedCount === totalCount
  const partialSelected = selectedCount > 0 && selectedCount < totalCount

  if (allCheckbox) {
    allCheckbox.checked = allSelected
    allCheckbox.indeterminate = partialSelected
  }
  if (selectedCountEl) {
    selectedCountEl.textContent = `已选 ${selectedCount} 项`
  }
  if (exportBtn) {
    exportBtn.disabled = selectedCount === 0
  }
}

function toggleSelect(providerIndex, modelIndex) {
  const key = getModelKey(providerIndex, modelIndex)
  if (selectedModelKeys.has(key)) {
    selectedModelKeys.delete(key)
  } else {
    selectedModelKeys.add(key)
  }
  updateSelectionControls()
  renderConfigs()
}

function toggleProviderSelect(providerIndex, checked) {
  const total = getProviderModelCount(providerIndex)
  for (let i = 0; i < total; i += 1) {
    const key = getModelKey(providerIndex, i)
    if (checked) {
      selectedModelKeys.add(key)
    } else {
      selectedModelKeys.delete(key)
    }
  }
  updateSelectionControls()
  renderConfigs()
}

function toggleSelectAll(checked) {
  selectedModelKeys.clear()
  if (checked) {
    providers.forEach((provider, providerIndex) => {
      provider.models.forEach((_, modelIndex) => {
        selectedModelKeys.add(getModelKey(providerIndex, modelIndex))
      })
    })
  }
  renderConfigs()
}

function toggleApiKeyVisibility(providerIndex, event) {
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  const raw = String(providers[providerIndex]?.apiKey || '').trim()
  if (!raw) {
    alert('该供应商未填写 API Key')
    return
  }
  if (visibleApiKeyProviders.has(providerIndex)) {
    visibleApiKeyProviders.delete(providerIndex)
  } else {
    visibleApiKeyProviders.add(providerIndex)
  }
  renderConfigs()
}

function handleProviderDragStart(providerIndex, event) {
  dragState = {
    type: 'provider',
    providerIndex,
    modelIndex: -1
  }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', `provider:${providerIndex}`)
  applyDragImageFromHandle(event)
}

function handleProviderDragOver(event) {
  if (dragState.type !== 'provider') return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function handleProviderDrop(targetProviderIndex, event) {
  if (dragState.type !== 'provider') return
  event.preventDefault()
  event.stopPropagation()

  const sourceProviderIndex = dragState.providerIndex
  dragState.type = null

  if (sourceProviderIndex < 0 || sourceProviderIndex === targetProviderIndex) return

  const moved = providers[sourceProviderIndex]
  providers.splice(sourceProviderIndex, 1)
  const insertIndex = sourceProviderIndex < targetProviderIndex ? targetProviderIndex - 1 : targetProviderIndex
  providers.splice(insertIndex, 0, moved)

  selectedModelKeys.clear()
  saveConfigs()
  renderConfigs()
}

function handleModelDragStart(providerIndex, modelIndex, event) {
  dragState = {
    type: 'model',
    providerIndex,
    modelIndex
  }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', `model:${providerIndex}:${modelIndex}`)
  applyDragImageFromHandle(event)
}

function applyDragImageFromHandle(event) {
  const handle = event.target.closest('.drag-handle')
  const item = event.target.closest('.model-item, .provider-item')
  if (!handle || !item) return

  const itemRect = item.getBoundingClientRect()
  const handleRect = handle.getBoundingClientRect()

  const rawX = handleRect.left - itemRect.left + (handleRect.width / 2)
  const rawY = handleRect.top - itemRect.top + (handleRect.height / 2)

  const offsetX = Math.max(0, Math.min(rawX, Math.max(0, itemRect.width - 1)))
  const offsetY = Math.max(0, Math.min(rawY, Math.max(0, itemRect.height - 1)))

  event.dataTransfer.setDragImage(item, offsetX, offsetY)
}

function handleModelDragOver(targetProviderIndex, event) {
  if (dragState.type !== 'model') return
  if (dragState.providerIndex !== targetProviderIndex) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function handleModelDrop(targetProviderIndex, targetModelIndex, event) {
  if (dragState.type !== 'model') return
  event.preventDefault()
  event.stopPropagation()

  const sourceProviderIndex = dragState.providerIndex
  const sourceModelIndex = dragState.modelIndex
  dragState.type = null

  if (sourceProviderIndex !== targetProviderIndex) return
  if (sourceModelIndex < 0 || sourceModelIndex === targetModelIndex) return

  const modelList = providers[targetProviderIndex]?.models
  if (!modelList) return

  const moved = modelList[sourceModelIndex]
  modelList.splice(sourceModelIndex, 1)
  const insertIndex = sourceModelIndex < targetModelIndex ? targetModelIndex - 1 : targetModelIndex
  modelList.splice(insertIndex, 0, moved)

  selectedModelKeys.clear()
  saveConfigs()
  renderConfigs()
}

function getModelStatusState(model) {
  const normalizedStatus = model.status || 'pending'
  if (normalizedStatus === 'success') {
    return {
      statusClass: 'success',
      statusText: '成功',
      detail: model.lastMessage || ''
    }
  }
  if (normalizedStatus === 'error') {
    return {
      statusClass: 'error',
      statusText: '失败',
      detail: model.lastMessage || ''
    }
  }
  return {
    statusClass: 'pending',
    statusText: '未检查',
    detail: ''
  }
}

function renderModelStatusHtml(model) {
  const state = getModelStatusState(model)
  const detailHtml = state.detail
    ? `<span class="status-info" title="查看详情">i<span class="status-tooltip">${escapeHtml(state.detail)}</span></span>`
    : ''
  return `<span class="status-text">${state.statusText}</span>${detailHtml}`
}
