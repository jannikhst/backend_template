# Backend Starter Template

A production-ready Express.js backend template with comprehensive authentication, session management, API keys, and auto-generated OpenAPI documentation. Built with TypeScript, Prisma, and Redis for scalable, type-safe backend development.

## Overview

This template provides a solid foundation for building backends that require user authentication and session management. It includes everything needed to quickly bootstrap a secure, well-documented API with minimal configuration.

## Key Features

### Authentication & Session Management
- **Multiple Authentication Methods**: Email/Password and OAuth (Google, Slack, GitHub)
- **Redis-Based Sessions**: Scalable session storage with sliding expiration
- **Multi-Session Support**: Users can maintain multiple active sessions across devices
- **Session Management**: List, view, and revoke individual or all sessions

### API Key Management
- **Server-to-Server Authentication**: Generate and manage API keys for programmatic access
- **Key Lifecycle**: Create, list, and revoke API keys with optional expiration dates
- **Usage Tracking**: Monitor last usage timestamps for each key

### User & Role Management
- **Role-Based Access Control (RBAC)**: Built-in support for ADMIN, USER, and GUEST roles
- **User Administration**: Admin endpoints for managing users, roles, and account status
- **Flexible Permissions**: Easily extend with custom roles and permissions

### Logging & Monitoring
- **Structured Logging**: JSON-formatted logs with contextual information
- **Request Tracing**: Unique trace IDs for correlating requests across services
- **Log Management**: Query, filter, and analyze logs via API endpoints
- **Database-Backed**: Persistent log storage in PostgreSQL

### Auto-Generated Documentation
- **OpenAPI 3.1 Specification**: Automatically generated from Zod schemas
- **Interactive UI**: ReDoc interface for exploring and testing endpoints
- **Always Up-to-Date**: Documentation reflects actual API implementation
- **Type-Safe**: Full TypeScript integration ensures schema accuracy

### Security
- **Rate Limiting**: Configurable rate limits per endpoint
- **Cloudflare Integration**: Extract real client IPs when behind Cloudflare
- **Security Headers**: Helmet.js for HTTP security headers
- **CORS Configuration**: Flexible cross-origin resource sharing setup
- **HPP Protection**: HTTP Parameter Pollution prevention

### Type Safety & Validation
- **Full TypeScript**: End-to-end type safety
- **Zod Schemas**: Runtime validation with compile-time type inference
- **Prisma ORM**: Type-safe database queries
- **Input/Output Validation**: Automatic request/response validation

## Technology Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js 5
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM
- **Session Store**: Redis
- **Validation**: Zod
- **Documentation**: OpenAPI 3.1 + ReDoc
- **Authentication**: Arctic (OAuth), bcrypt (passwords)
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend_template
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - Set `DATABASE_URL` for PostgreSQL connection
   - Set `REDIS_URL` for Redis connection
   - Configure OAuth providers (optional)
   - Adjust session and cookie settings

4. Start services with Docker Compose:
```bash
docker compose up -d
```

5. Run database migrations:
```bash
docker compose exec app npx prisma migrate deploy
```

6. Access the API:
   - API: `http://localhost:3000`
   - Documentation: `http://localhost:3000/v1/docs`

## Development

### Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Database Management

```bash
# Create a new migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Push schema changes (development only)
npm run db:push
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck
```

## Project Structure

```
├── src/
│   ├── core/              # Core functionality
│   │   ├── config/        # Configuration management
│   │   ├── db/            # Database client and logging
│   │   ├── http/          # HTTP middleware
│   │   ├── logging/       # Logging infrastructure
│   │   ├── openapi/       # OpenAPI generation
│   │   ├── services/      # Core services
│   │   └── types/         # TypeScript types
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Authentication endpoints
│   │   ├── api-keys/      # API key management
│   │   ├── admin/         # Admin endpoints
│   │   ├── logs/          # Log management
│   │   └── docs/          # Documentation generation
│   └── index.ts           # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrate/           # Migration utilities
├── docs/                  # API documentation
├── Dockerfile             # Container definition
└── compose.yml            # Docker Compose configuration
```

## Deployment

### Docker Deployment

The template is designed to run in Docker containers and works seamlessly with reverse proxies like Traefik.

1. Build the image:
```bash
docker build -t backend-template .
```

2. Run with Docker Compose:
```bash
docker compose up -d
```

### Behind Reverse Proxy (Traefik/Cloudflare)

When running behind a reverse proxy:

1. Set `BEHIND_CLOUDFLARE=true` in `.env` to extract real client IPs
2. Configure `COOKIE_SECURE=true` for HTTPS
3. Set `COOKIE_SAMESITE=strict` or `lax` based on your requirements
4. Update `DOMAIN` to your production domain
5. Configure `CORS_ORIGIN` to match your frontend URL

### Environment Variables

Key environment variables to configure:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 3000)
- `SESSION_TTL_SECONDS`: Session lifetime in seconds
- `COOKIE_SECURE`: Enable secure cookies in production
- `BEHIND_CLOUDFLARE`: Extract real IPs from Cloudflare headers
- `AUTH_*_ENABLED`: Enable/disable authentication providers
- OAuth credentials for enabled providers

See `.env.example` for complete configuration options.

## API Documentation

The API automatically generates OpenAPI 3.1 documentation from Zod schemas. Access the interactive documentation at `/v1/docs` when the server is running.

### Key Endpoints

- `POST /v1/auth/register` - Register new user
- `POST /v1/auth/login` - Login with credentials
- `GET /v1/auth/sessions` - List active sessions
- `POST /v1/api-keys` - Create API key
- `GET /v1/api-keys` - List API keys
- `GET /v1/admin/users` - List users (admin only)
- `GET /v1/logs` - Query logs (admin only)

## Authentication

The template supports two authentication methods:

### 1. Session Cookies (Web Applications)
- Cookie-based authentication with HttpOnly, Secure flags
- Sliding session expiration
- Multi-device support

### 2. API Keys (Server-to-Server)
- Bearer token authentication
- Format: `Bearer {username}_{128-character-hex}`
- Passed via `Authorization` header

## Extending the Template

### Adding New Endpoints

1. Create a new module in `src/modules/`
2. Define Zod schemas in `schema.ts`
3. Implement handlers in `handlers/`
4. Register routes in `routes.ts`
5. Register with OpenAPI in `registry.ts`

### Adding Custom Roles

1. Update `UserRole` enum in `prisma/schema.prisma`
2. Run migration: `npm run db:migrate`
3. Update RBAC middleware in `src/core/http/middleware/rbac.ts`

### Adding OAuth Providers

1. Add provider configuration in `.env`
2. Implement OAuth flow in `src/modules/auth/handlers/oauth/`
3. Register routes in `src/modules/auth/routes.ts`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
