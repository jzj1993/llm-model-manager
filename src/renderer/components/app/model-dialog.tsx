import type { Dispatch, SetStateAction } from 'react'
import type { ProviderConfig } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FieldHint, FieldLabel } from '@/components/app/field'
import type { ModelForm } from '@/lib/app-constants'
import { applyModelPresetById, getModelPresetCandidates } from '@/lib/preset-forms'
import type { ModelPreset, ProviderPreset } from '@/lib/presets'

export interface ModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerIndex: number
  modelIndex: number
  modelForm: ModelForm
  setModelForm: Dispatch<SetStateAction<ModelForm>>
  providers: ProviderConfig[]
  providerPresets: ProviderPreset[]
  modelPresets: ModelPreset[]
  modelIdComboOptions: ComboBoxOption<ModelPreset | null>[]
  onSave: () => void
}

export function ModelDialog({
  open,
  onOpenChange,
  providerIndex,
  modelIndex,
  modelForm,
  setModelForm,
  providers,
  providerPresets,
  modelPresets,
  modelIdComboOptions,
  onSave
}: ModelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{modelIndex >= 0 ? '编辑模型' : '添加模型'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <FieldLabel>模型 ID</FieldLabel>
            <ComboBox<ModelPreset | null>
              placeholder="例如: gpt-5.4"
              value={modelForm.id}
              onChange={(id) => setModelForm((prev) => ({ ...prev, id }))}
              options={modelIdComboOptions}
              onBlur={() => {
                setModelForm((prev) => {
                  const id = prev.id.trim()
                  if (!id || providerIndex < 0) return prev
                  const provider = providers[providerIndex]
                  const candidates = getModelPresetCandidates(provider, providerPresets, modelPresets)
                  const patch = applyModelPresetById(id, candidates, prev)
                  return { ...prev, id, ...patch }
                })
              }}
              onSelectOption={(option) => {
                const id = option.value
                const preset = option.data
                setModelForm((prev) => {
                  if (!preset) return { ...prev, id }
                  const patch = applyModelPresetById(id, [preset], prev)
                  return { ...prev, id, ...patch }
                })
              }}
            />
            <FieldHint>用于实际请求；可直接输入，也可从预设选择自动带入参数。</FieldHint>
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>模型名称（可选）</FieldLabel>
            <Input
              placeholder="例如: GPT-5.4 主模型，不填则使用模型 ID"
              value={modelForm.name || ''}
              onChange={(e) => setModelForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <FieldHint>仅用于界面展示，导出时通常仍以模型 ID 为准。</FieldHint>
          </div>
          <div className="col-span-2 mt-1 space-y-3 border-t border-border/60 pt-4">
            <div className="text-sm font-medium text-foreground">模型能力与参数（可选）</div>
            <FieldHint className="mt-0">尝试调用接口，自动探测 Context Window / Max Tokens</FieldHint>
            <FieldHint className="mt-0">当前版本未接入自动探测，请手动填写或通过预设匹配模型 ID 自动带入。</FieldHint>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FieldLabel>Context Window（可选）</FieldLabel>
                <Input
                  placeholder="例如: 128000"
                  type="number"
                  value={modelForm.params?.contextWindow || ''}
                  onChange={(e) =>
                    setModelForm((prev) => ({
                      ...prev,
                      params: {
                        ...prev.params,
                        contextWindow: e.target.value ? Number(e.target.value) : null
                      }
                    }))
                  }
                />
                <FieldHint>模型可接收的最大上下文 Token 数，未知可留空。</FieldHint>
              </div>
              <div className="space-y-1">
                <FieldLabel>Max Tokens（可选）</FieldLabel>
                <Input
                  placeholder="例如: 8192"
                  type="number"
                  value={modelForm.params?.maxTokens || ''}
                  onChange={(e) =>
                    setModelForm((prev) => ({
                      ...prev,
                      params: {
                        ...prev.params,
                        maxTokens: e.target.value ? Number(e.target.value) : null
                      }
                    }))
                  }
                />
                <FieldHint>单次返回上限，通常小于或等于 Context Window。</FieldHint>
              </div>
              <div className="space-y-1">
                <FieldLabel>Reasoning（可选）</FieldLabel>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={
                    modelForm.params?.reasoningMode === true ? 'true' : modelForm.params?.reasoningMode === false ? 'false' : ''
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    setModelForm((prev) => ({
                      ...prev,
                      params: {
                        ...prev.params,
                        reasoningMode: v === '' ? null : v === 'true'
                      }
                    }))
                  }}
                >
                  <option value="">未定义 (-)</option>
                  <option value="true">启用</option>
                  <option value="false">禁用</option>
                </select>
                <FieldHint>未定义表示不显式传递该能力参数，由服务端自行处理。</FieldHint>
              </div>
              <div className="space-y-1">
                <FieldLabel>输入类型（可选，逗号分隔）</FieldLabel>
                <Input
                  placeholder="例如: text,image"
                  value={Array.isArray(modelForm.params?.inputTypes) ? modelForm.params.inputTypes.join(',') : ''}
                  onChange={(e) =>
                    setModelForm((prev) => ({
                      ...prev,
                      params: {
                        ...prev.params,
                        inputTypes: e.target.value ? e.target.value.split(',').map((x) => x.trim()) : null
                      }
                    }))
                  }
                />
                <FieldHint>常见值：`text`、`image`、`audio`，多个值用英文逗号分隔。</FieldHint>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
