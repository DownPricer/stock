#!/bin/sh
set -eu

mkdir -p /data/db /data/uploads

echo "[fastbag] prisma migrate deploy…"
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[fastbag] démarrage Next.js sur 0.0.0.0:3000…"
exec node server.js
