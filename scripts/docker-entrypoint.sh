#!/bin/sh
set -eu

echo "[entrypoint] Running database schema push..."
npm run dbp

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Running seed script..."
  npx tsx ./scripts/seedHolz.ts
  npx tsx ./scripts/seedAdminUser.ts
fi

echo "[entrypoint] Starting Next.js app..."
exec npm run start
