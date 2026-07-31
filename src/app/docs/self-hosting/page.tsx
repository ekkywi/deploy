import Link from 'next/link'
import { DocsProse } from '@/components/docs/docs-prose'

export default function SelfHostingDocsPage() {
  return (
    <DocsProse>
      <h1>Self-hosting</h1>
      <p>
        Run the Deploy <strong>control plane</strong> with Docker Compose. Builds still
        happen on separate worker hosts via a deploy agent (port <code>4000</code>).
      </p>

      <h2>What Compose starts</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>web</code>
            </td>
            <td>Next.js console + API</td>
          </tr>
          <tr>
            <td>
              <code>worker</code>
            </td>
            <td>Async project teardown (BullMQ)</td>
          </tr>
          <tr>
            <td>
              <code>postgres</code>
            </td>
            <td>Primary database</td>
          </tr>
          <tr>
            <td>
              <code>redis</code>
            </td>
            <td>Job queue</td>
          </tr>
        </tbody>
      </table>

      <h2>1. Install</h2>
      <pre>
        <code>{`git clone <your-repo-url> deploy
cd deploy
cp .env.example .env
# set JWT_SECRET and change SEED_ADMIN_PASSWORD
docker compose up -d --build`}</code>
      </pre>
      <p>
        Open <code>http://&lt;host&gt;:3000</code> and sign in with the seed admin from{' '}
        <code>.env</code> (defaults: <code>admin@localhost</code> /{' '}
        <code>changeme</code>).
      </p>
      <p>
        After the first boot, set <code>SEED_ON_START=false</code>. Re-seeding will not
        overwrite an existing admin password.
      </p>

      <h2>2. Environment variables</h2>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>JWT_SECRET</code>
            </td>
            <td>yes</td>
            <td>Signs auth cookies/tokens</td>
          </tr>
          <tr>
            <td>
              <code>DATABASE_URL</code>
            </td>
            <td>local</td>
            <td>Prisma connection string</td>
          </tr>
          <tr>
            <td>
              <code>POSTGRES_*</code>
            </td>
            <td>compose</td>
            <td>Credentials used inside Compose</td>
          </tr>
          <tr>
            <td>
              <code>REDIS_HOST</code> / <code>PORT</code>
            </td>
            <td>yes</td>
            <td>BullMQ / teardown queue</td>
          </tr>
          <tr>
            <td>
              <code>SEED_ON_START</code>
            </td>
            <td>no</td>
            <td>
              <code>true</code> to upsert bootstrap admin on web start
            </td>
          </tr>
          <tr>
            <td>
              <code>APP_PORT</code>
            </td>
            <td>no</td>
            <td>Host port mapped to the web container</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Register a worker node</h2>
      <ol>
        <li>Provision a Linux host with Docker.</li>
        <li>
          Run the <strong>deploy agent</strong> on that host (separate process),
          listening on port <strong>4000</strong>, with an auth token and{' '}
          <code>CONTROL_PLANE_URL</code> pointing at this console.
        </li>
        <li>
          In the console: <strong>Admin → Infrastructure</strong> — add the worker IP
          and matching token, then select supported tiers.
        </li>
      </ol>
      <p>
        The control plane must reach <code>http://&lt;worker-ip&gt;:4000</code>. Inside
        Docker, <code>127.0.0.1</code> is not the host — use a LAN IP or your
        platform&apos;s host gateway.
      </p>

      <h2>4. First deploy checklist</h2>
      <ol>
        <li>Create a project with a cloneable <code>repoUrl</code>.</li>
        <li>Create an environment (stack, branch, optional domain).</li>
        <li>Add environment variables.</li>
        <li>Ensure an active worker supports that tier.</li>
        <li>
          Deploy from the environment page, or wire the GitHub webhook from project
          settings.
        </li>
      </ol>

      <h2>5. Upgrades</h2>
      <pre>
        <code>{`git pull
docker compose up -d --build`}</code>
      </pre>
      <p>
        <code>web</code> runs <code>prisma migrate deploy</code> on start. Back up
        Postgres before upgrading production.
      </p>

      <h2>6. Backups</h2>
      <pre>
        <code>{`docker compose exec -T postgres pg_dump -U deploy deploy > backup-$(date +%F).sql
cat backup-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U deploy deploy`}</code>
      </pre>
      <p>
        Redis mainly holds job state. Prefer keeping <code>web</code> and{' '}
        <code>worker</code> running together so deletions finish.
      </p>

      <h2>7. Local development tip</h2>
      <p>
        For day-to-day coding you do not need full Compose. Run only dependencies:
      </p>
      <pre>
        <code>{`docker compose up -d postgres redis
npm run dev
npm run worker:teardown`}</code>
      </pre>
      <p>
        Or keep using Postgres/Redis installed on the host — point{' '}
        <code>.env</code> at them. More detail also lives in{' '}
        <code>docs/self-hosting.md</code> in the repository.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <Link href="/docs/using-deploy">Using Deploy</Link> — console workflow
        </li>
        <li>
          <Link href="/docs/architecture">Architecture</Link> — control plane vs agent
        </li>
      </ul>
    </DocsProse>
  )
}
