let providers = []
let selectedModelKeys = new Set()
let visibleApiKeyProviders = new Set()

let editingProviderIndex = -1
let editingModelProviderIndex = -1
let editingModelIndex = -1
let exportDialogConfigs = []
let exportEntryItems = []
let isCheckingSelectedModels = false

/** 模型列表对话框对应的供应商下标；关闭对话框时重置为 -1 */
let modelListTargetProviderIndex = -1
let loadedModelsList = []
/** 递增以作废关闭对话框后仍在进行的加载请求 */
let modelListLoadToken = 0

let dragState = {
  type: null,
  providerIndex: -1,
  modelIndex: -1
}
