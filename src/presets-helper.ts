// Presets Helper - 负责读取和管理 Provider 和 Model 的预设数据

class PresetsHelper {
  constructor() {
    this.providersCache = null
    this.modelsCache = null
    this.loadingPromise = null
    this.isReady = false
  }

  // 获取预设数据的完整路径
  getPresetsPath(filename) {
    // 在浏览器环境中，我们使用相对路径
    return `./presets/${filename}`
  }

  // 读取 JSON 文件
  async loadJSON(filename) {
    try {
      const response = await fetch(this.getPresetsPath(filename))
      if (!response.ok) {
        throw new Error(`无法加载预设文件: ${filename} (状态码: ${response.status})`)
      }
      return await response.json()
    } catch (error) {
      console.error(`加载预设文件失败: ${filename}`, error)
      throw error
    }
  }

  // 初始化并加载所有预设数据
  async init() {
    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = (async () => {
      try {
        console.log('开始加载预设数据...')
        
        // 并行加载 Provider 和 Model 预设
        const [providerData, models] = await Promise.all([
          this.loadJSON('provider-presets.json'),
          this.loadJSON('model-presets.json')
        ])

        if (Array.isArray(providerData)) {
          this.providersCache = providerData
        } else if (providerData && Array.isArray(providerData.providers)) {
          this.providersCache = providerData.providers
        } else {
          this.providersCache = []
        }
        this.modelsCache = Array.isArray(models) ? models : []
        this.isReady = true

        console.log(`预设数据加载完成: ${this.providersCache.length} 个供应商, ${this.modelsCache.length} 个模型`)
        
        return {
          providers: this.providersCache,
          models: this.modelsCache
        }
      } catch (error) {
        console.error('初始化 Presets Helper 失败:', error)
        // 设置默认值以避免应用崩溃
        this.providersCache = []
        this.modelsCache = []
        this.isReady = true
        throw error
      }
    })()

    return this.loadingPromise
  }

  // 检查是否已准备好
  async waitForReady() {
    if (this.isReady) {
      return true
    }
    await this.init()
    return this.isReady
  }

  // 获取所有 Provider 预设
  getAllProviderPresets() {
    this.ensureInitialized()
    return this.providersCache || []
  }

  // 获取所有 Model 预设
  getAllModelPresets() {
    this.ensureInitialized()
    return this.modelsCache || []
  }

  // 根据 ID 获取 Provider 预设
  getProviderPresetById(id) {
    this.ensureInitialized()
    return this.providersCache.find(p => p.id === id) || null
  }

  // 根据 Provider ID 获取对应的 Model 预设
  getModelPresetsByProvider(providerId) {
    this.ensureInitialized()
    return this.modelsCache.filter(m => m.provider === providerId)
  }

  // 根据 Model ID 获取 Model 预设
  getModelPresetById(modelId) {
    this.ensureInitialized()
    return this.modelsCache.find(m => m.id === modelId) || null
  }

  // 搜索 Provider 预设（模糊匹配）
  searchProviders(query) {
    this.ensureInitialized()
    const searchTerm = String(query || '').toLowerCase().trim()
    if (!searchTerm) return this.getAllProviderPresets()

    return this.providersCache.filter(p => 
      p.id.toLowerCase().includes(searchTerm) ||
      p.name.toLowerCase().includes(searchTerm)
    )
  }

  // 搜索 Model 预设（模糊匹配）
  searchModels(query) {
    this.ensureInitialized()
    const searchTerm = String(query || '').toLowerCase().trim()
    if (!searchTerm) return this.getAllModelPresets()

    return this.modelsCache.filter(m => 
      m.id.toLowerCase().includes(searchTerm) ||
      m.name.toLowerCase().includes(searchTerm) ||
      m.provider.toLowerCase().includes(searchTerm)
    )
  }

  // 获取所有唯一的 Provider ID（从 Model 预设中提取）
  getUniqueProviderIds() {
    this.ensureInitialized()
    return Array.from(new Set(this.modelsCache.map(m => m.provider))).sort()
  }

  // 获取统计信息
  getStats() {
    this.ensureInitialized()
    return {
      providersCount: this.providersCache.length,
      modelsCount: this.modelsCache.length,
      uniqueProvidersInModels: this.getUniqueProviderIds().length,
      isReady: this.isReady
    }
  }

  // 确保 Helper 已初始化
  ensureInitialized() {
    if (this.providersCache === null || this.modelsCache === null) {
      console.warn('Presets Helper 尚未完全初始化，使用空数组作为缓存')
      this.providersCache = []
      this.modelsCache = []
    }
  }

  // 重新加载数据（用于调试或动态更新）
  async reload() {
    this.loadingPromise = null
    this.providersCache = null
    this.modelsCache = null
    this.isReady = false
    return await this.init()
  }
}

// 创建全局单例实例
const presetsHelper = new PresetsHelper()

// 向后兼容的导出接口
const PROVIDER_PRESETS = []
const MODEL_ID_PRESETS = []

// 暴露给渲染进程的接口
window.PresetsHelper = presetsHelper

// 向后兼容的全局函数
window.getProviderPresetById = (id) => presetsHelper.getProviderPresetById(id)
window.getAllProviderPresets = () => presetsHelper.getAllProviderPresets()
window.getAllModelPresets = () => presetsHelper.getAllModelPresets()

// 立即开始异步加载预设数据，不阻塞其他脚本的执行
presetsHelper.init().then(() => {
  // 更新全局变量
  window.PROVIDER_PRESETS = presetsHelper.getAllProviderPresets()
  window.MODEL_ID_PRESETS = presetsHelper.getAllModelPresets().map(m => m.id)
  console.log('预设数据已加载到全局变量')
  
  // 触发自定义事件，通知其他组件预设数据已准备好
  if (typeof window.CustomEvent !== 'undefined') {
    const event = new CustomEvent('presets-ready', {
      detail: {
        providers: window.PROVIDER_PRESETS,
        models: window.MODEL_ID_PRESETS
      }
    })
    window.dispatchEvent(event)
  }
}).catch(error => {
  console.error('初始化 Presets Helper 失败，将使用空数组', error)
  window.PROVIDER_PRESETS = []
  window.MODEL_ID_PRESETS = []
  presetsHelper.isReady = true
})

// 模块化导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = presetsHelper
}