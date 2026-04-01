function renderConfigs() {
  const providerList = document.getElementById('providerList')

  if (providers.length === 0) {
    providerList.innerHTML = '<div class="empty-state">暂无供应商，点击下方按钮添加供应商</div>'
    updateSelectionControls()
    return
  }

  providerList.innerHTML = providers.map((provider, providerIndex) => {
    const providerId = String(provider.id || '').trim() || '-'
    const providerDisplayName = String(provider.name || '').trim() || providerId
    const providerSelection = getProviderSelectionState(providerIndex)
    const apiTypeLabel = provider.apiType === 'anthropic' ? 'Anthropic' : 'OpenAI'
    const apiKeyDisplay = getApiKeyDisplay(provider, providerIndex)
    const apiKeyVisible = visibleApiKeyProviders.has(providerIndex)
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
                <div class="model-title"><span class="model-display-name selectable-item">${escapeHtml(model.name || model.id)}</span> <span class="model-id selectable-item">${escapeHtml(model.id)}</span></div>
              </div>
              <div class="model-params">
                <span class="param-item"><span class="meta-label selectable-item">Context Window:</span> <span class="meta-value selectable-item">${contextWindowText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Max Tokens:</span> <span class="meta-value selectable-item">${maxTokensText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Reasoning:</span> <span class="meta-value selectable-item">${reasoningText}</span></span> |
                <span class="param-item"><span class="meta-label selectable-item">Input:</span> <span class="meta-value selectable-item">${inputTypesText}</span></span>
              </div>
            </div>
            <div class="model-actions">
              ${renderModelCheckClusterHtml(providerIndex, modelIndex, model)}
              <button class="button button-light-secondary" onclick="openModelDialog(${providerIndex}, ${modelIndex})">编辑</button>
              <button class="button button-light-danger" onclick="deleteModel(${providerIndex}, ${modelIndex})">删除</button>
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
            <div class="provider-title"><span class="provider-display-name selectable-item">${escapeHtml(providerDisplayName)}</span> <span class="provider-id selectable-item">${escapeHtml(providerId)}</span></div>
            <div class="provider-actions">
              <button class="button button-light-primary" onclick="openModelDialog(${providerIndex})">+ 添加模型</button>
              <button class="button button-light-primary" onclick="loadProviderModelList(${providerIndex})">+ 加载模型列表</button>
              <button class="button button-light-secondary" onclick="openProviderDialog(${providerIndex})">编辑</button>
              <button class="button button-light-secondary" onclick="duplicateProvider(${providerIndex})">复制</button>
              <button class="button button-light-danger" onclick="deleteProvider(${providerIndex})">删除</button>
              <span class="drag-handle" draggable="true" ondragstart="handleProviderDragStart(${providerIndex}, event)" title="拖拽排序">⠿</span>
            </div>
          </div>
          <div class="provider-meta-grid">
            <div class="provider-row" title="${escapeHtml(websiteText)}">
              <span class="meta-label selectable-item">官网:</span>
              <span class="provider-meta-value-truncate">${websiteHtml}</span>
            </div>
            <div class="provider-row">
              <span class="meta-label selectable-item">接口:</span>
              <span class="provider-meta-value-truncate meta-value selectable-item">${apiTypeLabel}</span>
            </div>
            <div class="provider-row" title="${escapeHtml(joinUrl(provider.url, provider.endpoint))}">
              <span class="meta-label selectable-item">地址:</span>
              <span class="provider-meta-value-truncate meta-value selectable-item">${escapeHtml(joinUrl(provider.url, provider.endpoint))}</span>
            </div>
            <div class="provider-row" title="${escapeHtml(apiKeyDisplay)}">
              <span class="meta-label selectable-item">密钥:</span>
              <span class="provider-meta-key-with-eye">
                <span class="provider-meta-value-truncate provider-meta-key-value meta-value selectable-item">${escapeHtml(apiKeyDisplay)}</span>
                <button
                  class="api-key-eye api-key-eye-inline"
                  data-visible="${apiKeyVisible ? 'true' : 'false'}"
                  onclick="toggleProviderListApiKeyVisibility(${providerIndex}, event)"
                  aria-label="${apiKeyVisible ? '隐藏 API Key' : '显示 API Key'}"
                  title="${apiKeyVisible ? '隐藏 API Key' : '显示 API Key'}"
                >
                <span class="sr-only">切换 API Key 可见性</span>
                <svg class="eye-icon eye-open" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
                  <circle cx="12" cy="12" r="3.2"></circle>
                </svg>
                <svg class="eye-icon eye-closed" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18"></path>
                  <path d="M10.6 6.2A11.3 11.3 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-4.1 4.4"></path>
                  <path d="M8.6 8.6A5 5 0 0 0 7 12a5 5 0 0 0 7.4 4.4"></path>
                  <path d="M2 12s1.7-2.9 4.8-4.7"></path>
                </svg>
              </button>
              </span>
            </div>
          </div>
          <div class="model-list">
            ${modelHtml || '<div class="empty-state model-list-empty">该供应商下暂无模型</div>'}
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

document.addEventListener('DOMContentLoaded', async () => {
  initComboboxes(['providerId', 'url', 'endpoint', 'modelName'])
  initExportOptions()
  await loadConfigs()
  renderConfigs()
})
