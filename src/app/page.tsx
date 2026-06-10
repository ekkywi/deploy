import Link from "next/link"
import { ArrowRight, Layers3, ShieldCheck, TerminalSquare } from "lucide-react"

const highlights = [
  {
    title: "Release visibility",
    description: "Track environments, operators, and deployment health from one surface.",
    icon: Layers3,
  },
  {
    title: "Access control",
    description: "Review account roles and approvals with clear audit-friendly states.",
    icon: ShieldCheck,
  },
  {
    title: "Operational focus",
    description: "Keep teams aligned around status, ownership, and execution timing.",
    icon: TerminalSquare,
  },
]

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_48%)]"
        aria-hidden
      />

      <section className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-6 pb-10 pt-6 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between rounded-full border border-border/80 bg-background/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3 text-sm font-medium tracking-tight">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background">
              D
            </span>
            <span>Deploy</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full border border-border bg-foreground px-4 py-2 text-background"
            >
              Request access
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Deploy Control Plane
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-medium tracking-[-0.06em] text-balance text-foreground sm:text-6xl lg:text-7xl">
                Release infrastructure with the calm of a product-grade console.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                A focused operational workspace for deployments, team access, and environment oversight.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
              >
                Open console
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-muted/50 px-5 text-sm font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-colors hover:bg-muted"
              >
                Request account
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-8 h-40 rounded-full bg-white/8 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="border-b border-border/80 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Production overview</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Live release control across teams and environments
                    </p>
                  </div>
                  <div className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
                    Updated now
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Projects", "12"],
                    ["Environments", "08"],
                    ["Pending approvals", "03"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-border/80 bg-muted/35 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-medium tracking-[-0.04em]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/80 bg-background/80 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Recent activity</span>
                    <span className="text-muted-foreground">Last 24 hours</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      ["api-gateway", "Production rollout succeeded", "2 minutes ago"],
                      ["team access", "2 approvals awaiting review", "10 minutes ago"],
                      ["staging cluster", "Node pool sync completed", "28 minutes ago"],
                    ].map(([name, state, time]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">{state}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="features" className="grid gap-4 border-t border-border/80 pt-10 md:grid-cols-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-3xl border border-border/80 bg-card/90 p-5 backdrop-blur">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-border bg-muted/50">
                <Icon className="size-4" aria-hidden />
              </span>
              <h2 className="mt-6 text-lg font-medium tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  )
}
