import { useEffect, useMemo, useState } from 'react'
import type { ModelConfig, ModelListDialogState, ProviderConfig } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ModelListDialogProps {
  state: ModelListDialogState
  provider: ProviderConfig | undefined
  onClose: () => void
  onRetry: () => void
  onAdd: (models: ModelConfig[]) => void | Promise<void>
}

function formatModelDetailLines(model: ModelConfig): { k: string; v: string }[] {
  const parts: { k: string; v: string }[] = []
  const p = model.params
  if (p?.contextWindow != null && Number(p.contextWindow) > 0) {
    parts.push({ k: 'Context', v: String(p.contextWindow) })
  }
  if (p?.maxTokens != null && Number(p.maxTokens) > 0) {
    parts.push({ k: 'Max', v: String(p.maxTokens) })
  }
  return parts
}

/**
 * 按模型 ID 过滤：空格分隔多个关键词，须全部在 ID 中出现（顺序无关）；
 * 大小写不敏感；连续空格视为分隔。
 */
function modelMatchesIdFilter(model: ModelConfig, query: string): boolean {
  const id = String(model.id || '').toLowerCase()
  const raw = query.trim()
  if (!raw) return true
  const tokens = raw
    .split(/\s+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((tok) => id.includes(tok))
}

export function ModelListDialog({ state, provider, onClose, onRetry, onAdd }: ModelListDialogProps) {
  const open = state != null
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [idFilter, setIdFilter] = useState('')

  const existingIds = useMemo(
    () => new Set((provider?.models || []).map((m) => m.id)),
    [provider?.models]
  )

  const readyModels = state?.status === 'ready' ? state.models : []
  const displayedModels = useMemo(
    () => readyModels.filter((m) => modelMatchesIdFilter(m, idFilter)),
    [readyModels, idFilter]
  )

  const allSelectableIds = useMemo(
    () => readyModels.filter((m) => !existingIds.has(m.id)).map((m) => m.id),
    [readyModels, existingIds]
  )

  const visibleSelectableIds = useMemo(
    () => displayedModels.filter((m) => !existingIds.has(m.id)).map((m) => m.id),
    [displayedModels, existingIds]
  )

  useEffect(() => {
    if (!state) return
    if (state.status === 'loading' || state.status === 'ready') {
      setSelectedIds(new Set())
      setIdFilter('')
    }
  }, [state])

  const pendingAddCount = useMemo(
    () => readyModels.filter((m) => selectedIds.has(m.id) && !existingIds.has(m.id)).length,
    [readyModels, selectedIds, existingIds]
  )

  const visibleSelectableCount = visibleSelectableIds.length
  const allVisibleSelected =
    visibleSelectableCount > 0 && visibleSelectableIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedIds.has(id))

  const title = provider ? `${provider.name || provider.id} - 模型列表` : '模型列表'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {!state || state.status === 'loading' ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">正在请求接口…</div>
          ) : state.status === 'error' ? (
            <div className="space-y-3 py-4">
              <div className="text-sm font-medium text-destructive">加载失败</div>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{state.message}</p>
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                重试
              </Button>
            </div>
          ) : state.status === 'ready' && readyModels.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">接口未返回任何模型</div>
          ) : state.status === 'ready' ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="model-list-id-filter">
                  按 ID 筛选
                </label>
                <Input
                  id="model-list-id-filter"
                  placeholder="匹配模型 ID，空格分隔多个关键词；不区分大小写。留空显示全部"
                  value={idFilter}
                  onChange={(e) => setIdFilter(e.target.value)}
                  className="h-9"
                />
              </div>
              {displayedModels.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">没有匹配的模型</div>
              ) : (
                <ul className="space-y-2">
                  {displayedModels.map((model) => {
                    const exists = existingIds.has(model.id)
                    const idText = String(model.id || '').trim() || '—'
                    const lines = formatModelDetailLines(model)
                    return (
                      <li
                        key={model.id}
                        className={cn(
                          'flex gap-3 rounded-md border border-border/80 bg-card px-3 py-2',
                          exists && 'opacity-80'
                        )}
                      >
                        <label className="flex shrink-0 cursor-pointer items-start pt-0.5">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 cursor-pointer"
                            disabled={exists}
                            checked={exists ? false : selectedIds.has(model.id)}
                            onChange={(e) => {
                              if (exists) return
                              const checked = e.target.checked
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (checked) next.add(model.id)
                                else next.delete(model.id)
                                return next
                              })
                            }}
                          />
                        </label>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="break-all font-mono text-sm font-medium text-foreground">{idText}</span>
                            {exists ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">已添加</span>
                            ) : null}
                          </div>
                          {lines.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {lines.map(({ k, v }) => (
                                <span key={k}>
                                  <span className="text-muted-foreground/80">{k}</span> {v}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {state?.status === 'ready' && readyModels.length > 0 ? (
          <div className="shrink-0 border-t border-border px-5 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer"
                  disabled={visibleSelectableCount === 0}
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (!el) return
                    el.indeterminate = someVisibleSelected && !allVisibleSelected
                  }}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setSelectedIds((prev) => {
                      const next = new Set(prev)
                      if (checked) {
                        visibleSelectableIds.forEach((id) => next.add(id))
                      } else {
                        visibleSelectableIds.forEach((id) => next.delete(id))
                      }
                      return next
                    })
                  }}
                />
                全选当前列表
              </label>
              <span className="text-sm text-muted-foreground">已选 {pendingAddCount} 项</span>
            </div>
          </div>
        ) : null}

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-5 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            关闭
          </Button>
          {state?.status === 'ready' && readyModels.length > 0 ? (
            <Button
              type="button"
              disabled={pendingAddCount === 0}
              onClick={() => {
                const toAdd = readyModels.filter((m) => selectedIds.has(m.id) && !existingIds.has(m.id))
                void onAdd(toAdd)
              }}
            >
              添加选中模型
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
