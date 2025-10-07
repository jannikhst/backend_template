OAuth 2.0 authentication for Google, Slack, and GitHub. Each provider can be independently enabled via environment variables.

### Supported Providers

- **Google** - Google Workspace and Gmail accounts
- **Slack** - Slack workspace members
- **GitHub** - GitHub users

### OAuth Flow

#### 1. Initiate
`GET /auth/{provider}` (e.g., `/auth/google`)
- Generates authorization URL with state parameter (CSRF protection)
- State stored temporarily in Redis
- Redirects to provider's authorization page

#### 2. User Authorization
User authenticates with provider and grants permissions.

#### 3. Callback
`GET /auth/{provider}/callback`
- Validates state parameter
- Exchanges authorization code for access token
- Fetches user profile from provider
- Creates or updates user account
- Links provider to user account
- Creates session
- Redirects to frontend

### Configuration

Each provider requires three environment variables:

```env
# Google OAuth
AUTH_GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Slack OAuth
AUTH_SLACK_ENABLED=true
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback

# GitHub OAuth
AUTH_GITHUB_ENABLED=true
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
```

### Account Linking

Users can link multiple OAuth providers to a single account:
- First OAuth login creates new account
- Subsequent logins with same email link provider
- View linked providers: `GET /auth/providers`

### Error Handling

Common OAuth errors:
- `access_denied` - User denied authorization
- `invalid_grant` - Authorization code expired or invalid
- `invalid_state` - CSRF validation failed
- Network errors during token exchange

All errors redirect to frontend with error parameters.