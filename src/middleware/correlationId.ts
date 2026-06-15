import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_HEADER } from '../config/constants';
import { requestContext } from '../utils/context';

export interface RequestWithCorrelation extends Request {
  correlationId: string;
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers[CORRELATION_HEADER];
  const correlationId =
    typeof header === 'string' && header.length > 0 ? header : randomUUID();

  (req as RequestWithCorrelation).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  requestContext.run({ correlationId }, () => {
    next();
  });
}
