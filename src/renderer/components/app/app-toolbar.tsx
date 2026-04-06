import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'

export interface AppToolbarProps {
  onAddProvider: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  totalModelCount: number
  selectedSize: number
  onToggleAllSelection: (checked: boolean) => void
  onCheckSelected: () => void
  onOpenExport: () => void
  onExportJson: () => void
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void
}

export function AppToolbar({
  onAddProvider,
  onCollapseAll,
  onExpandAll,
  totalModelCount,
  selectedSize,
  onToggleAllSelection,
  onCheckSelected,
  onOpenExport,
  onExportJson,
  onImportJson
}: AppToolbarProps) {
  return (
    <div className="shrink-0 border-b border-border pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={onAddProvider}>添加供应商</Button>
          <Button variant="outline" onClick={onCollapseAll}>
            折叠全部
          </Button>
          <Button variant="outline" onClick={onExpandAll}>
            展开全部
          </Button>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input
              className="cursor-pointer"
              type="checkbox"
              checked={totalModelCount > 0 && selectedSize === totalModelCount}
              ref={(el) => {
                if (!el) return
                el.indeterminate = selectedSize > 0 && selectedSize < totalModelCount
              }}
              onChange={(e) => onToggleAllSelection(e.target.checked)}
            />
            全选
          </label>
          <span className="inline-flex h-9 items-center text-sm text-muted-foreground">已选 {selectedSize} 项</span>
          <Button variant="outline" onClick={onCheckSelected} disabled={selectedSize === 0}>
            测试选中模型
          </Button>
          <Button onClick={onOpenExport} disabled={selectedSize === 0}>
            导出选中模型
          </Button>
          <Button variant="outline" onClick={onExportJson}>
            导出 JSON
          </Button>
          <label className="inline-flex">
            <input type="file" className="hidden" accept="application/json,.json" onChange={onImportJson} />
            <span className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-4 text-sm">导入 JSON</span>
          </label>
        </div>
      </div>
    </div>
  )
}
