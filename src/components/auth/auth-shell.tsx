import { Layers, Rocket, Shield } from 'lucide-react'

import { cn } from '@/lib/utils'

const features = [
  {
    icon: Shield,
    title: 'Role-based access',
    description: 'SYSADMIN, MANAGER, and DEVELOPER permissions',
    iconClass: 'bg-violet-500/25 text-violet-200 ring-violet-400/30',
  },
  {
    icon: Rocket,
    title: 'Multi-environment nodes',
    description: 'DEV, STAGING, and PROD execution targets',
    iconClass: 'bg-cyan-500/25 text-cyan-200 ring-cyan-400/30',
  },
  {
    icon: Layers,
    title: 'Centralized metadata',
    description: 'Projects and deployment records in one place',
    iconClass: 'bg-amber-500/25 text-amber-200 ring-amber-400/30',
  },
] as const

function DeployLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 font-medium tracking-tight', className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6 shrink-0"
        aria-hidden
      >
        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
      </svg>
      <span>DEPLOY</span>
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.22_0.08_280)] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,oklch(0.55_0.22_264/0.55),transparent_55%),radial-gradient(ellipse_70%_55%_at_90%_100%,oklch(0.5_0.16_200/0.45),transparent_50%),radial-gradient(ellipse_50%_40%_at_70%_20%,oklch(0.55_0.14_320/0.35),transparent_45%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-600/30 via-indigo-950/40 to-[oklch(0.18_0.06_280)]" aria-hidden />

        <div className="relative z-10">
          <DeployLogo className="text-lg text-violet-100" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Deploy Control Plane
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/75">
              Manage projects, execution nodes, and releases from one place.
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
                  <p className="text-sm text-white/65">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">&copy; {new Date().getFullYear()} Deploy</p>
      </div>

      <div className="relative flex flex-col items-center justify-center bg-background p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.55_0.2_264/0.08),transparent_60%)]"
          aria-hidden
        />
        <div className="relative mb-8 w-full max-w-sm lg:hidden">
          <DeployLogo className="justify-center text-lg text-primary" />
        </div>
        <div className="relative w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
