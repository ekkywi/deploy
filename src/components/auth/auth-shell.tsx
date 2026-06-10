import { ArrowUpRight, Layers, Rocket, Shield } from 'lucide-react'

import { cn } from '@/lib/utils'

const features = [
  {
    icon: Shield,
    title: 'Role-aware access',
    description: 'Clear account approval and responsibility boundaries.',
    iconClass: 'bg-background text-foreground ring-border',
  },
  {
    icon: Rocket,
    title: 'Environment delivery',
    description: 'Coordinate dev, staging, and production execution from one place.',
    iconClass: 'bg-background text-foreground ring-border',
  },
  {
    icon: Layers,
    title: 'Centralized operations',
    description: 'Projects, releases, and approvals stay visible to the whole team.',
    iconClass: 'bg-background text-foreground ring-border',
  },
] as const

function DeployLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 font-medium tracking-tight', className)}>
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background">
        D
      </span>
      <span>Deploy</span>
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border/80 bg-background p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%)]"
          aria-hidden
        />

        <div className="relative z-10">
          <DeployLogo className="text-lg text-white" />
        </div>

        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/65">
              Access workspace
            </div>
            <h2 className="max-w-xl text-4xl font-medium tracking-[-0.05em] text-balance">
              Calm operations for teams shipping across environments.
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/68">
              Review releases, keep operators aligned, and maintain a single source of truth for delivery.
            </p>
          </div>

          <ul className="space-y-5">
            {features.map(({ icon: Icon, title, description, iconClass }) => (
              <li key={title} className="flex gap-3">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
                    iconClass
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-white/60">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} Deploy</p>
          <span className="inline-flex items-center gap-1">
            Private console
            <ArrowUpRight className="size-3" aria-hidden />
          </span>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center bg-background p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_26%)]"
          aria-hidden
        />
        <div className="relative mb-8 w-full max-w-sm lg:hidden">
          <DeployLogo className="justify-center text-lg text-foreground" />
        </div>
        <div className="relative w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
