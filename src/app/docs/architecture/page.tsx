import Link from 'next/link'
import { DocsProse } from '@/components/docs/docs-prose'

export default function ArchitectureDocsPage() {
  return (
    <DocsProse>
      <h1>Architecture</h1>
      <p>
        Deploy splits into a <strong>control plane</strong> (this application) and{' '}
        <strong>execution agents</strong> on worker hosts. The only supported
        execution runtime is <strong>Docker</strong>: agents build and run app
        containers on each worker.
      </p>

      <h2>Control plane</h2>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Responsibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>web</code>
            </td>
            <td>Console UI, REST API, auth, GitHub webhook intake</td>
          </tr>
          <tr>
            <td>
              <code>worker</code>
            </td>
            <td>Consumes BullMQ jobs to finish project deletion / cleanup</td>
          </tr>
          <tr>
            <td>PostgreSQL</td>
            <td>Users, projects, environments, deployments, workers, audit logs</td>
          </tr>
          <tr>
            <td>Redis</td>
            <td>Queue backing store for teardown jobs</td>
          </tr>
        </tbody>
      </table>

      <h3>Domain model</h3>
      <ul>
        <li>
          <strong>User</strong> — global roles and account status
        </li>
        <li>
          <strong>Project</strong> — repo URL, members, webhook secret
        </li>
        <li>
          <strong>Environment</strong> — stack, tier, branch, domain, lifecycle,
          variables
        </li>
        <li>
          <strong>Deployment</strong> — status, worker/port, commit metadata
        </li>
        <li>
          <strong>WorkerNode</strong> — IP + auth token used to call the agent
        </li>
      </ul>

      <h2>Deploy agent</h2>
      <p>
        Each registered worker runs an agent (default port 4000) on a host with
        Docker. The agent:
      </p>
      <ul>
        <li>accepts authenticated deploy / stop / destroy requests</li>
        <li>clones the repository and builds/runs Docker containers on that host</li>
        <li>streams build logs back to the console</li>
      </ul>
      <p>
        The control plane selects a worker by active flag + supported tier, then POSTs
        to <code>http://&lt;worker.ipAddress&gt;:4000/api/deploy</code>.
      </p>

      <h2>Main flows</h2>
      <h3>Manual deploy</h3>
      <ol>
        <li>User triggers deploy for an environment.</li>
        <li>
          Control plane creates a deployment (<code>PENDING</code> →{' '}
          <code>BUILDING</code>).
        </li>
        <li>Payload is sent to the chosen agent.</li>
        <li>Console fetches logs via the agent log endpoint.</li>
      </ol>

      <h3>GitHub webhook</h3>
      <ol>
        <li>
          GitHub POSTs to <code>/api/webhooks/github/[projectId]</code> with the
          project webhook secret.
        </li>
        <li>Matching environments enqueue the same deployment path.</li>
      </ol>

      <h3>Project deletion</h3>
      <ol>
        <li>API marks the project for deletion and enqueues a BullMQ job.</li>
        <li>
          Teardown worker stops/destroys agent resources, then removes database rows.
        </li>
      </ol>

      <h2>Trust boundaries</h2>
      <ul>
        <li>
          Browser sessions are JWT-based (<code>JWT_SECRET</code>).
        </li>
        <li>
          Control plane → agent uses per-worker <code>authToken</code>.
        </li>
        <li>
          Env var values live in Postgres today — treat database access as sensitive.
        </li>
      </ul>

      <p>
        Next: <Link href="/docs/self-hosting">Self-hosting</Link> or{' '}
        <Link href="/docs/using-deploy">Using Deploy</Link>.
      </p>
    </DocsProse>
  )
}
