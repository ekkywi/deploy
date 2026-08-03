# Architecture

Deploy is split into a **control plane** (this repository) and **execution agents** on worker hosts. The only supported execution runtime is **Docker**: agents build and run app containers on each worker.

## Control plane (this repo)

| Component | Responsibility |
|-----------|----------------|
| Next.js `web` | Console UI, REST API, auth, GitHub webhook intake |
| `worker` (`npm run worker:teardown`) | Consumes BullMQ jobs to finish project deletion / cleanup |
| PostgreSQL | Users, projects, environments, deployments, workers, audit logs |
| Redis | Queue backing store for teardown jobs |

Main domain model (see `prisma/schema.prisma`):

- **User** — global roles (`SYSADMIN`, `MANAGER`, `DEVELOPER`) and account status
- **Project** — repo URL, members (`OWNER` / `EDITOR` / `VIEWER`), webhook secret
- **Environment** — stack, tier, branch, domain, lifecycle, variables
- **Deployment** — status, assigned worker/port, commit/branch metadata
- **WorkerNode** — IP + auth token used to call the agent API

## Deploy agent (separate process)

Each registered worker runs an agent (default port `4000`) on a host with Docker. The agent:

- accepts authenticated deploy / stop / destroy requests from the control plane
- clones the repository and builds/runs Docker containers on that host
- streams build logs back to the console

The control plane selects a worker by active flag + supported tier, then POSTs to:

`http://<worker.ipAddress>:4000/api/deploy`

## Request flows

### Manual / API deploy

1. User triggers deploy for an environment.
2. Control plane creates a `Deployment` (`PENDING` → `BUILDING`).
3. Payload (repo, branch, env vars, port) is sent to the chosen agent.
4. Agent reports progress; console fetches logs via the agent log endpoint.

### GitHub webhook

1. GitHub POSTs to `/api/webhooks/github/[projectId]` with the project webhook secret.
2. Matching environments (branch) enqueue the same deployment path as above.

### Project deletion

1. API marks the project for deletion and enqueues a BullMQ job.
2. Teardown worker stops/destroys agent resources, then removes DB rows.

## Trust boundaries

- Browser sessions are JWT-based (`JWT_SECRET`).
- Secret environment variables and worker agent tokens are encrypted at rest with `ENCRYPTION_KEY` (AES-256-GCM). Plaintext is only held in memory when deploying or revealing in the console.
- Control plane → agent uses per-worker `authToken` (`Authorization: Bearer …`) over HTTP. Keep agents on a private network (or VPN); do not expose port `4000` to the public internet. HTTPS between plane and agent is optional/advanced.
- Deploy scheduling probes worker `/api/health` and only assigns **online** agents. Stuck `PENDING`/`BUILDING` deployments older than `DEPLOY_TIMEOUT_MINUTES` (default 45) are marked `FAILED` by the teardown worker sweep (and again just before a new deploy).
- Treat DB access and `ENCRYPTION_KEY` as highly sensitive.
