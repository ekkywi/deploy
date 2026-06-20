'use client'

import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TierOption = {
  value: string
  label: string
  description: string
  accentClassName: string
}

type TierOptionGridProps = {
  options: TierOption[]
  selectedValues: string[]
  onChange: (nextValues: string[]) => void
  mode: 'single' | 'multi'
  label: string
  helperText?: ReactNode
  className?: string
}

export function TierOptionGrid({
  options,
  selectedValues,
  onChange,
  mode,
  label,
  helperText,
  className,
}: TierOptionGridProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            {label}
          </p>
          {helperText ? (
            <p className="mt-1 max-w-xl text-[12px] leading-5 text-muted-foreground/85">
              {helperText}
            </p>
          ) : null}
        </div>
        <Badge variant="outline" className="bg-background/40 text-[9px] uppercase tracking-[0.16em]">
          {mode === 'multi' ? 'Multi-select' : 'Single-select'}
        </Badge>
      </div>

      <div
        role={mode === 'single' ? 'radiogroup' : 'group'}
        aria-label={label}
        className="grid gap-2.5 grid-cols-1 md:grid-cols-3"
      >
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value)
          const selectedCount = selectedValues.length
          const selectedLabel =
            mode === 'single'
              ? isSelected
                ? 'Active'
                : 'Choose'
              : isSelected
                ? 'On'
                : 'Add'

          return (
            <button
              key={option.value}
              type="button"
              role={mode === 'single' ? 'radio' : undefined}
              aria-checked={mode === 'single' ? isSelected : undefined}
              aria-pressed={mode === 'multi' ? isSelected : undefined}
              onClick={() => {
                if (mode === 'single') {
                  onChange([option.value])
                  return
                }

                onChange(
                  isSelected
                    ? selectedValues.filter((value) => value !== option.value)
                    : [...selectedValues, option.value]
                )
              }}
              className={cn(
                'group flex min-h-[148px] flex-col overflow-hidden rounded-2xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                'hover:-translate-y-px hover:border-border/80 hover:bg-background/40',
                isSelected
                  ? 'border-border/80 bg-background/70 shadow-[0_12px_30px_rgba(0,0,0,0.16)] ring-1 ring-inset ring-white/6'
                  : 'border-border/60 bg-muted/25 text-muted-foreground/90',
                option.accentClassName
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-h-5 items-center gap-1.5">
                    <span className="min-w-0 truncate text-[13px] font-medium tracking-[-0.02em] text-foreground">
                      {option.label}
                    </span>
                    {isSelected ? <Check className="size-3.5 shrink-0 text-foreground/85" /> : null}
                  </div>
                  <p className="min-h-[3rem] max-w-[19rem] text-[12px] leading-5 text-muted-foreground/85">
                    {option.description}
                  </p>
                </div>

                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'shrink-0 self-start text-[9px] uppercase tracking-[0.16em]',
                    isSelected
                      ? 'border-transparent bg-foreground text-background'
                      : 'bg-background/40 text-muted-foreground'
                  )}
                >
                  {selectedLabel}
                </Badge>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/72">
                <span>{mode === 'multi' ? 'Toggle availability' : 'Placement choice'}</span>
                <span className="font-medium text-muted-foreground/82">
                  {isSelected ? (mode === 'single' ? 'Active' : `${selectedCount} on`) : 'Available'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
