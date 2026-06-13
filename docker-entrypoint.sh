#!/bin/sh
set -eu

cd /app

echo "Waiting for database and applying Prisma migrations..."
RETRIES="${DB_MIGRATION_RETRIES:-12}"
DELAY="${DB_MIGRATION_RETRY_DELAY:-5}"
ATTEMPT=1

while true; do
  if npx --no-install prisma migrate deploy; then
    break
  fi

  if [ "$ATTEMPT" -ge "$RETRIES" ]; then
    echo "Prisma migration failed after $ATTEMPT attempts."
    exit 1
  fi

  echo "Migration failed; retrying in ${DELAY}s (${ATTEMPT}/${RETRIES})..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$DELAY"
done

echo "Creating or updating admin user..."
node dist/scripts/createAdmin.js

echo "Starting server..."
exec node dist/server.js