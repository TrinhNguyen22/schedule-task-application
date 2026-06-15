import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import { getLogger } from '../utils/logger';
import type { RequestWithCorrelation } from './correlationId';

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const correlationId = (req as RequestWithCorrelation).correlationId;
  const log = getLogger({ correlationId });

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    log.warn({ details }, 'Validation error');
    res.status(400).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: { issues: details },
      },
    });
    return;
  }

  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      log.error({ err: error, code: error.code }, error.message);
    } else {
      log.warn({ code: error.code }, error.message);
    }
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  log.error({ err: error }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: 'Route not found',
    },
  });
}
