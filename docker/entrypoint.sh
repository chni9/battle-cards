#!/bin/sh
set -eu

echo "Running database migrations…"
pnpm --filter @card-battle/server db:migrate

echo "Starting Card Battle server…"
exec pnpm --filter @card-battle/server start
