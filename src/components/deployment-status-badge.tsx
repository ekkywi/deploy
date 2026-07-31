import { Ban, CheckCircle2, Clock3, Loader2, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type DeploymentStatus = 'PENDING' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string

const STATUS_META: Record<
  string,
  {
    label: string
    className: string
    iconClassName: string
    icon: typeof CheckCircle2
    spin?: boolean
  }
> = {
  SUCCESS: {
    label: 'Ready',
    className:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15',
    iconClassName: 'text-emerald-400',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Error',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
    iconClassName: 'text-destructive',
    icon: TriangleAlert,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/50',
    iconClassName: 'text-muted-foreground',
    icon: Ban,
  },
  BUILDING: {
    label: 'Building',
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/15',
    iconClassName: 'text-sky-400',
    icon: Loader2,
    spin: true,
  },
  PENDING: {
    label: 'Queued',
    className: 'border-border bg-transparent text-muted-foreground',
    iconClassName: 'text-muted-foreground',
    icon: Clock3,
  },
}

export function getDeploymentStatusMeta(status: DeploymentStatus) {
  return STATUS_META[status] ?? STATUS_META.PENDING
}

export function DeploymentStatusBadge({
  status,
  className,
}: {
  status: DeploymentStatus
  className?: string
}) {
  const meta = getDeploymentStatusMeta(status)
  const Icon = meta.icon

  return (
    <Badge
      variant="outline"
      className={cn('px-1.5 text-[11px] font-medium', meta.className, className)}
    >
      <Icon className={cn('mr-1 size-3', meta.spin && 'animate-spin')} />
      {meta.label}
    </Badge>
  )
}
