# Self-hosting guide

This guide covers running the Deploy **control plane** with Docker Compose. Worker hosts still need a separate deploy agent process that can talk to Docker and clone your git repositories.

## Architecture at a glance

```text
Browser / GitHub webhook
        │
        ▼
┌───────────────────┐     Redis      ┌─────────────────┐
│  web (Next.js)    │───────────────▶│ teardown worker │
└─────────┬─────────┘                └─────────────────┘
          │
          │ DATABASE_URL
          ▼
      PostgreSQL

web ──HTTP :4000──▶ deploy-agent on each WorkerNode (your VMs)
```

## 1. Install the control plane

```bash
git clone <your-fork-or-repo-url> deploy
cd deploy
cp .env.example .env
```

Edit `.env` before the first start:

1. Set a long random `JWT_SECRET`.
2. Change `SEED_ADMIN_PASSWORD` (and ideally `SEED_ADMIN_EMAIL`).
3. Optionally change Postgres credentials (`POSTGRES_*`).

Then:

```bash
docker compose up -d --build
```

The `web` container:

- waits for Postgres
- runs `prisma migrate deploy`
- seeds the first SYSADMIN when `SEED_ON_START=true`
- starts the Next.js server on port `3000` (override with `APP_PORT`)

Sign in at `http://<host>:3000`.

After the first successful boot, set `SEED_ON_START=false`. Re-running seed will not overwrite an existing admin password; it only ensures the account remains active as SYSADMIN.

## 2. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | yes | Signs auth cookies/tokens |
| `DATABASE_URL` | yes (local) | Prisma connection string |
| `POSTGRES_USER` / `PASSWORD` / `DB` | compose | Used to build `DATABASE_URL` inside Compose |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | yes | BullMQ / teardown queue |
| `SEED_ON_START` | no | `true` to upsert the bootstrap admin on web start |
| `SEED_ADMIN_EMAIL` | no | Default `admin@localhost` |
| `SEED_ADMIN_PASSWORD` | no | Default `changeme` (min 8 chars) |
| `APP_PORT` | no | Host port mapped to the web container |

## 3. Register a worker node

1. Provision a Linux host with Docker installed.
2. Run the **deploy agent** on that host (separate repository/process) listening on port **4000**, with an auth token.
3. In the console: **Admin → Infrastructure →** add a worker with the host’s reachable IPv4 and matching token.
4. On the worker host, set `AGENT_AUTH_TOKEN` to that same token and `CONTROL_PLANE_URL` to your control plane base URL (for example `http://192.168.1.10:3000`). Without `CONTROL_PLANE_URL`, deploy status will not update in the console.
5. Select which environment tiers the node may run (`DEVELOPMENT` / `STAGING` / `PRODUCTION`).

Networking notes:

- The control plane must reach `http://<worker-ip>:4000`.
- If the control plane runs in Docker on the same machine as an agent on the host, `127.0.0.1` inside the container is **not** the host. Use the host LAN IP, or a Docker host gateway address your platform provides.
- Agents must reach your git remotes (and any private registry) themselves.

## 4. First project deploy checklist

1. Create a project with a cloneable `repoUrl`.
2. Create an environment (stack, branch, optional domain string).
3. Add environment variables.
4. Ensure at least one **active** worker supports that environment’s tier.
5. Trigger a deploy from the environment page, or configure the GitHub webhook + webhook secret from project settings.

## 5. Upgrades

```bash
git pull
docker compose up -d --build
```

`web` runs `prisma migrate deploy` on start. Review migration notes before upgrading production instances. Always back up Postgres first.

## 6. Backups

**PostgreSQL** (example):

```bash
docker compose exec -T postgres pg_dump -U deploy deploy > backup-$(date +%F).sql
```

Restore:

```bash
cat backup-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U deploy deploy
```

**Redis** mainly holds job state; losing it may leave in-flight teardowns unfinished. Prefer AOF (enabled in Compose) and treat Postgres as the source of truth.

## 7. Operations tips

- Keep `web` and `worker` running together. Without `worker`, project deletion jobs will queue but not complete.
- New registrations stay `PENDING` until a SYSADMIN activates them (Admin → Users).
- Audit logs live under Admin → Audit Logs.
- For production TLS, put a reverse proxy (Caddy, Traefik, nginx) in front of `web` and terminate HTTPS there.

## 8. Development without full Compose

Run only dependencies:

```bash
docker compose up -d postgres redis
```

Then use `npm run dev` and `npm run worker:teardown` on the host with `.env` pointing at `localhost`.
