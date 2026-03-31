function renderConfigs() {
  const providerList = document.getElementById('providerList')
  renderInputHistories()

  if (providers.length === 0) {
    providerList.innerHTML = '<div class="empty-state">暂无供应商，点击下方按钮添加供应商</div>'
    updateSelectionControls()
    return
  }

  providerList.innerHTML = providers.map((provider, providerIndex) => {
    const providerSelection = getProviderSelectionState(providerIndex)
    const apiTypeLabel = provider.apiType === 'anthropic' ? 'Anthropic' : 'OpenAI'
    const apiKeyDisplay = getApiKeyDisplay(provider, providerIndex)
    const apiKeyEye = visibleApiKeyProviders.has(providerIndex) ? '🙈' : '👁️'
    const website = String(provider.website || '').trim()
    const websiteText = website || '-'
    const websiteHtml = website
      ? `<button class="provider-website-link selectable-item" onclick="openProviderWebsite(${providerIndex}, event)" title="点击打开官网">${escapeHtml(websiteText)}</button>`
      : `<span class="meta-value selectable-item">-</span>`

    const modelHtml = provider.models.map((model, modelIndex) => {
      const key = getModelKey(providerIndex, modelIndex)
      const statusState = getModelStatusState(model)
      const contextWindowText = model.contextWindow || '-'
      const maxTokensText = model.maxTokens || '-'
      const reasoningText = model.reasoningMode === true ? '启用' : model.reasoningMode === false ? '禁用' : '-'
      const inputTypesText = Array.isArray(model.inputTypes) && model.inputTypes.length > 0 ? model.inputTypes.join(', ') : '-'

      return `
        <div class="model-item" data-provider-index="${providerIndex}" data-model-index="${modelIndex}" ondragover="handleModelDragOver(${providerIndex}, event)" ondrop="handleModelDrop(${providerIndex}, ${modelIndex}, event)">
          <div class="model-row">
            <label class="row-checkbox-hit">
              <input class="row-checkbox" type="checkbox" ${selectedModelKeys.has(key) ? 'checked' : ''} onchange="toggleSelect(${providerIndex}, ${modelIndex})">
            </label>
            <div class="model-content">
              <div class="model-top">
                <h2 class="model-name"><span class="selectable-item">${escapeHtml(model.modelName)}</span> <span class="selectable-item">(${escapeHtml(model.name || model.modelName)})</span></h2>
              </div>
              <div class="model-params">
                <span class="param-item"><span class="meta-label selectable-item">Context Window:</span> <span class="meta-value selectable-item">${contextWindowText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Max Tokens:</span> <span class="meta-value selectable-item">${maxTokensText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Reasoning:</span> <span class="meta-value selectable-item">${reasoningText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Input:</span> <span class="meta-value selectable-item">${inputTypesText}</span></span>
              </div>
            </div>
            <div class="model-status ${statusState.statusClass}">${renderModelStatusHtml(model)}</div>
            <div class="model-actions">
              <button class="button button-success" onclick="checkModel(${providerIndex}, ${modelIndex})">检查</button>
              <button class="button button-secondary" onclick="openModelModal(${providerIndex}, ${modelIndex})">编辑</button>
              <button class="button button-danger" onclick="deleteModel(${providerIndex}, ${modelIndex})">删除</button>
              <span class="drag-handle" draggable="true" ondragstart="handleModelDragStart(${providerIndex}, ${modelIndex}, event)" title="拖拽排序">⠿</span>
            </div>
          </div>
        </div>
      `
    }).join('')

    return `
      <div class="provider-item" ondragover="handleProviderDragOver(event)" ondrop="handleProviderDrop(${providerIndex}, event)">
        <div class="provider-content">
          <div class="provider-top">
            <label class="row-checkbox-hit">
              <input class="row-checkbox provider-checkbox" data-provider-index="${providerIndex}" type="checkbox" ${providerSelection.checked ? 'checked' : ''} onchange="toggleProviderSelect(${providerIndex}, this.checked)">
            </label>
            <h2 class="provider-name">${escapeHtml(provider.name)}</h2>
            <div class="provider-actions">
              <button class="button" onclick="openModelModal(${providerIndex})">+ 添加模型</button>
              <button class="button button-secondary" onclick="openProviderModal(${providerIndex})">编辑</button>
              <button class="button button-danger provider-delete-button" onclick="deleteProvider(${providerIndex})">删除</button>
              <span class="drag-handle" draggable="true" ondragstart="handleProviderDragStart(${providerIndex}, event)" title="拖拽供应商排序">⠿</span>
            </div>
          </div>
          <div class="provider-row" title="${escapeHtml(websiteText)}">
            <span class="meta-label selectable-item">官网:</span> ${websiteHtml}
          </div>
          <div class="provider-row">
            <span class="meta-label selectable-item">接口:</span> <span class="meta-value selectable-item">${apiTypeLabel}</span>
          </div>
          <div class="provider-row" title="${escapeHtml(joinUrl(provider.url, provider.endpoint))}">
            <span class="meta-label selectable-item">地址:</span> <span class="meta-value selectable-item">${escapeHtml(joinUrl(provider.url, provider.endpoint))}</span>
          </div>
          <div class="provider-row">
            <span class="meta-label selectable-item">密钥:</span> <span class="meta-value selectable-item">${escapeHtml(apiKeyDisplay)}</span><button class="api-key-eye" onclick="toggleApiKeyVisibility(${providerIndex}, event)" title="显示或隐藏 API Key">${apiKeyEye}</button>
          </div>
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            ${modelHtml || '<div class="empty-state" style="padding: 10px;">该供应商下暂无模型</div>'}
          </div>
        </div>
      </div>
    `
  }).join('')

  document.querySelectorAll('.provider-checkbox').forEach((checkbox) => {
    const providerIndex = Number.parseInt(checkbox.dataset.providerIndex || '-1', 10)
    if (providerIndex < 0) return
    const state = getProviderSelectionState(providerIndex)
    checkbox.indeterminate = state.indeterminate
  })

  updateSelectionControls()
}

document.addEventListener('DOMContentLoaded', () => {
  initExportOptions()
  loadConfigs()
  renderConfigs()
})

document.getElementById('providerModal').addEventListener('click', (e) => {
  if (e.target.id === 'providerModal') {
    closeProviderModal()
  }
})

document.getElementById('modelModal').addEventListener('click', (e) => {
  if (e.target.id === 'modelModal') {
    closeModelModal()
  }
})

document.getElementById('exportModal').addEventListener('click', (e) => {
  if (e.target.id === 'exportModal') {
    closeExportModal()
  }
})
