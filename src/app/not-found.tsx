import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 65" fill="currentColor" className={className} aria-hidden>
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  )
}

export default function NotFound() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.04),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_55%)]"
      />

      <header className="relative z-10 mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <LogoMark className="size-3.5" />
          Deploy
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/docs"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground text-balance sm:text-base">
          That URL doesn&apos;t match anything in Deploy. It may have been moved, deleted, or
          mistyped.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Back to home
          </Link>
          <Link
            href="/console"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Open console
          </Link>
        </div>
      </main>
    </div>
  )
}
