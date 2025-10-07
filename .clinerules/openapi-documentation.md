# OpenAPI Documentation

Auto-generated OpenAPI 3.1 specification from Zod schemas.

## Core Utilities

Located in `src/core/openapi/`:

### `createRegistry()`
Creates new OpenAPI registry with common schemas:
```typescript
import { createRegistry } from '../../core/openapi';
export const myModuleRegistry = createRegistry();
```

### `registerSchemas()`
Register multiple schemas at once:
```typescript
import { registerSchemas } from '../../core/openapi';

registerSchemas(myModuleRegistry, {
  'CreateItemRequest': CreateItemRequestSchema,
  'CreateItemResponse': CreateItemResponseSchema
});
```

### `registerPath()`
Register endpoint with automatic error handling:
```typescript
import { registerPath } from '../../core/openapi';

registerPath(myModuleRegistry, {
  method: 'post',
  path: '/items',
  tags: ['Items'],
  summary: 'Create item',
  response: { 
    schema: CreateItemResponseSchema, 
    status: 201  // Optional, defaults: 201 for POST, 200 for others
  },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED'],
  rateLimit: 'items:create',  // Auto-adds RATE_LIMIT_EXCEEDED error
  security: 'authenticated',  // Options: 'public', 'authenticated', 'sessionOnly', 'apiKeyOnly'
  requiredRoles: ['ADMIN'],   // Optional, adds role requirement to description
  request: {
    body: CreateItemRequestSchema,
    params: ItemParamsSchema,    // Optional
    query: ItemQuerySchema       // Optional
  }
});
```

## Error Codes

All error codes defined in `src/core/openapi/definitions.ts` under `ERROR_CODES`.

### Adding New Error Codes

Add to `ERROR_CODES` object:
```typescript
export const ERROR_CODES = {
  MY_NEW_ERROR: {
    status: 400,
    message: 'User-facing error message',
    description: 'OpenAPI documentation description'
  },
  // ...
} as const;
```

### Common Error Codes

**4xx Client Errors:**
- `VALIDATION_ERROR` (400) - Invalid input
- `AUTHENTICATION_REQUIRED` (401) - Not authenticated
- `INVALID_CREDENTIALS` (401) - Wrong credentials
- `INSUFFICIENT_PERMISSIONS` (403) - Missing permissions
- `USER_INACTIVE` (403) - Account disabled
- `RESOURCE_NOT_FOUND` (404) - Not found
- `DUPLICATE_ENTRY` (409) - Already exists
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests

**5xx Server Errors:**
- `INTERNAL_ERROR` (500) - Generic server error
- `DATABASE_ERROR` (500) - Database issue
- `SERVICE_UNAVAILABLE` (503) - Service down

## Security Types

- `public` - No authentication required
- `authenticated` - Session cookie OR API key
- `sessionOnly` - Only session cookie
- `apiKeyOnly` - Only API key

## Rate Limiting

Reference rate limiter tag in `rateLimit` field:
```typescript
registerPath(registry, {
  // ...
  rateLimit: 'items:create',  // Must match tag in createRateLimiter()
});
```

Automatically:
- Adds rate limit info to endpoint description
- Includes `RATE_LIMIT_EXCEEDED` error response

## Tag Descriptions

Add detailed descriptions for OpenAPI tags by creating Markdown files in `docs/`:

1. Create file named after the tag: `docs/{TagName}.md`
2. Write Markdown content describing the tag
3. File is automatically loaded into OpenAPI spec

**Example:**
```markdown
<!-- docs/Items.md -->
# Items API

Manage items in the system. Items can be created, updated, and deleted.

## Features
- Create new items
- List all items
- Update existing items
```

The content will appear as the tag description in the OpenAPI documentation.

## Module Registration

Register module's OpenAPI registry in `src/modules/docs/generator.ts`:
```typescript
import { myModuleRegistry } from '../my-module/registry';

const registries = [
  authOpenApiRegistry,
  myModuleRegistry,
  // ...
];
```

## Best Practices

- Always use predefined error codes from `ERROR_CODES`
- Add new error codes to `definitions.ts` when needed
- Use descriptive summaries and descriptions
- Specify rate limits for all endpoints
- Set appropriate security requirements
- Include examples in Zod schemas with `.openapi()`
