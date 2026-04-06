import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface IconActionButtonProps {
  label: string
  onClick: () => void
  icon: ReactNode
  variant?: 'outline' | 'destructive'
  disabled?: boolean
}

export function IconActionButton({ label, onClick, icon, variant = 'outline', disabled = false }: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="sm" onClick={onClick} aria-label={label} disabled={disabled} className="h-8 w-8 p-0">
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
