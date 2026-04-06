import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type ComboBoxOption<T = unknown> = {
  value: string
  label?: string
  keywords?: string[]
  data?: T
}

type ComboBoxProps<T = unknown> = {
  value: string
  onChange: (value: string) => void
  options: ComboBoxOption<T>[]
  onSelectOption?: (option: ComboBoxOption<T>) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  emptyHint?: string
}

function normalizeText(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase()
}

export function ComboBox<T = unknown>({
  value,
  onChange,
  options,
  onSelectOption,
  onBlur,
  placeholder,
  className,
  emptyHint = '无匹配项'
}: ComboBoxProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listboxId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const ignoreBlurCloseRef = useRef(false)

  const dedupedOptions = useMemo(() => {
    const seen = new Set<string>()
    return options.filter((item) => {
      const key = String(item.value || '').trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [options])

  const filtered = useMemo(() => {
    const query = normalizeText(value)
    if (!query) return dedupedOptions

    const startsWithItems: ComboBoxOption<T>[] = []
    const includesItems: ComboBoxOption<T>[] = []
    for (const option of dedupedOptions) {
      const targets = [option.value, option.label, ...(option.keywords || [])].map(normalizeText)
      const isStartsWith = targets.some((text) => text.startsWith(query))
      const isIncludes = targets.some((text) => text.includes(query))
      if (isStartsWith) startsWithItems.push(option)
      else if (isIncludes) includesItems.push(option)
    }
    return [...startsWithItems, ...includesItems]
  }, [dedupedOptions, value])

  useEffect(() => {
    if (!open) return
    setActiveIndex(filtered.length > 0 ? 0 : -1)
  }, [open, filtered.length])

  useEffect(() => {
    if (activeIndex < 0) return
    const target = itemRefs.current[activeIndex]
    target?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (wrapRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  function selectOption(option: ComboBoxOption<T>) {
    ignoreBlurCloseRef.current = true
    onChange(option.value)
    onSelectOption?.(option)
    setOpen(false)
    requestAnimationFrame(() => {
      ignoreBlurCloseRef.current = false
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (filtered.length > 0) {
        setOpen(true)
        event.preventDefault()
      }
      return
    }

    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length <= 0) return
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filtered.length <= 0) return
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault()
        selectOption(filtered[activeIndex])
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const canPick = dedupedOptions.length > 0
  const showPanel = open && canPick

  return (
    <div ref={wrapRef} className={cn('relative w-full overflow-visible', className)}>
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          if (canPick) setOpen(true)
        }}
        onFocus={() => {
          if (canPick) setOpen(true)
        }}
        onBlur={() => {
          if (ignoreBlurCloseRef.current) return
          onBlur?.()
          window.setTimeout(() => {
            if (ignoreBlurCloseRef.current) return
            setOpen(false)
          }, 100)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listboxId : undefined}
      />
      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-[min(240px,40vh)] overflow-y-auto overscroll-contain rounded-md border border-border bg-background py-1 shadow-lg"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyHint}</div>
          ) : (
            <ul className="py-0">
              {filtered.map((item, index) => (
                <li key={`${item.value}-${index}`}>
                  <button
                    ref={(node) => {
                      itemRefs.current[index] = node
                    }}
                    type="button"
                    tabIndex={-1}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
                      activeIndex === index && 'bg-muted/60'
                    )}
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(item)}
                  >
                    <div className="font-medium text-foreground">{item.value}</div>
                    {item.label && item.label !== item.value ? (
                      <div className="truncate text-xs text-muted-foreground">{item.label}</div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
