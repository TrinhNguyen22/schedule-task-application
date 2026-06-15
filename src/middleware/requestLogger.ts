import type { NextFunction, Request, Response } from 'express';
import { getLogger } from '../utils/logger';
import type { RequestWithCorrelation } from './correlationId';

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  const correlationId = (req as RequestWithCorrelation).correlationId;
  const log = getLogger({ correlationId });

  log.info(
    { method: req.method, path: req.path, query: req.query },
    'Incoming request',
  );

  res.on('finish', () => {
    log.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'Request completed',
    );
  });

  next();
}
