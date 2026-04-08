import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { exporters } from '../../exporters'
import type { ExportEntry, ModelListDialogState } from '@shared/types'
import type { ModelConfig, ProviderConfig } from '@shared/types'
import type { ComboBoxOption } from '@/components/ui/combobox'
import { checkModelViaHttp, fetchProviderModelsList } from '@/lib/provider-api'
import {
  emptyModelForm,
  emptyProviderForm,
  maskApiKey,
  modelKey,
  normalizeProviders,
  type ModelForm
} from '@/lib/app-constants'
import { buildEnvCommandFromPayload } from '@/lib/export-render'
import {
  applyModelPresetById,
  buildEndpointComboOptions,
  buildModelIdComboOptions,
  buildUrlComboOptions,
  getModelPresetCandidates,
  type ProviderForm
} from '@/lib/preset-forms'
import { loadPresets, type ModelPreset, type ProviderPreset } from '@/lib/presets'

function applyModelCheckResult(
  prev: ProviderConfig[],
  providerIndex: number,
  modelIndex: number,
  expectedModelId: string,
  patch: { status: 'success' | 'error'; lastCheck: string | null; lastMessage: string | null }
): ProviderConfig[] {
  const p = prev[providerIndex]
  if (!p?.models[modelIndex] || p.models[modelIndex].id !== expectedModelId) return prev
  const next = [...prev]
  next[providerIndex] = { ...p, models: [...p.models] }
  next[providerIndex].models[modelIndex] = { ...next[providerIndex].models[modelIndex], ...patch }
  return next
}

