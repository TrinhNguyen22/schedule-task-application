import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import {
  describeRedisTarget,
  normalizeRedisUrl,
  toIORedisOptions,
  validateRedisUrlHints,
} from '../src/utils/redisConfig';

async function waitForRedisReady(redis: IORedis, timeoutMs: number): Promise<void> {
  if (redis.status === 'ready') return;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Redis connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onReady = (): void => {
      cleanup();
      resolve();
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const cleanup = (): void => {
      clearTimeout(timer);
      redis.off('ready', onReady);
      redis.off('error', onError);
    };

    redis.once('ready', onReady);
    redis.once('error', onError);
  });
}

async function verifyPostgres(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✔ PostgreSQL connected');
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyRedis(redisUrl: string): Promise<void> {
  const hints = validateRedisUrlHints(redisUrl);
  if (hints.length > 0) {
    console.warn('⚠ Redis URL hints:');
    hints.forEach((hint) => console.warn(`  - ${hint}`));
  }

  const normalizedUrl = normalizeRedisUrl(redisUrl);
  if (normalizedUrl !== redisUrl.trim()) {
    console.warn('⚠ Auto-corrected REDIS_URL protocol to rediss:// for Upstash');
  }

  console.log(`  Target: ${describeRedisTarget(normalizedUrl)}`);

  const redis = new IORedis(toIORedisOptions(normalizedUrl));

  try {
    await waitForRedisReady(redis, 15000);
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`Unexpected PING response: ${pong}`);
    console.log('✔ Redis connected (PONG)');
  } finally {
    await redis.quit();
  }
}

async function verifyPrismaTables(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.schedule.count();
    await prisma.taskRun.count();
    await prisma.idempotencyRecord.count();
    console.log('✔ Prisma tables exist (Schedule, TaskRun, IdempotencyRecord)');
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (!databaseUrl) {
    console.error('✘ DATABASE_URL is missing. Copy .env.example to .env first.');
    process.exit(1);
  }

  if (!redisUrl) {
    console.error('✘ REDIS_URL is missing. Copy .env.example to .env first.');
    process.exit(1);
  }

  console.log('Verifying Neon + Upstash setup...\n');

  try {
    await verifyPostgres(databaseUrl);
    await verifyRedis(redisUrl);
    await verifyPrismaTables(databaseUrl);
    console.log('\nSetup verification PASSED');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n✘ Setup verification FAILED: ${message}`);

    const hints = validateRedisUrlHints(redisUrl);
    if (hints.length > 0) {
      console.error('\nLikely fixes:');
      hints.forEach((hint) => console.error(`  - ${hint}`));
    }

    console.error('\nSee docs/setup-neon-upstash.md for troubleshooting.');
    process.exit(1);
  }
}

void main();
