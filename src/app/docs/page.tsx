import Link from 'next/link'
import { DocsProse } from '@/components/docs/docs-prose'

export default function DocsHomePage() {
  return (
    <DocsProse>
      <h1>Documentation</h1>
      <p>
        Deploy is a self-hosted control plane for shipping apps onto your own worker
        nodes. Use these guides to run the console day to day, or to install it for
        your team.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            href: '/docs/using-deploy',
            title: 'Using Deploy',
            body: 'Projects, environments, deploys, members, and webhooks.',
          },
          {
            href: '/docs/self-hosting',
            title: 'Self-hosting',
            body: 'Docker Compose install, env vars, workers, upgrades, backups.',
          },
          {
            href: '/docs/architecture',
            title: 'Architecture',
            body: 'How the control plane, Redis worker, and deploy agents fit together.',
          },
          {
            href: '/console',
            title: 'Open console',
            body: 'Jump back into the dashboard when you are ready to deploy.',
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-md border border-border p-4 no-underline transition-colors hover:bg-accent/40"
          >
            <div className="text-sm font-medium text-foreground">{card.title}</div>
            <p className="mt-1 text-sm text-muted-foreground no-underline">{card.body}</p>
          </Link>
        ))}
      </div>

      <h2>Quick path</h2>
      <ol>
        <li>
          Sign in to the <Link href="/console">console</Link> (or{' '}
          <Link href="/register">register</Link> and wait for admin approval).
        </li>
        <li>Create a project with a cloneable repository URL.</li>
        <li>Add an environment, variables, and at least one worker node.</li>
        <li>Trigger a deploy and follow logs from the environment page.</li>
      </ol>
      <p>
        Full walkthrough: <Link href="/docs/using-deploy">Using Deploy</Link>. Installing
        your own instance: <Link href="/docs/self-hosting">Self-hosting</Link>.
      </p>
    </DocsProse>
  )
}
