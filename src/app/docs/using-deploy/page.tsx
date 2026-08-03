import Link from 'next/link'
import { DocsProse } from '@/components/docs/docs-prose'

export default function UsingDeployDocsPage() {
  return (
    <DocsProse>
      <h1>Using Deploy</h1>
      <p>
        This tutorial covers the day-to-day console workflow for internal teams:
        accounts, projects, environments, deployments, and collaboration.
      </p>
      <p>
        <strong>Runtime:</strong> Deploy only supports <strong>Docker</strong> on
        worker hosts. The agent builds and runs each environment as a container.
      </p>

      <h2>1. Accounts and access</h2>
      <ul>
        <li>
          New users <Link href="/register">register</Link> with email and password.
          Accounts start as <strong>PENDING</strong> until a SYSADMIN activates them.
        </li>
        <li>
          Global roles: <strong>SYSADMIN</strong> (platform admin),{' '}
          <strong>MANAGER</strong>, <strong>DEVELOPER</strong>.
        </li>
        <li>
          Project roles: <strong>OWNER</strong>, <strong>EDITOR</strong>,{' '}
          <strong>VIEWER</strong> — assign them under a project&apos;s Members tab.
        </li>
      </ul>

      <h2>2. Create a project</h2>
      <ol>
        <li>
          Open <Link href="/console/projects">Projects</Link> and create a project.
        </li>
        <li>Set a name and a Git repository URL the worker agent can clone.</li>
        <li>
          Optionally invite teammates from Members. They must already have an account
          on this instance.
        </li>
      </ol>

      <h2>3. Environments</h2>
      <p>
        Environments live under a project (for example <code>development</code>,{' '}
        <code>staging</code>, <code>production</code>). You can also browse all of them
        from <Link href="/console/environments">Environments</Link> in the console
        sidebar. Every environment is deployed as a Docker container. For each
        environment configure:
      </p>
      <ul>
        <li>
          <strong>Stack</strong> — Next.js, Laravel, or Node.js (all run as Docker
          containers)
        </li>
        <li>
          <strong>Tier</strong> — which worker nodes are allowed to run it
        </li>
        <li>
          <strong>Branch</strong> — default branch for deploys / webhooks
        </li>
        <li>
          <strong>Domain</strong> — optional hostname string for your own routing
        </li>
        <li>
          <strong>Environment variables</strong> — plain or secret (masked in the UI)
        </li>
      </ul>
      <p>
        You can suspend an environment to block new deploys while keeping the record.
      </p>

      <h2>4. Deploy</h2>
      <ol>
        <li>Open the environment page and start a deploy for the chosen branch.</li>
        <li>
          Deploy picks an active worker that supports the environment tier, then asks
          the agent on that Docker host to build and run the container.
        </li>
        <li>
          Watch status on Overview / Deployments, and open logs from the deployment
          row while the build runs.
        </li>
      </ol>
      <p>
        Status values: <code>PENDING</code> → <code>BUILDING</code> →{' '}
        <code>SUCCESS</code>, <code>FAILED</code>, or <code>CANCELLED</code>. While a
        build is queued or running, editors can cancel it from the deployment row.
      </p>
      <ul>
        <li>
          <strong>Redeploy</strong> — rebuild the environment&apos;s current branch (or
          last known ref) with the current environment variables.
        </li>
        <li>
          <strong>Rollback</strong> — from a successful deployment row that has a
          recorded commit SHA, pin and redeploy that commit. Older rows without a SHA
          cannot be rolled back until a new successful deploy records one. Rollback does
          not restore historical env vars.
        </li>
        <li>
          Deploy picks a worker that is <strong>Enabled</strong> and currently{' '}
          <strong>Online</strong> (health check). Sticky preference still applies among
          reachable workers.
        </li>
        <li>
          Builds stuck in <code>PENDING</code>/<code>BUILDING</code> longer than the
          deploy timeout (default 45 minutes) are marked <code>FAILED</code> automatically
          so the environment is not locked forever.
        </li>
      </ul>

      <h2>5. GitHub webhook (optional)</h2>
      <ol>
        <li>Open the project Settings tab and reveal the webhook secret.</li>
        <li>
          Point a GitHub webhook at{' '}
          <code>/api/webhooks/github/&lt;projectId&gt;</code> using that secret.
        </li>
        <li>
          Pushes to branches that match an environment can trigger deploys
          automatically.
        </li>
      </ol>

      <h2>6. Admin surfaces (SYSADMIN)</h2>
      <ul>
        <li>
          <Link href="/console/admin/users">Users</Link> — approve, suspend, edit roles
        </li>
        <li>
          <Link href="/console/admin/infrastructure">Infrastructure</Link> — register
          Docker worker nodes (IP + auth token + tiers)
        </li>
        <li>
          <Link href="/console/admin/system-logs">Audit Logs</Link> — track sensitive
          actions
        </li>
      </ul>

      <h2>Checklist for a first successful deploy</h2>
      <ol>
        <li>At least one active Docker worker with a matching tier</li>
        <li>Docker installed on the worker; agent reachable at <code>http://&lt;worker-ip&gt;:4000</code></li>
        <li>Project repo URL cloneable from the worker</li>
        <li>Environment variables set for the app</li>
        <li>Teardown worker running if you plan to delete projects later</li>
      </ol>
      <p>
        Installing the platform itself? See{' '}
        <Link href="/docs/self-hosting">Self-hosting</Link>.
      </p>
    </DocsProse>
  )
}
