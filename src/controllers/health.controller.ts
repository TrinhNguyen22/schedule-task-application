import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import { checkRedisHealth } from '../queue/connection';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
  });
}

export async function readinessCheck(_req: Request, res: Response): Promise<void> {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  redisOk = await checkRedisHealth();

  if (!dbOk || !redisOk) {
    throw new AppError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'Service is not ready',
      503,
      true,
      { database: dbOk, redis: redisOk },
    );
  }

  res.status(200).json({
    data: {
      status: 'ready',
      database: dbOk,
      redis: redisOk,
      timestamp: new Date().toISOString(),
    },
  });
}
