# Contributing

Thanks for helping improve Deploy.

## Setup

Follow [docs/self-hosting.md](docs/self-hosting.md) for Docker, or:

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Run the teardown worker when testing deletion flows:

```bash
npm run worker:teardown
```

## Guidelines

- Prefer small, focused pull requests.
- Match existing TypeScript, UI, and API patterns.
- Do not commit `.env` or secrets.
- For schema changes, add a Prisma migration under `prisma/migrations/`.
- Update docs when you change install steps, env vars, or operator workflows.

## Scope reminder

This repo is the **control plane**. Agent/runtime changes belong in the deploy-agent project unless the control plane API contract changes—in that case, document the contract update in `docs/architecture.md`.
