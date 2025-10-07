# Database Migration Container

This container is designed to run database migrations once and then shut down. It's a helper container that ensures the database is properly initialized with the latest Prisma migrations.

## Features

- ✅ Waits for PostgreSQL to be ready before running migrations
- ✅ Runs `prisma migrate deploy` to apply all pending migrations
- ✅ Exits after successful completion (no restart)
- ✅ Proper error handling and logging
- ✅ Uses the same database credentials as the main application

## Usage

### Prerequisites

Make sure the PostgreSQL database is running:

```bash
# Start the database first
cd db
docker-compose up -d postgres
```

### Running Migrations

```bash
# From the project root
cd db/migrate

# Run migrations using the shell script (recommended)
./run-migrations.sh

# Or run with Docker Compose directly
docker-compose --env-file ../.env up --build

# Or run without environment file (uses defaults)
docker-compose up --build
```

### Alternative: Run with main database stack

You can also integrate this into your main database compose file by adding the service there.

## Environment Variables

The container uses the same environment variables as the main database:

- `POSTGRES_HOST` - Database host (default: postgres)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_DB` - Database name
- `DATABASE_URL` - Full database connection string

## Container Behavior

1. **Startup**: Container starts and waits for database connectivity
2. **Migration**: Runs `prisma migrate deploy` to apply all pending migrations
3. **Completion**: Logs success and exits with code 0
4. **Error Handling**: If any step fails, exits with code 1

## Logs

The container provides detailed logging:

```
🚀 Starting database migration...
📍 Database: postgres:5432/contentdb
⏳ Waiting for database to be ready...
✅ Database is ready!
🔧 Running Prisma migrations...
✅ Migrations completed successfully!
🎉 Database migration completed successfully!
```

## Integration with CI/CD

This container can be used in CI/CD pipelines to ensure database migrations are applied before deploying applications:

```yaml
# Example GitHub Actions step
- name: Run Database Migrations
  run: |
    cd db/migrate
    docker-compose up --build --exit-code-from db-migrate
```

## Troubleshooting

### Container exits immediately
- Check that PostgreSQL is running and accessible
- Verify environment variables are set correctly
- Check database credentials

### Migration fails
- Ensure the database schema is in a consistent state
- Check Prisma migration files for syntax errors
- Verify database permissions

### Connection timeout
- Increase the retry count in `migrate.js` if needed
- Check network connectivity between containers
