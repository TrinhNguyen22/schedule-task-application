import pino from 'pino';
import { getCorrelationId } from './context';

const isTest = process.env.NODE_ENV === 'test';

export const baseLogger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL ?? 'info',
  base: { service: 'schedule-task-app' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function getLogger(bindings?: Record<string, unknown>): pino.Logger {
  const correlationId = getCorrelationId();
  return baseLogger.child({
    ...(correlationId ? { correlationId } : {}),
    ...bindings,
  });
}
