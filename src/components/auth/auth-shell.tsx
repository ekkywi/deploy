import Link from 'next/link'

import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

function DeployLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium text-foreground transition-opacity hover:opacity-80',
        className
      )}
    >
      <svg viewBox="0 0 76 65" fill="currentColor" className="size-3.5" aria-hidden>
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
      </svg>
      Deploy
    </Link>
  )
}

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(0,0,0,0.04),transparent)] dark:bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(255,255,255,0.07),transparent)]"
      />

      <header className="relative z-10 flex h-14 items-center justify-between px-5 sm:px-6">
        <DeployLogo />
        <div className="flex items-center gap-2">
          <Link
            href="/docs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-6 sm:px-6">
        <div className="w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
          {children}
        </div>
        {footer ? (
          <div className="mt-6 w-full max-w-[360px] text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-4 px-5 pb-6 text-xs text-muted-foreground sm:px-6">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <Link href="/docs/self-hosting" className="transition-colors hover:text-foreground">
          Self-hosting
        </Link>
      </footer>
    </div>
  )
}
