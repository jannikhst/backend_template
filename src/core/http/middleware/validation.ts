import { Request, Response, NextFunction } from 'express';
import { z } from '../../extensions/zod';
import { sendErrorResponse } from './errorHandler';

// Validation schemas interface
interface ValidationSchemas {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
}

// Validation middleware factory
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate URL parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }

      // Validate query parameters
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        // Replace the query object properties instead of reassigning the whole object
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, parsedQuery);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));

        return sendErrorResponse({
          req,
          res,
          errorCode: 'VALIDATION_ERROR',
          details: validationErrors,
          logMessage: 'Request validation failed',
          context: { errors: validationErrors },
        });
      }

      // Unexpected validation error
      return sendErrorResponse({
        req,
        res,
        errorCode: 'INTERNAL_ERROR',
        logMessage: 'Unexpected validation error',
        context: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  };
}
