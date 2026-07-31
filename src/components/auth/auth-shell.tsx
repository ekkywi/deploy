import { Layers, Rocket, Shield, Triangle } from 'lucide-react'

import { cn } from '@/lib/utils'

const features = [
  {
    icon: Shield,
    title: 'Access control',
    description: 'Approve accounts and manage roles.',
  },
  {
    icon: Rocket,
    title: 'Deployments',
    description: 'Ship to any environment from one place.',
  },
  {
    icon: Layers,
    title: 'Projects',
    description: 'Keep repos, envs, and releases together.',
  },
] as const

function DeployLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-sm font-medium', className)}>
      <Triangle className="size-3.5 fill-current" aria-hidden />
      <span>Deploy</span>
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between border-r border-border bg-background p-10 lg:flex">
        <DeployLogo />

        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance">
              Build and ship with clarity.
            </h2>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Projects, environments, and deployments in a single console.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                  <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Deploy
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-8">
        <div className="mb-8 w-full max-w-sm lg:hidden">
          <DeployLogo className="justify-center" />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
