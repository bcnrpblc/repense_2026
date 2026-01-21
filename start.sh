#!/bin/sh
set -e

echo "Skipping migrations (schema managed manually)..."
echo "Starting Next.js application..."
exec node server.js