#!/bin/sh
set -eu

if [ "${SKIP_DB_MIGRATE:-false}" != "true" ]; then
  echo "[entrypoint] Waiting for PostgreSQL..."
  ATTEMPTS=0
  MAX_ATTEMPTS=60

  until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT 1'))
  .then(() => client.end())
  .catch(() => process.exit(1));
" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
      echo "[entrypoint] PostgreSQL did not become ready in time."
      exit 1
    fi
    sleep 2
  done

  echo "[entrypoint] Applying database migrations..."
  npx prisma migrate deploy

  if [ "${SEED_ON_START:-false}" = "true" ]; then
    echo "[entrypoint] Seeding database..."
    npx tsx prisma/seed.ts
  fi
fi

echo "[entrypoint] Starting: $*"
exec "$@"
