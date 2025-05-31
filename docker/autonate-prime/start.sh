#!/bin/sh

echo "🚀 Starting Autonate Prime..."
echo "Liberation Mode: ${LIBERATION_MODE}"
echo "Environment: ${NODE_ENV}"

# Wait for dependent services
echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 1
done
echo "Redis is ready!"

echo "Waiting for PostgreSQL..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Start the agent
node agents/autonate-prime/index.js
