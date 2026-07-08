'use client'

type ConsoleStatChipProps = {
  label: string
  value: string | number
  variant?: 'default' | 'pending' | 'active' | 'destructive' | 'info'
}

export function ConsoleStatChip({
  label,
  value,
  variant = 'default',
}: ConsoleStatChipProps) {
  const variantStyles = {
    default: 'border-border/60 bg-muted/20 text-foreground/90',
    pending: 'border-amber-300/14 bg-amber-300/7 text-amber-100/90',
    active: 'border-emerald-400/14 bg-emerald-400/7 text-emerald-200/90',
    destructive: 'border-destructive/14 bg-destructive/7 text-rose-200/90',
    info: 'border-sky-400/14 bg-sky-400/7 text-sky-100/90',
  } as const

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] font-medium leading-none ${variantStyles[variant]}`}
    >
      <span className="font-normal tracking-[0.01em] text-muted-foreground/80">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
