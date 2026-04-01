type ApiType = 'openai' | 'anthropic'

interface ModelConfig {
  id: string
  name?: string
  contextWindow?: number | null
  maxTokens?: number | null
  reasoningMode?: boolean | null
  inputTypes?: string[] | null
  status?: 'pending' | 'success' | 'error'
  lastCheck?: string | null
  lastMessage?: string | null
}

interface ProviderConfig {
  id: string
  name?: string
  apiType: ApiType
  url: string
  endpoint: string
  website?: string
  apiKey?: string
  models: ModelConfig[]
}

interface ExportEntry {
  title: string
  content: string
  type?: string | null
}

interface Exporter {
  id: string
  displayName: string
  export(configs: any[]): ExportEntry[] | ExportEntry | string
}

interface Window {
  BaseExporter: new (id: string, displayName: string) => Exporter
  ExporterRegistry: {
    registerExporter(exporter: Exporter): void
    getExporter(id: string): Exporter | undefined
    getAllExporters(): Exporter[]
  }
  PresetsHelper: any
  PROVIDER_PRESETS: any[]
  MODEL_ID_PRESETS: string[]
  getProviderPresetById(id: string): any
  getAllProviderPresets(): any[]
  getAllModelPresets(): any[]
  highlightCode(code: string, language: string): string
  renderMarkdown(markdown: string): string
  electronAPI: {
    loadConfigs(): Promise<any[]>
    saveConfigs(configs: any[]): Promise<{ success: boolean; message?: string }>
    checkModel(config: any): Promise<any>
    detectModelCapabilities(config: any): Promise<any>
    openExternal(target: string): Promise<boolean>
    runCommandInTerminal(command: string): Promise<{ success: boolean; message?: string }>
    openHTMLWithScript(script: string): Promise<{ success: boolean; message?: string }>
  }
}
