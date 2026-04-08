import type { Dispatch, SetStateAction } from 'react'
import type { ProviderConfig } from '@shared/types'
import { Button } from '@/components/ui/button'
import { ComboBox, type ComboBoxOption } from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FieldHint, FieldLabel } from '@/components/app/field'
import {
  applyProviderPresetApiType,
  applyProviderPresetFromId,
  type ProviderForm
} from '@/lib/preset-forms'
import type { ProviderPreset } from '@/lib/presets'

export interface ProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  index: number
  providerForm: ProviderForm
  setProviderForm: Dispatch<SetStateAction<ProviderForm>>
  providerPresetOptions: ComboBoxOption<ProviderPreset>[]
  providerPresets: ProviderPreset[]
  urlPresetOptions: ComboBoxOption[]
  endpointPresetOptions: ComboBoxOption[]
  onSave: () => void
}

export function ProviderDialog({
  open,
  onOpenChange,
  index,
  providerForm,
  setProviderForm,
  providerPresetOptions,
  providerPresets,
  urlPresetOptions,
  endpointPresetOptions,
  onSave
}: ProviderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{index >= 0 ? '编辑供应商' : '添加供应商'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <FieldLabel>供应商 ID</FieldLabel>
            <ComboBox<ProviderPreset>
              placeholder="例如: openai"
              value={providerForm.id}
              onChange={(id) => setProviderForm((prev) => ({ ...prev, id }))}
              options={providerPresetOptions}
              onBlur={() => {
                setProviderForm((prev) => {
                  const id = prev.id.trim()
                  if (!id) return prev
                  const patch = applyProviderPresetFromId(id, providerPresets, { preferredApiType: prev.apiType })
                  return { ...prev, ...patch }
                })
              }}
              onSelectOption={(option) => {
                const p = option.data
                if (!p) return
                const patch = applyProviderPresetFromId(p.id, providerPresets, { preferredApiType: providerForm.apiType })
                setProviderForm((prev) => ({ ...prev, ...patch }))
              }}
            />
            <FieldHint>可选预设值或自定义；自定义格式请使用小写加连字符，例如：my-provider</FieldHint>
          </div>
          <div className="space-y-1">
            <FieldLabel>供应商名称（可选）</FieldLabel>
            <Input
              placeholder="例如: OpenAI 官方"
              value={providerForm.name}
              onChange={(e) => setProviderForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <FieldHint>仅用于展示，不参与接口请求；留空则默认使用供应商 ID。</FieldHint>
          </div>
          <div className="space-y-1">
            <FieldLabel>官网链接（可选）</FieldLabel>
            <Input
              placeholder="https://example.com"
              value={providerForm.website || ''}
              onChange={(e) => setProviderForm((prev) => ({ ...prev, website: e.target.value }))}
            />
            <FieldHint>用于列表点击跳转官网，支持不带协议的域名。</FieldHint>
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>接口类型</FieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={providerForm.apiType}
              onChange={(e) => {
                const apiType = e.target.value as ProviderConfig['apiType']
                setProviderForm((prev) => {
                  const patch = applyProviderPresetApiType(prev.id, providerPresets, apiType)
                  return { ...prev, apiType, ...patch }
                })
              }}
            >
              <option value="openai">OpenAI 兼容接口</option>
              <option value="anthropic">Anthropic 接口</option>
            </select>
            <FieldHint>接口类型</FieldHint>
          </div>
          <div className="space-y-1">
            <FieldLabel>Base URL</FieldLabel>
            <ComboBox
              placeholder="输入或从列表选择"
              value={providerForm.baseUrl}
              onChange={(baseUrl) => setProviderForm((prev) => ({ ...prev, baseUrl }))}
              options={urlPresetOptions}
            />
            <FieldHint>服务根地址，不包含具体接口路径；末尾通常不加斜杠。</FieldHint>
          </div>
          <div className="space-y-1">
            <FieldLabel>Endpoint</FieldLabel>
            <ComboBox
              placeholder="输入或从列表选择"
              value={providerForm.endpoint}
              onChange={(endpoint) => setProviderForm((prev) => ({ ...prev, endpoint }))}
              options={endpointPresetOptions}
            />
            <FieldHint>模型请求路径，按服务端实际路径填写。</FieldHint>
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>API Key（可选）</FieldLabel>
            <Input
              placeholder="sk-..."
              type="password"
              value={providerForm.apiKey || ''}
              onChange={(e) => setProviderForm((prev) => ({ ...prev, apiKey: e.target.value }))}
            />
            <FieldHint>留空则按无鉴权请求；建议只填测试 Key，避免在配置中存放高权限密钥。</FieldHint>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
