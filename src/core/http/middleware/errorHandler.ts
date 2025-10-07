import { Request, Response, NextFunction } from 'express';
import { z } from '../../extensions/zod';
import { logger } from '../../logging';
import { ErrorResponse, ERROR_CODES, ErrorCode } from '../../openapi/definitions';

// Re-export ErrorResponse type for convenience
export type ApiError = ErrorResponse;

// Prisma error interface for type safety
interface PrismaError extends Error {
  code: string;
  meta?: {
    target?: string[];
    cause?: string;
  };
}

// Custom error class for application errors
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Helper function to send error responses with automatic logging
interface SendErrorOptions {
  req: Request;
  res: Response;
  errorCode: ErrorCode;
  logMessage?: string;
  context?: Record<string, unknown>;
  details?: Array<{ path: string; message: string }>;
}

export function sendErrorResponse(options: SendErrorOptions): void {
  const {
    req,
    res,
    errorCode,
    logMessage,
    context = {},
    details,
  } = options;

  // Get error definition from ERROR_CODES
  const error = ERROR_CODES[errorCode];
  const traceId = res.locals.traceId || 'unknown';
  const logLevel = error.status >= 500 ? 'error' : 'warn';

  // Logging with additional context
  const logContext = {
    traceId,
    path: req.path,
    method: req.method,
    status: error.status,
    code: errorCode,
    ...context,
  };

  logger[logLevel](logMessage || error.message, logContext);

  // Response
  const payload: ApiError = {
    status: error.status,
    code: errorCode,
    message: error.message,
    traceId,
    ...(details && { details }),
  };

  res.status(error.status).json(payload);
}

// Type guard for Prisma errors
function isPrismaError(err: unknown): err is PrismaError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as any).code === 'string' &&
    (err as any).code.startsWith('P')
  );
}

// Central error handler middleware
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    const validationErrors = err.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    return sendErrorResponse({
      req,
      res,
      errorCode: 'VALIDATION_ERROR',
      details: validationErrors,
      logMessage: 'Validation error',
      context: { errors: validationErrors },
    });
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return sendErrorResponse({
      req,
      res,
      errorCode: err.code as ErrorCode,
      logMessage: 'Application error',
      context: {
        originalStatus: err.status,
        originalCode: err.code,
      },
    });
  }

  // Handle Prisma errors
  if (isPrismaError(err)) {
    const prismaError = err as PrismaError;

    switch (prismaError.code) {
      case 'P2002':
        // Unique constraint violation
        return sendErrorResponse({
          req,
          res,
          errorCode: 'DUPLICATE_ENTRY',
          logMessage: 'Prisma duplicate entry error',
          context: {
            prismaCode: prismaError.code,
            target: prismaError.meta?.target,
          },
        });

      case 'P2003':
        // Foreign key constraint violation
        return sendErrorResponse({
          req,
          res,
          errorCode: 'FOREIGN_KEY_CONSTRAINT',
          logMessage: 'Prisma foreign key constraint error',
          context: {
            prismaCode: prismaError.code,
            target: prismaError.meta?.target,
          },
        });

      case 'P2014':
        // Required relation violation
        return sendErrorResponse({
          req,
          res,
          errorCode: 'INVALID_RELATION',
          logMessage: 'Prisma required relation violation',
          context: {
            prismaCode: prismaError.code,
          },
        });

      case 'P2021':
        // Table does not exist
        return sendErrorResponse({
          req,
          res,
          errorCode: 'DATABASE_ERROR',
          logMessage: 'Prisma table not found error',
          context: {
            prismaCode: prismaError.code,
          },
        });

      case 'P2022':
        // Column does not exist
        return sendErrorResponse({
          req,
          res,
          errorCode: 'DATABASE_ERROR',
          logMessage: 'Prisma column not found error',
          context: {
            prismaCode: prismaError.code,
          },
        });

      case 'P2025':
        // Record not found
        return sendErrorResponse({
          req,
          res,
          errorCode: 'RECORD_NOT_FOUND',
          logMessage: 'Prisma record not found error',
          context: {
            prismaCode: prismaError.code,
          },
        });

      default:
        // Generic Prisma error
        return sendErrorResponse({
          req,
          res,
          errorCode: 'DATABASE_ERROR',
          logMessage: 'Prisma error',
          context: {
            prismaCode: prismaError.code,
            error: prismaError.message,
          },
        });
    }
  }

  // Handle Redis connection errors
  if (err instanceof Error && err.message.includes('Redis')) {
    return sendErrorResponse({
      req,
      res,
      errorCode: 'SERVICE_UNAVAILABLE',
      logMessage: 'Redis connection error',
      context: {
        error: err.message,
        stack: err.stack,
      },
    });
  }

  // Handle unexpected errors
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';

  return sendErrorResponse({
    req,
    res,
    errorCode: 'INTERNAL_ERROR',
    logMessage: 'Unhandled error',
    context: {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    },
  });
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  sendErrorResponse({
    req,
    res,
    errorCode: 'ROUTE_NOT_FOUND',
    logMessage: 'Route not found',
  });
}
