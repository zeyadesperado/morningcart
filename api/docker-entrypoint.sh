#!/bin/sh
# MorningCart API container entrypoint.
# Runs from /app/api (Dockerfile WORKDIR). Order matters:
#   1. apply pending migrations against the Postgres in DATABASE_URL
#   2. optionally seed (idempotent upserts) when SEED_ON_BOOT=true
#   3. start the server
set -e

echo "[entrypoint] applying migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_BOOT" = "true" ]; then
  echo "[entrypoint] SEED_ON_BOOT=true — seeding database..."
  npx tsx prisma/seed.ts
fi

echo "[entrypoint] starting API server..."
exec npx tsx src/server.ts
