'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WorkerTierValue = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'

const TIER_META: Record<
  WorkerTierValue,
  { label: string; hint: string }
> = {
  DEVELOPMENT: {
    label: 'Development',
    hint: 'Iteration & tests',
  },
  STAGING: {
    label: 'Staging',
    hint: 'Pre-release checks',
  },
  PRODUCTION: {
    label: 'Production',
    hint: 'Live traffic',
  },
}

type WorkerTierPickerProps = {
  value: WorkerTierValue[]
  onChange: (next: WorkerTierValue[]) => void
  className?: string
}

export function WorkerTierPicker({
  value,
  onChange,
  className,
}: WorkerTierPickerProps) {
  const tiers = Object.keys(TIER_META) as WorkerTierValue[]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">Allowed tiers</p>
        <p className="text-xs text-muted-foreground">
          Which environment tiers this worker may run.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3" role="group" aria-label="Allowed tiers">
        {tiers.map((tier) => {
          const selected = value.includes(tier)
          const meta = TIER_META[tier]

          return (
            <button
              key={tier}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected ? value.filter((item) => item !== tier) : [...value, tier]
                )
              }
              className={cn(
                'flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                selected
                  ? 'border-border bg-accent text-accent-foreground'
                  : 'border-border/70 bg-transparent text-muted-foreground hover:border-border hover:bg-accent/40 hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
                  selected
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border'
                )}
              >
                {selected ? <Check className="size-2.5" aria-hidden /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-foreground">
                  {meta.label}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {meta.hint}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
