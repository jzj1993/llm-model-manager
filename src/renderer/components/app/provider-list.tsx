import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Dispatch, SetStateAction } from 'react'
import { ChevronDown, ChevronRight, Copy, List, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ProviderConfig } from '@shared/types'
import { maskApiKey, modelKey } from '@/lib/app-constants'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IconActionButton } from '@/components/app/icon-action-button'
import { ModelTestButton } from '@/components/app/model-test-button'
import { SortableItem } from '@/components/app/sortable-item'

export interface ProviderListProps {
  providers: ProviderConfig[]
  selected: Set<string>
  setSelected: Dispatch<SetStateAction<Set<string>>>
  checkingModelKeys: Set<string>
  isProviderCollapsed: (provider: ProviderConfig, providerIndex: number) => boolean
  toggleProviderCollapsed: (provider: ProviderConfig, providerIndex: number) => void
  getProviderSelectionState: (provider: ProviderConfig) => { checked: boolean; indeterminate: boolean; total: number }
  toggleProviderSelection: (provider: ProviderConfig, checked: boolean) => void
  openProviderWebsite: (rawWebsite?: string) => void | Promise<void>
  copyText: (text: string) => void | Promise<void>
  loadModelList: (providerIndex: number) => void | Promise<void>
  openModelDialog: (providerIndex: number, modelIndex?: number) => void
  openProviderDialog: (index?: number) => void
  deleteProvider: (index: number) => void | Promise<void>
  deleteModel: (providerIndex: number, modelIndex: number) => void | Promise<void>
  modelCheckKey: (providerIndex: number, modelIndex: number) => string
  checkModel: (providerIndex: number, modelIndex: number) => void | Promise<void>
  onProviderDragEnd: (event: DragEndEvent) => void | Promise<void>
  onModelDragEnd: (providerIndex: number, event: DragEndEvent) => void | Promise<void>
}

