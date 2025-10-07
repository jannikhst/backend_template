# Module Structure

Standard structure for modules in `src/modules/`.

## Required Files

### 1. `schema.ts`
Zod schemas for validation with OpenAPI metadata:
```typescript
import { z } from '../../core/extensions/zod';

export const CreateItemRequestSchema = z.object({
  name: z.string().min(1).openapi({ description: "Item name" })
}).openapi('CreateItemRequest');

export type CreateItemRequest = z.infer<typeof CreateItemRequestSchema>;
```

### 2. `routes.ts`
Express router with middleware:
```typescript
import { Router } from 'express';
import { validate } from '../../core/http/middleware/validation';
import { requireAuth } from '../../core/http/middleware/auth';
import { createRateLimiter } from '../../core/http/middleware/rateLimit';

const router = Router();
router.post('/',
  createRateLimiter({ windowMs: 60000, max: 10, tag: 'items:create' }),
  requireAuth,
  validate({ body: CreateItemRequestSchema }),
  createItemHandler
);
export default router;
```

### 3. `registry.ts`
OpenAPI registration:
```typescript
import { createRegistry, registerSchemas, registerPath } from '../../core/openapi';

export const itemsOpenApiRegistry = createRegistry();
registerSchemas(itemsOpenApiRegistry, {
  'CreateItemRequest': CreateItemRequestSchema
});
registerPath(itemsOpenApiRegistry, {
  method: 'post',
  path: '/items',
  tags: ['Items'],
  summary: 'Create item',
  response: { schema: CreateItemResponseSchema, status: 201 },
  errors: ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED'],
  rateLimit: 'items:create',
  request: { body: CreateItemRequestSchema }
});
```

### 4. `handlers/` (directory)
One handler per file, re-exported via `index.ts`:
```typescript
// handlers/createItem.ts
export async function createItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body as CreateItemRequest;
    res.status(201).json({ ok: true, item: data });
  } catch (error) {
    next(error);
  }
}

// handlers/index.ts
export * from './createItem';
```

### 5. `index.ts`
Module entry point:
```typescript
export { default as itemsRoutes } from './routes';
export * from './handlers';
export * from './schema';
export * from './service';
export * from './registry';
```

## Optional Files

### `service.ts` or `service/`
Business logic layer. Use single file for simple logic, directory for complex:
```typescript
class ItemService {
  async createItem(data: CreateItemRequest) { /* ... */ }
}
export const itemService = new ItemService();
```

## Registration

Register in `src/index.ts`:
```typescript
app.use('/v1/items', requireAuth, itemsRoutes);
```

Register OpenAPI in `src/modules/docs/generator.ts`:
```typescript
const registries = [authOpenApiRegistry, itemsOpenApiRegistry];
```

## Best Practices

- Keep handlers thin, move logic to services
- One handler per file
- Use `{action}{Entity}Handler` naming
- Validate all inputs with Zod
- Add OpenAPI descriptions
- Apply appropriate rate limits
