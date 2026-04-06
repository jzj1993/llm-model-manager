import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1.5 text-xs leading-snug text-muted-foreground', className)}>{children}</p>
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 block text-sm font-medium text-foreground">{children}</div>
}
