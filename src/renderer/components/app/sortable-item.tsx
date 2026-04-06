import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

export interface SortableItemProps {
  id: string
  children: (args: { dragHandleProps: Record<string, unknown>; isDragging: boolean }) => React.ReactNode
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1
      }}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners
        },
        isDragging
      })}
    </div>
  )
}
