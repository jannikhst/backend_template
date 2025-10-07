API keys offer an alternative to session-based authentication, useful for server-to-server calls, scripts, and integrations. They behave identically to sessions in terms of permissions and RBAC.

#### Format
`{username}_{128-hex}`  
- **username**: lowercase letters only, max 12 chars  
- **128-hex**: from `crypto.randomBytes(64)`

Example:  
`john_a1b2c3d4e5f67890...` (128 hex chars)

#### Security
- Only SHA-256 hashes stored in DB, plaintext shown **once** on creation  
- Constant-time hash comparison to prevent timing attacks  
- Regex validation before DB lookup: `^([a-z]{1,12}_)?[0-9a-f]{128}$`  
- Optional expiration dates  
- API key creation rate-limited  

API keys inherit the roles of the owning user — no separate permissions.

Best Practices
	•	Store securely, never commit to version control
	•	Set expiresAt for temporary access