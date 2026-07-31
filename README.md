# Deploy

Self-hosted control plane for deploying apps onto your own worker nodes. Apps run as **Docker containers** on those hosts — **Docker is the only runtime supported right now**. Built for internal teams and operators who want a Vercel-like workflow without giving up their infrastructure.

## What this repo is

This repository is the **control plane** (web console + API + teardown worker):

- Projects, environments, env vars, members
- Deployments triggered from the console or GitHub webhooks
- Worker node registry and audit logs
- Background project teardown via Redis/BullMQ

Runtime builds and Docker containers are executed by a separate **deploy agent** on each worker host (listens on port `4000`). Worker hosts must have Docker installed.

## Quick start (Docker Compose)

Requirements: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
# set a strong JWT_SECRET (and change SEED_ADMIN_PASSWORD)
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seed admin from `.env` (defaults: `admin@localhost` / `changeme`).

Services started:

| Service    | Role                                      |
|------------|-------------------------------------------|
| `web`      | Next.js console + API                     |
| `worker`   | Async project teardown consumer           |
| `postgres` | Primary database                          |
| `redis`    | Job queue for teardown                    |

Stop:

```bash
docker compose down
```

Data persists in Docker volumes (`postgres_data`, `redis_data`).

## Local development

```bash
cp .env.example .env
# point DATABASE_URL / Redis at local services (or use compose for postgres+redis only)

npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

In another terminal:

```bash
npm run worker:teardown
```

## Documentation

- In-app docs: [/docs](/docs) (Getting started, Using Deploy, Self-hosting, Architecture)
- [Self-hosting guide](docs/self-hosting.md) — install, env vars, upgrades, backups (repo mirror)
- [Architecture](docs/architecture.md) — control plane vs agent, main flows
- [Contributing](CONTRIBUTING.md) — local setup and PR expectations

## License

Choose and add a license before publishing the project publicly.