export function useAppState() {
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [providerDialog, setProviderDialog] = useState<{ open: boolean; index: number }>({ open: false, index: -1 })
  const [modelDialog, setModelDialog] = useState<{ open: boolean; providerIndex: number; modelIndex: number }>({
    open: false,
    providerIndex: -1,
    modelIndex: -1
  })
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm)
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm)
  const [providerPresets, setProviderPresets] = useState<ProviderPreset[]>([])
  const [providerBaseUrlPresets, setProviderBaseUrlPresets] = useState<string[]>([])
  const [providerEndpointPresets, setProviderEndpointPresets] = useState<string[]>([])
  const [modelPresets, setModelPresets] = useState<ModelPreset[]>([])
  const [exportOpen, setExportOpen] = useState(false)
  const [exporterId, setExporterId] = useState(exporters[0]?.id || '')
  const [exportEntries, setExportEntries] = useState<ExportEntry[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set())
  const [checkingModelKeys, setCheckingModelKeys] = useState<Set<string>>(() => new Set())
  const checkingModelGuardRef = useRef(new Set<string>())
  const [modelListDialog, setModelListDialog] = useState<ModelListDialogState>(null)

  const totalModelCount = useMemo(
    () => providers.reduce((sum, provider) => sum + provider.models.length, 0),
    [providers]
  )

  const selectedConfigs = useMemo(() => {
    const items: { provider: ProviderConfig; model: ModelConfig }[] = []
    for (const provider of providers) {
      for (const model of provider.models) {
        if (selected.has(modelKey(provider.id, model.id))) items.push({ provider, model })
      }
    }
    return items
  }, [providers, selected])

  const providerPresetOptions = useMemo<ComboBoxOption<ProviderPreset>[]>(
    () =>
      providerPresets.map((p) => ({
        value: p.id,
        label: p.name || '',
        keywords: [
          p.id,
          p.name || '',
          ...(p.apiConfigs || []).flatMap((c) => [c.baseUrl, c.endpoint, c.apiType])
        ].filter(Boolean),
        data: p
      })),
    [providerPresets]
  )

  const urlPresetOptions = useMemo(() => buildUrlComboOptions(providerBaseUrlPresets), [providerBaseUrlPresets])
  const endpointPresetOptions = useMemo(() => buildEndpointComboOptions(providerEndpointPresets), [providerEndpointPresets])

  const modelIdComboOptions = useMemo(() => {
    if (modelDialog.providerIndex < 0) return []
    const provider = providers[modelDialog.providerIndex]
    const candidates = getModelPresetCandidates(provider, providerPresets, modelPresets)
    return buildModelIdComboOptions(providers, providerPresets, candidates)
  }, [modelDialog.providerIndex, providers, providerPresets, modelPresets])

  async function persist(next: ProviderConfig[]) {
    setProviders(next)
    const response = await window.electronAPI.saveConfigs(next)
    if (!response.success) alert(`保存失败: ${response.message || '未知错误'}`)
  }

  useEffect(() => {
    void (async () => {
      const loaded = await window.electronAPI.loadConfigs()
      setProviders(normalizeProviders(loaded))
      const presets = await loadPresets()
      setProviderPresets(presets.providers)
      setProviderBaseUrlPresets(presets.baseUrls)
      setProviderEndpointPresets(presets.endpoints)
      setModelPresets(presets.models)
    })()
  }, [])

  function openProviderDialog(index = -1) {
    setProviderDialog({ open: true, index })
    if (index >= 0) {
      const p = providers[index]
      setProviderForm({ ...p })
    } else {
      setProviderForm({ ...emptyProviderForm })
    }
  }

  function openModelDialog(providerIndex: number, modelIndex = -1) {
    setModelDialog({ open: true, providerIndex, modelIndex })
    if (modelIndex >= 0) setModelForm({ ...providers[providerIndex].models[modelIndex] })
    else setModelForm(emptyModelForm)
  }

  async function onSaveProvider() {
    if (!providerForm.id || !providerForm.baseUrl || !providerForm.endpoint) return alert('请填写供应商必填字段')
    const normalized: ProviderConfig = {
      ...providerForm,
      baseUrl: String(providerForm.baseUrl || '').trim(),
      endpoint: String(providerForm.endpoint || '').trim(),
      models: providerDialog.index >= 0 ? providers[providerDialog.index].models : []
    }
    const next = [...providers]
    if (providerDialog.index >= 0) next[providerDialog.index] = normalized
    else next.push(normalized)
    await persist(next)
    setProviderDialog({ open: false, index: -1 })
  }

  async function onSaveModel() {
    const { providerIndex, modelIndex } = modelDialog
    if (providerIndex < 0 || !modelForm.id) return alert('请填写模型 ID')
    const next = [...providers]
    const model: ModelConfig = {
      ...modelForm,
      name: modelForm.name || modelForm.id,
      status: 'pending',
      lastCheck: null,
      lastMessage: null
    }
    if (modelIndex >= 0) next[providerIndex].models[modelIndex] = { ...next[providerIndex].models[modelIndex], ...model }
    else next[providerIndex].models.push(model)
    await persist(next)
    setModelDialog({ open: false, providerIndex: -1, modelIndex: -1 })
  }

  async function deleteProvider(index: number) {
    if (!confirm('确定删除供应商及其全部模型？')) return
    const next = providers.filter((_, i) => i !== index)
    setSelected(new Set())
    await persist(next)
  }

  async function deleteModel(providerIndex: number, modelIndex: number) {
    if (!confirm('确定删除该模型？')) return
    const next = [...providers]
    next[providerIndex].models = next[providerIndex].models.filter((_, i) => i !== modelIndex)
    setSelected(new Set())
    await persist(next)
  }

  function modelCheckKey(providerIndex: number, modelIndex: number) {
    return `${providerIndex}-${modelIndex}`
  }

  async function checkModel(providerIndex: number, modelIndex: number) {
    const k = modelCheckKey(providerIndex, modelIndex)
    if (checkingModelGuardRef.current.has(k)) return
    checkingModelGuardRef.current.add(k)
    setCheckingModelKeys((prev) => new Set(prev).add(k))

    const provider = providers[providerIndex]
    const model = provider.models[modelIndex]
    if (!provider || !model) {
      checkingModelGuardRef.current.delete(k)
      setCheckingModelKeys((prev) => {
        const next = new Set(prev)
        next.delete(k)
        return next
      })
      return
    }

    const modelId = model.id

    async function saveAfterMerge(next: ProviderConfig[]) {
      const response = await window.electronAPI.saveConfigs(next)
      if (!response.success) alert(`保存失败: ${response.message || '未知错误'}`)
    }

    try {
      const result = await checkModelViaHttp(provider, modelId)
      setProviders((prev) => {
        const next = applyModelCheckResult(prev, providerIndex, modelIndex, modelId, {
          status: result.success ? 'success' : 'error',
          lastCheck: new Date().toISOString(),
          lastMessage: result.message
        })
        if (next !== prev) void saveAfterMerge(next)
        return next
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setProviders((prev) => {
        const next = applyModelCheckResult(prev, providerIndex, modelIndex, modelId, {
          status: 'error',
          lastCheck: new Date().toISOString(),
          lastMessage: message
        })
        if (next !== prev) void saveAfterMerge(next)
        return next
      })
    } finally {
      checkingModelGuardRef.current.delete(k)
      setCheckingModelKeys((prev) => {
        const next = new Set(prev)
        next.delete(k)
        return next
      })
    }
  }

  async function checkSelected() {
    setCollapsedProviders((prev) => {
      const next = new Set(prev)
      providers.forEach((provider, providerIndex) => {
        const hasSelected = provider.models.some((m) => selected.has(modelKey(provider.id, m.id)))
        if (!hasSelected) return
        const id = String(provider.id || '').trim()
        next.delete(id ? `id:${id}` : `index:${providerIndex}`)
      })
      return next
    })

    const tasks: Promise<void>[] = []
    for (const providerIndex in providers) {
      for (const modelIndex in providers[providerIndex].models) {
        const m = providers[providerIndex].models[modelIndex]
        if (selected.has(modelKey(providers[providerIndex].id, m.id))) {
          tasks.push(checkModel(Number(providerIndex), Number(modelIndex)))
        }
      }
    }
    await Promise.all(tasks)
  }

  function buildExportEntriesByExporter(nextExporterId: string): ExportEntry[] | null {
    const exporter = exporters.find((item) => item.id === nextExporterId)
    if (!exporter) return null
    const result = exporter.export(selectedConfigs as any)
    const entries = (Array.isArray(result) ? result : [{ title: '导出内容', content: String(result || ''), type: 'plaintext' }]) as ExportEntry[]
    return entries.map((entry) => (entry.type === 'env' ? { ...entry, content: buildEnvCommandFromPayload(entry.content) } : entry))
  }

  function openExport() {
    const entries = buildExportEntriesByExporter(exporterId)
    if (!entries) return
    setExportEntries(entries)
    setExportOpen(true)
  }

  function selectExportFormat(nextExporterId: string) {
    setExporterId(nextExporterId)
    const entries = buildExportEntriesByExporter(nextExporterId)
    if (!entries) return
    setExportEntries(entries)
  }

  async function runEntry(entry: ExportEntry) {
    if (entry.type === 'deeplink') return void window.electronAPI.openExternal(entry.content)
    if (entry.type === 'command' || entry.type === 'env') {
      if (!confirm('确定要在终端中执行吗？\n\n将打开「终端」应用并运行下方脚本，请确认内容无误后再继续。')) return
      const result = await window.electronAPI.runCommandInTerminal(entry.content)
      if (!result.success) alert(result.message || '在终端中执行失败')
      return
    }
    if (entry.type === 'javascript') return void window.electronAPI.openHTMLWithScript(entry.content)
  }

  async function exportJsonConfigs() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), providers }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llm-model-manager-configs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJsonConfigs(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const input = event.target
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const incoming = Array.isArray(parsed) ? parsed : (parsed as { providers?: unknown })?.providers
      if (!Array.isArray(incoming)) {
        alert('导入失败: 需要为供应商数组，或包含 providers 数组的对象')
        return
      }
      const next = normalizeProviders(incoming)
      await persist(next)
      setSelected(new Set())
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      alert(`导入失败: ${message}`)
    } finally {
      input.value = ''
    }
  }

  async function loadModelList(providerIndex: number) {
    if (!providers[providerIndex]) {
      alert('供应商不存在')
      return
    }
    setModelListDialog({ providerIndex, status: 'loading' })
    const provider = providers[providerIndex]
    try {
      const result = await fetchProviderModelsList(provider)
      if (!result.success) {
        setModelListDialog({ providerIndex, status: 'error', message: result.message || '加载失败' })
        return
      }
      setModelListDialog({ providerIndex, status: 'ready', models: result.models || [] })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setModelListDialog({ providerIndex, status: 'error', message })
    }
  }

  function retryLoadModelList() {
    if (modelListDialog?.status === 'error') {
      void loadModelList(modelListDialog.providerIndex)
    }
  }

  function closeModelListDialog() {
    setModelListDialog(null)
  }

  async function addSelectedModelsFromList(modelsToAdd: ModelConfig[]) {
    if (!modelListDialog || modelListDialog.status !== 'ready') return
    if (modelsToAdd.length === 0) {
      alert('请选择至少一个模型')
      return
    }
    const { providerIndex } = modelListDialog
    const next = [...providers]
    next[providerIndex].models.push(...modelsToAdd)
    setSelected(new Set())
    await persist(next)
    setModelListDialog(null)
    alert(`成功添加 ${modelsToAdd.length} 个模型`)
  }

  async function openProviderWebsite(rawWebsite?: string) {
    const raw = String(rawWebsite || '').trim()
    if (!raw) return
    const target = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const ok = await window.electronAPI.openExternal(target)
    if (!ok) {
      setToastMessage('官网链接打开失败')
      window.setTimeout(() => setToastMessage(null), 2200)
    }
  }

  function getProviderSelectionState(provider: ProviderConfig): { checked: boolean; indeterminate: boolean; total: number } {
    const total = provider.models.length
    if (total === 0) return { checked: false, indeterminate: false, total }
    const selectedCount = provider.models.filter((model) => selected.has(modelKey(provider.id, model.id))).length
    if (selectedCount === 0) return { checked: false, indeterminate: false, total }
    if (selectedCount === total) return { checked: true, indeterminate: false, total }
    return { checked: false, indeterminate: true, total }
  }

  function getProviderCollapseKey(provider: ProviderConfig, providerIndex: number): string {
    const id = String(provider.id || '').trim()
    return id ? `id:${id}` : `index:${providerIndex}`
  }

  function isProviderCollapsed(provider: ProviderConfig, providerIndex: number): boolean {
    return collapsedProviders.has(getProviderCollapseKey(provider, providerIndex))
  }

  function toggleProviderCollapsed(provider: ProviderConfig, providerIndex: number) {
    const key = getProviderCollapseKey(provider, providerIndex)
    setCollapsedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function collapseAllProviders() {
    const all = new Set<string>()
    providers.forEach((provider, index) => {
      all.add(getProviderCollapseKey(provider, index))
    })
    setCollapsedProviders(all)
  }

  function expandAllProviders() {
    setCollapsedProviders(new Set())
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(String(text || ''))
      setToastMessage('已复制到剪贴板')
      window.setTimeout(() => setToastMessage(null), 1800)
    } catch {
      const temp = document.createElement('textarea')
      temp.value = String(text || '')
      document.body.appendChild(temp)
      temp.select()
      try {
        document.execCommand('copy')
        setToastMessage('已复制到剪贴板')
        window.setTimeout(() => setToastMessage(null), 1800)
      } catch {
        setToastMessage('复制失败，请手动复制')
        window.setTimeout(() => setToastMessage(null), 2200)
      } finally {
        document.body.removeChild(temp)
      }
    }
  }

  function toggleProviderSelection(provider: ProviderConfig, checked: boolean) {
    const next = new Set(selected)
    for (const model of provider.models) {
      const key = modelKey(provider.id, model.id)
      if (checked) next.add(key)
      else next.delete(key)
    }
    setSelected(next)
  }

  function toggleAllSelection(checked: boolean) {
    if (!checked) {
      setSelected(new Set())
      return
    }
    const next = new Set<string>()
    for (const provider of providers) {
      for (const model of provider.models) {
        next.add(modelKey(provider.id, model.id))
      }
    }
    setSelected(next)
  }

  async function reorderProvider(sourceIndex: number, targetIndex: number) {
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    if (sourceIndex >= providers.length || targetIndex >= providers.length) return
    const next = [...providers]
    const moved = arrayMove(next, sourceIndex, targetIndex)
    await persist(moved)
  }

  async function onProviderDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const sourceIndex = Number(String(active.id).replace('provider-', ''))
    const targetIndex = Number(String(over.id).replace('provider-', ''))
    if (!Number.isFinite(sourceIndex) || !Number.isFinite(targetIndex)) return
    await reorderProvider(sourceIndex, targetIndex)
  }

  async function onModelDragEnd(providerIndex: number, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const sourceIndex = Number(String(active.id).replace(`model-${providerIndex}-`, ''))
    const targetIndex = Number(String(over.id).replace(`model-${providerIndex}-`, ''))
    if (!Number.isFinite(sourceIndex) || !Number.isFinite(targetIndex)) return
    await reorderModel(providerIndex, sourceIndex, targetIndex)
  }

  async function reorderModel(providerIndex: number, sourceIndex: number, targetIndex: number) {
    const models = providers[providerIndex]?.models || []
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return
    if (sourceIndex >= models.length || targetIndex >= models.length) return
    const next = [...providers]
    next[providerIndex].models = arrayMove([...next[providerIndex].models], sourceIndex, targetIndex)
    await persist(next)
  }

  return {
    providers,
    selected,
    setSelected,
    providerDialog,
    setProviderDialog,
    modelDialog,
    setModelDialog,
    providerForm,
    setProviderForm,
    modelForm,
    setModelForm,
    providerPresets,
    modelPresets,
    exportOpen,
    setExportOpen,
    exporterId,
    setExporterId,
    exportEntries,
    toastMessage,
    collapsedProviders,
    checkingModelKeys,
    totalModelCount,
    selectedConfigs,
    providerPresetOptions,
    urlPresetOptions,
    endpointPresetOptions,
    modelIdComboOptions,
    maskApiKey,
    persist,
    openProviderDialog,
    openModelDialog,
    onSaveProvider,
    onSaveModel,
    deleteProvider,
    deleteModel,
    modelCheckKey,
    checkModel,
    checkSelected,
    openExport,
    selectExportFormat,
    runEntry,
    exportJsonConfigs,
    importJsonConfigs,
    loadModelList,
    modelListDialog,
    retryLoadModelList,
    closeModelListDialog,
    addSelectedModelsFromList,
    openProviderWebsite,
    getProviderSelectionState,
    isProviderCollapsed,
    toggleProviderCollapsed,
    collapseAllProviders,
    expandAllProviders,
    copyText,
    toggleProviderSelection,
    toggleAllSelection,
    onProviderDragEnd,
    onModelDragEnd,
    modelKey
  }
}
