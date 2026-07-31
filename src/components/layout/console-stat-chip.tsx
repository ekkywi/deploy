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
  const dotStyles = {
    default: 'bg-muted-foreground',
    pending: 'bg-amber-400',
    active: 'bg-emerald-400',
    destructive: 'bg-red-500',
    info: 'bg-sky-400',
  } as const

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
      <span className={`size-1.5 shrink-0 rounded-full ${dotStyles[variant]}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}
