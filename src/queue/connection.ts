import type { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';
import { toIORedisOptions } from '../utils/redisConfig';

let connection: IORedis | null = null;

export function getRedisConnectionOptions(): ConnectionOptions {
  const env = getEnv();
  return toIORedisOptions(env.REDIS_URL) as ConnectionOptions;
}

export function getRedisConnection(): IORedis {
  if (!connection) {
    const env = getEnv();
    connection = new IORedis(toIORedisOptions(env.REDIS_URL));
  }
  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
