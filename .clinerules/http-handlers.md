# HTTP Handlers

Best practices for writing HTTP handlers in this backend template.

## Error Handling

### Using `sendErrorResponse()`
When you have access to `req` and `res` objects:
```typescript
import { sendErrorResponse } from '../../core/http/middleware/errorHandler';

export async function myHandler(req: Request, res: Response, next: NextFunction) {
  if (!someCondition) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'VALIDATION_ERROR',
      logMessage: 'Custom log message',
      context: { additionalInfo: 'value' },
      details: [{ path: 'field', message: 'Error message' }]
    });
  }
}
```

### Using `AppError`
Throw errors that will be caught by error handler:
```typescript
import { AppError } from '../../core/http/middleware/errorHandler';

export async function myHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!someCondition) {
      throw new AppError('Error message', 400, 'VALIDATION_ERROR');
    }
    // ... handler logic
  } catch (error) {
    next(error);  // Pass to error handler
  }
}
```

### Using `next(error)`
Pass any error to the global error handler:
```typescript
export async function myHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // ... handler logic
  } catch (error) {
    next(error);  // Automatically handled
  }
}
```

## Validation

**Always validate inputs** using Zod schemas in routes:
```typescript
router.post('/',
  validate({ 
    body: CreateItemRequestSchema,
    params: ItemParamsSchema,
    query: ItemQuerySchema
  }),
  createItemHandler
);
```

Access validated data with type safety:
```typescript
export async function createItemHandler(req: Request, res: Response, next: NextFunction) {
  const data = req.body as CreateItemRequest;  // Already validated
  // ... use data
}
```

## Getting Client IP

**Never use `req.ip` directly.** Always use `getRealClientIp()`:
```typescript
import { getRealClientIp } from '../../core/http/middleware/cloudflare';

export async function myHandler(req: Request, res: Response, next: NextFunction) {
  const clientIp = getRealClientIp(req);  // Cloudflare-compatible
  // ... use clientIp
}
```

This function:
- Returns Cloudflare's `cf-connecting-ip` when behind Cloudflare
- Falls back to Express `req.ip` otherwise
- Works correctly with `BEHIND_CLOUDFLARE` config

## Getting Client Country

```typescript
import { getClientCountry } from '../../core/http/middleware/cloudflare';

export async function myHandler(req: Request, res: Response, next: NextFunction) {
  const country = getClientCountry(req);  // Returns ISO country code or undefined
}
```

## Handler Structure

Standard handler pattern:
```typescript
import { Request, Response, NextFunction } from 'express';
import { MyRequestSchema } from '../schema';

export async function myHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Get validated data
    const data = req.body as MyRequest;
    
    // 2. Get user from auth middleware
    const userId = req.user?.id;
    
    // 3. Business logic (preferably in service)
    const result = await myService.doSomething(data);
    
    // 4. Send response
    res.status(200).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
}
```

## Best Practices

1. **Always wrap in try-catch** and call `next(error)`
2. **Use type assertions** for validated data: `req.body as MyRequest`
3. **Keep handlers thin** - move logic to services
4. **Use `sendErrorResponse()`** for explicit error responses
5. **Use `getRealClientIp()`** instead of `req.ip`
6. **Validate all inputs** with Zod schemas in routes
7. **Use proper HTTP status codes** (200, 201, 204, 400, 401, 403, 404)
8. **Access user from `req.user`** (set by auth middleware)
9. **Access trace ID from `res.locals.traceId`** for logging
