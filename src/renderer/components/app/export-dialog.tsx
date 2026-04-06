import hljs from 'highlight.js/lib/common'
import { exporters } from '../../../exporters'
import type { ExportEntry } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getActionButtonText,
  getRenderLanguageFromType,
  isRunnableType,
  renderMarkdownWithHighlight
} from '@/lib/export-render'

function renderExportContent(entry: ExportEntry): { isMarkdown: boolean; html: string } {
  const content = String(entry.content || '')
  const renderLanguage = getRenderLanguageFromType(entry.type)
  if (renderLanguage === 'markdown') {
    return {
      isMarkdown: true,
      html: renderMarkdownWithHighlight(content)
    }
  }
  try {
    const html = hljs.highlight(content, { language: renderLanguage }).value
    return { isMarkdown: false, html }
  } catch {
    return { isMarkdown: false, html: hljs.highlightAuto(content).value }
  }
}

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exporterId: string
  onSelectExporter: (id: string) => void
  exportEntries: ExportEntry[]
  selectedCount: number
  onCopy: (text: string) => void | Promise<void>
  onRunEntry: (entry: ExportEntry) => void | Promise<void>
}

export function ExportDialog({
  open,
  onOpenChange,
  exporterId,
  onSelectExporter,
  exportEntries,
  selectedCount,
  onCopy,
  onRunEntry
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[84vh] w-[94vw] max-w-[1400px] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            导出到 {exporters.find((item) => item.id === exporterId)?.displayName || '未知格式'} ({selectedCount} 项)
          </DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] overflow-hidden">
          <div className="min-h-0 border-r border-border/50 bg-muted/[0.08] p-2">
            <div className="h-full space-y-1 overflow-auto pr-1">
              {exporters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectExporter(item.id)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                    item.id === exporterId ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  <span>{item.displayName}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 min-w-0 bg-background p-3">
            <div className="h-full min-w-0 space-y-6 overflow-auto pr-1">
              {exportEntries.map((entry, index) => {
                const rendered = renderExportContent(entry)
                return (
                  <div
                    key={`${entry.title}-${index}`}
                    className={`min-w-0 space-y-2 ${index < exportEntries.length - 1 ? 'border-b border-border/40 pb-6' : ''}`}
                  >
                    <div className="truncate text-sm font-medium">{entry.title || `#${index + 1}`}</div>
                    {rendered.isMarkdown ? (
                      <div
                        className="export-code-wrap min-w-0 overflow-auto rounded-md bg-muted/40 p-3 text-sm leading-6 [&_pre]:mt-2 [&_pre]:rounded [&_pre]:bg-muted/50 [&_pre]:p-2"
                        dangerouslySetInnerHTML={{ __html: rendered.html }}
                      />
                    ) : (
                      <pre className="export-code-wrap min-w-0 max-w-full rounded-md bg-muted/40 p-3 text-sm">
                        <code className="block" dangerouslySetInnerHTML={{ __html: rendered.html }} />
                      </pre>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => void onCopy(entry.content)}>
                        复制
                      </Button>
                      {isRunnableType(entry.type) && (
                        <Button variant="secondary" onClick={() => onRunEntry(entry)}>
                          {getActionButtonText(entry.type)}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
