function getDefaultModelOptions(modelName) {
  const id = String(modelName || '').toLowerCase()
  let contextWindow = 128000
  let maxTokens = 8192
  let reasoning = true
  let input = ['text', 'image']

  if (id.includes('haiku') || id.includes('mini') || id.includes('small')) {
    contextWindow = 64000
    maxTokens = 4096
    input = ['text']
  }
  if (id.includes('embedding')) {
    contextWindow = 8192
    maxTokens = 2048
    reasoning = false
    input = ['text']
  }
  if (id.includes('1m') || id.includes('pro')) {
    contextWindow = 1024000
    maxTokens = 32768
  }

  return { contextWindow, maxTokens, reasoning, input }
}

window.ModelDefaults = {
  getDefaultModelOptions
}
