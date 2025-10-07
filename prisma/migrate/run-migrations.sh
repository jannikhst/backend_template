#!/bin/bash

# Database Migration Runner Script
# This script runs the database migration container

set -e

echo "🚀 Starting database migration process..."

# Check if we're in the right directory
if [ ! -f "compose.yml" ]; then
    echo "❌ Error: compose.yml not found. Please run this script from the db/migrate directory."
    exit 1
fi

# Check if .env file exists in parent directory
if [ ! -f "../.env" ]; then
    echo "⚠️  Warning: ../.env file not found. Make sure environment variables are set."
fi

# Run the migration container
echo "🔧 Building and running migration container..."
docker compose --env-file ../.env up --build --remove-orphans

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    echo "🧹 Cleaning up..."
    docker compose down --remove-orphans
else
    echo "❌ Database migration failed!"
    echo "🧹 Cleaning up..."
    docker compose down --remove-orphans
    exit 1
fi

echo "🎉 Migration process finished!"