export function ProviderList({
  providers,
  selected,
  setSelected,
  checkingModelKeys,
  isProviderCollapsed,
  toggleProviderCollapsed,
  getProviderSelectionState,
  toggleProviderSelection,
  openProviderWebsite,
  copyText,
  loadModelList,
  openModelDialog,
  openProviderDialog,
  deleteProvider,
  deleteModel,
  modelCheckKey,
  checkModel,
  onProviderDragEnd,
  onModelDragEnd
}: ProviderListProps) {
  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      <DndContext collisionDetection={closestCenter} onDragEnd={(event) => void onProviderDragEnd(event)}>
        <SortableContext items={providers.map((_, index) => `provider-${index}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {providers.map((provider, providerIndex) => (
              <SortableItem key={provider.id || providerIndex} id={`provider-${providerIndex}`}>
                {({ dragHandleProps }) => (
                  <div className="rounded-lg border border-border bg-card py-3 pl-2 pr-3">
                    <div className={`${isProviderCollapsed(provider, providerIndex) ? 'mb-0' : 'mb-2'} flex items-center gap-3`}>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex h-8 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
                          onClick={() => toggleProviderCollapsed(provider, providerIndex)}
                          title={isProviderCollapsed(provider, providerIndex) ? '展开模型列表' : '折叠模型列表'}
                          aria-label={isProviderCollapsed(provider, providerIndex) ? '展开模型列表' : '折叠模型列表'}
                        >
                          {isProviderCollapsed(provider, providerIndex) ? (
                            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                          ) : (
                            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                          )}
                        </button>
                        <label className="inline-flex h-8 w-6 cursor-pointer items-center justify-center rounded-md">
                          <input
                            className="h-4 w-4 cursor-pointer"
                            type="checkbox"
                            checked={getProviderSelectionState(provider).checked}
                            ref={(el) => {
                              if (!el) return
                              el.indeterminate = getProviderSelectionState(provider).indeterminate
                            }}
                            onChange={(event) => toggleProviderSelection(provider, event.target.checked)}
                          />
                        </label>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="grid min-w-0 items-center gap-3" style={{ gridTemplateColumns: '1.7fr 0.75fr 1.65fr 0.9fr' }}>
                          <div className="min-w-0">
                            {provider.website ? (
                              <button
                                type="button"
                                className="inline-flex w-fit max-w-full min-w-0 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-sm text-left text-base font-semibold text-primary hover:underline"
                                onClick={() => void openProviderWebsite(provider.website)}
                                title={provider.website}
                                data-no-row-toggle="true"
                              >
                                {provider.name || provider.id}
                              </button>
                            ) : (
                              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold">{provider.name || provider.id}</div>
                            )}
                            <div className="mt-0.5 flex items-center gap-1 text-xs">
                              <span className="shrink-0 text-muted-foreground/80">ID:</span>
                              <span className="selectable-all block min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-foreground/90">
                                {provider.id || '-'}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex w-fit shrink-0 rounded-md bg-secondary px-2 py-1 text-xs">
                            {provider.apiType === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                          </span>
                          <div className="min-w-0 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-14 shrink-0 text-muted-foreground/80">Base URL</span>
                              <span className="selectable-all block min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-foreground/90">
                                {provider.baseUrl || '-'}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="w-14 shrink-0 text-muted-foreground/80">Endpoint</span>
                              <span className="selectable-all block min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-foreground/90">
                                {provider.endpoint || '-'}
                              </span>
                            </div>
                          </div>
                          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <span className="block min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{maskApiKey(provider.apiKey)}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border p-0 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => void copyText(provider.apiKey || '')}
                                  disabled={!provider.apiKey}
                                  aria-label="复制 API Key"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>复制 API Key</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <IconActionButton
                          label="加载模型列表（批量添加）"
                          onClick={() => loadModelList(providerIndex)}
                          icon={<List className="h-4 w-4" />}
                        />
                        <IconActionButton label="添加模型" onClick={() => openModelDialog(providerIndex)} icon={<Plus className="h-4 w-4" />} />
                        <IconActionButton label="编辑供应商" onClick={() => openProviderDialog(providerIndex)} icon={<Pencil className="h-4 w-4" />} />
                        <IconActionButton
                          label="删除供应商"
                          onClick={() => deleteProvider(providerIndex)}
                          icon={<Trash2 className="h-4 w-4" />}
                          variant="destructive"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex h-9 cursor-grab select-none items-center rounded-md border border-border px-3 text-sm active:cursor-grabbing"
                              {...dragHandleProps}
                            >
                              ⠿
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>拖拽排序供应商</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {!isProviderCollapsed(provider, providerIndex) && (
                      <DndContext collisionDetection={closestCenter} onDragEnd={(event) => void onModelDragEnd(providerIndex, event)}>
                        <SortableContext
                          items={provider.models.map((_, modelIndex) => `model-${providerIndex}-${modelIndex}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="ml-10 pl-1">
                            {provider.models.map((model, modelIndex) => (
                              <SortableItem key={model.id || modelIndex} id={`model-${providerIndex}-${modelIndex}`}>
                                {({ dragHandleProps }) => (
                                  <div
                                    className={`flex items-center justify-between rounded-sm border border-primary/35 border-l-4 border-l-primary bg-primary/[0.08] px-2 py-1 ${
                                      modelIndex > 0 ? 'mt-1.5' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 rounded px-1 py-0.5">
                                      <label className="inline-flex h-8 w-6 cursor-pointer items-center justify-center rounded-md">
                                        <input
                                          className="h-4 w-4 cursor-pointer"
                                          type="checkbox"
                                          checked={selected.has(modelKey(provider.id, model.id))}
                                          onChange={(event) => {
                                            if (event.target.checked) {
                                              const next = new Set(selected)
                                              next.add(modelKey(provider.id, model.id))
                                              setSelected(next)
                                            } else {
                                              const next = new Set(selected)
                                              next.delete(modelKey(provider.id, model.id))
                                              setSelected(next)
                                            }
                                          }}
                                        />
                                      </label>
                                      <span className="selectable-all" data-no-row-toggle="true" onClick={(event) => event.stopPropagation()}>
                                        {model.id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <ModelTestButton
                                        status={model.status}
                                        lastMessage={model.lastMessage}
                                        isChecking={checkingModelKeys.has(modelCheckKey(providerIndex, modelIndex))}
                                        onTest={() => void checkModel(providerIndex, modelIndex)}
                                      />
                                      <IconActionButton
                                        label="编辑模型"
                                        onClick={() => openModelDialog(providerIndex, modelIndex)}
                                        icon={<Pencil className="h-4 w-4" />}
                                      />
                                      <IconActionButton
                                        label="删除模型"
                                        onClick={() => deleteModel(providerIndex, modelIndex)}
                                        icon={<Trash2 className="h-4 w-4" />}
                                        variant="destructive"
                                      />
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span
                                            className="inline-flex h-8 cursor-grab select-none items-center rounded-md border border-border px-2 text-xs active:cursor-grabbing"
                                            {...dragHandleProps}
                                          >
                                            ⠿
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>拖拽排序模型</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                )}
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
