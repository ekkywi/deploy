import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 76 65" fill="currentColor" className={className} aria-hidden>
      <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
  )
}

function ConsolePreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="flex h-9 items-center gap-2 border-b border-border px-3">
        <span className="size-2 rounded-full bg-[#333]" />
        <span className="size-2 rounded-full bg-[#333]" />
        <span className="size-2 rounded-full bg-[#333]" />
        <div className="ml-3 h-5 flex-1 rounded-md bg-[#111]" />
      </div>
      <div className="grid min-h-[280px] sm:min-h-[340px] sm:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border p-3 sm:block">
          <div className="mb-4 flex items-center gap-2 px-1 text-xs font-medium text-foreground">
            <LogoMark className="size-3" />
            Deploy
          </div>
          <div className="space-y-1">
            {['Overview', 'Projects', 'Deployments', 'Docs'].map((item, index) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 text-xs ${
                  index === 1
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-sm font-medium text-foreground">Projects</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">3 projects · 8 environments</p>
            </div>
            <div className="h-7 rounded-md bg-foreground px-2.5 text-[11px] font-medium leading-7 text-background">
              Create Project
            </div>
          </div>
          <div className="divide-y divide-border rounded-md border border-border">
            {[
              { name: 'ops-center', env: '3 envs', status: 'Ready' },
              { name: 'billing-api', env: '2 envs', status: 'Building' },
              { name: 'docs-site', env: '3 envs', status: 'Ready' },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">{row.env}</p>
                </div>
                <span
                  className={`shrink-0 text-[11px] ${
                    row.status === 'Building' ? 'text-sky-400' : 'text-emerald-400'
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)',
        }}
      />

      <header className="relative z-10 mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <LogoMark className="size-3.5" />
          Deploy
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/docs"
            className="hidden px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Docs
          </Link>
          <Link
            href="/docs/self-hosting"
            className="hidden px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            Self-hosting
          </Link>
          <Link
            href="/login"
            className="px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="ml-1 inline-flex h-8 items-center rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-2 text-center duration-500 fill-mode-both">
          <div className="mb-5 inline-flex items-center gap-2 text-foreground">
            <LogoMark className="size-5 sm:size-6" />
            <span className="text-lg font-medium tracking-tight sm:text-xl">Deploy</span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Ship on your own infrastructure
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground text-balance sm:text-lg">
            A self-hosted control plane for projects, environments, and deployments.
            Apps run as Docker containers on your worker hosts — Docker is the only
            runtime supported right now.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              Get started
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
            >
              Read the docs
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 fill-mode-both sm:mt-16">
          <ConsolePreview />
        </div>
      </section>

      <section className="relative z-10 border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl sm:grid-cols-3">
          {[
            {
              title: 'Projects & environments',
              body: 'Connect repos, pick a stack and tier, and manage env vars in one place.',
            },
            {
              title: 'Docker on your workers',
              body: 'Each deploy builds and runs a container via the agent on a Docker host. No other runtime is supported yet.',
            },
            {
              title: 'Self-hosted by design',
              body: 'Run the control plane with Docker Compose. Keep code and data on your nodes.',
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`px-5 py-8 sm:px-6 sm:py-10 ${
                index > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : ''
              }`}
            >
              <h2 className="text-sm font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-14">
          <div className="max-w-xl">
            <h2 className="text-lg font-medium tracking-tight text-foreground">
              Ready to self-host?
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Install with Compose, register a Docker worker agent, and deploy your first
              project.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/docs/self-hosting"
              className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Self-hosting guide
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Open console
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 text-xs text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="size-3" />
            <span>&copy; {new Date().getFullYear()} Deploy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link href="/docs/architecture" className="transition-colors hover:text-foreground">
              Architecture
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Console
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
