Session-based authentication with support for multiple authentication methods. Sessions are stored in Redis with configurable TTL and sliding expiration.

### Available Methods

Authentication methods are configurable via environment variables. At least one method must be enabled:

- **Email/Password** (`AUTH_EMAIL_PASSWORD_ENABLED`)
- **Google OAuth** (`AUTH_GOOGLE_ENABLED`)
- **Slack OAuth** (`AUTH_SLACK_ENABLED`)
- **GitHub OAuth** (`AUTH_GITHUB_ENABLED`)

Check available methods: `GET /auth/methods`

### Session Management

#### Session Properties
- **TTL**: 24 hours (configurable via `SESSION_TTL_SECONDS`)
- **Sliding expiration**: extends by 1 hour on activity (configurable via `SESSION_SLIDING_EXTENSION_SECONDS`)
- **Storage**: Redis with automatic cleanup
- **Cookie**: HttpOnly, Secure (in production), SameSite

### Authentication Providers

Users can have multiple authentication providers linked to their account:
- `EMAIL_PASSWORD` - Email/password credentials
- `GOOGLE` - Google OAuth
- `SLACK` - Slack OAuth
- `GITHUB` - GitHub OAuth

List providers: `GET /auth/providers`

### Security Features

- Bcrypt password hashing (cost factor 12)
- CSRF protection via state parameter (OAuth)
- Rate limiting on all auth endpoints
- Session fingerprinting (IP, User-Agent)
- Constant-time comparisons
- Automatic session cleanup

Server validates configuration at startup and fails if no authentication method is enabled.
