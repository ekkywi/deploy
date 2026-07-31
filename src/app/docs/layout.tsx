import Link from 'next/link'
import { DocsNav } from '@/components/docs/docs-nav'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium">
              <span className="inline-flex size-5 items-center justify-center" aria-hidden>
                <svg viewBox="0 0 76 65" fill="currentColor" className="size-3.5">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                </svg>
              </span>
              Deploy
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Docs</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/console" className="text-muted-foreground transition-colors hover:text-foreground">
              Console
            </Link>
            <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3 px-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
            Documentation
          </p>
          <DocsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
