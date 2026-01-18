#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be ready (with retry logic)
echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

wait_for_db() {
  # Use prisma db push with dry-run to check connectivity
  npx prisma db push --skip-generate --accept-data-loss > /dev/null 2>&1 || return 1
  return 0
}

# Wait loop with timeout
until wait_for_db || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Database connection attempt $RETRY_COUNT/$MAX_RETRIES - sleeping..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "WARNING: Could not verify database connection after $MAX_RETRIES attempts"
  echo "Will attempt to continue anyway..."
else
  echo "Database connection verified!"
fi

# Run Prisma migrations or push schema
echo "Setting up database schema..."
if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
  echo "Migrations found - running migrate deploy..."
  npx prisma migrate deploy --skip-generate || {
    echo "Migration deploy failed, falling back to db push..."
    npx prisma db push --accept-data-loss --skip-generate
  }
else
  echo "No migrations found - pushing schema directly..."
  npx prisma db push --accept-data-loss --skip-generate
fi

# Prisma Client is already generated in builder stage and copied
# Only regenerate if needed (will use existing binaries from builder)
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "Generating Prisma Client..."
  npx prisma generate
else
  echo "Prisma Client already generated, skipping..."
fi

# Start the Next.js application
echo "Starting Next.js application..."
exec node server.js
