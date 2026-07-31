import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-medium">
          <span className="inline-flex size-5 items-center justify-center">
            <svg viewBox="0 0 76 65" fill="currentColor" className="size-4">
              <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
            </svg>
          </span>
          Deploy
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          Deploy your projects
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground text-balance">
          Manage environments, ship releases, and keep your team aligned — from one console.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Open console
          </Link>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-px bg-border px-6 sm:grid-cols-3 sm:px-0">
          {[
            {
              title: "Projects",
              body: "Connect repositories and organize work across environments.",
            },
            {
              title: "Deployments",
              body: "Track every build — status, worker, commit, and logs.",
            },
            {
              title: "Access",
              body: "Approve accounts and assign roles with a clear audit trail.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-background px-6 py-10 sm:px-8">
              <h2 className="text-sm font-medium text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} Deploy</span>
        <Link href="/login" className="hover:text-foreground">
          Console
        </Link>
      </footer>
    </main>
  )
}
