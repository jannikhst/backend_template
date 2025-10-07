### Backend API Template

A production-ready Express.js backend with TypeScript, featuring authentication, API keys, and comprehensive OpenAPI documentation.

#### Features

- **Authentication**: Session-based (cookies) and API key authentication
- **Security**: Helmet, CORS, HPP, rate limiting
- **Database**: PostgreSQL with Prisma ORM
- **Session Store**: Redis for scalable session management
- **Documentation**: Auto-generated OpenAPI 3.1 spec with ReDoc UI
- **Logging**: Structured logging with request tracing
- **Docker**: Production-ready containerization

#### Configuration

- **Environment**: {{NODE_ENV}}
- **Port**: {{PORT}}
- **CORS Origin**: {{CORS_ORIGIN}}
- **Session Cookie**: {{SESSION_COOKIE_NAME}}
- **Session TTL**: {{SESSION_TTL_FORMATTED}} ({{SESSION_TTL_SECONDS}}s)
- **Cookie Secure**: {{COOKIE_SECURE}}
- **Cookie SameSite**: {{COOKIE_SAMESITE}}

#### Authentication

This API supports two authentication methods:

1. **Session Cookies**: For web applications
   - Cookie name: `{{SESSION_COOKIE_NAME}}`
   - HttpOnly, Secure (in production)
   - Sliding expiration

2. **API Keys**: For server-to-server communication
   - Format: `Bearer {username}_{128-hex}`
   - Passed via `Authorization` header

#### User Roles

{{ROLE_DESCRIPTIONS}}

#### Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits vary by endpoint and authentication status.
