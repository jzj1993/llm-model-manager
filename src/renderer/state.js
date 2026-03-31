let providers = []
let selectedModelKeys = new Set()
let visibleApiKeyProviders = new Set()

let editingProviderIndex = -1
let editingModelProviderIndex = -1
let editingModelIndex = -1
let exportModalConfigs = []
let exportEntryItems = []
let isCheckingSelectedModels = false

let dragState = {
  type: null,
  providerIndex: -1,
  modelIndex: -1
}
