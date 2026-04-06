import { CheckCircle2, CirclePlay, Loader2, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function ModelTestButton({
  status,
  lastMessage,
  isChecking,
  onTest
}: {
  status?: string
  lastMessage?: string | null
  isChecking: boolean
  onTest: () => void
}) {
  const st = status || 'pending'
  const detail = String(lastMessage || '').trim()
  let icon: ReactNode
  let summary: string
  if (isChecking) {
    icon = <Loader2 className="h-4 w-4 animate-spin text-amber-600" aria-hidden />
    summary = '测试中…'
  } else if (st === 'success') {
    icon = <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
    summary = '测试模型（上次成功，点击重新测试）'
  } else if (st === 'error') {
    icon = <XCircle className="h-4 w-4 text-red-600" aria-hidden />
    summary = '测试模型（上次失败，点击重新测试）'
  } else {
    icon = <CirclePlay className="h-4 w-4 text-muted-foreground" aria-hidden />
    summary = '测试模型'
  }
  const titleText = detail && !isChecking ? `${summary} — ${detail}` : summary
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isChecking}
          onClick={onTest}
          aria-busy={isChecking}
          aria-label={summary}
          title={titleText}
          className="h-8 w-8 shrink-0 p-0 disabled:opacity-100"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap break-words">{titleText}</TooltipContent>
    </Tooltip>
  )
}
