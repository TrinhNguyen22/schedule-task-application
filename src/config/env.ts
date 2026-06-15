import { z } from 'zod';
import { normalizeRedisUrl } from '../utils/redisConfig';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Ho_Chi_Minh'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z
    .string()
    .min(1)
    .transform((value) => normalizeRedisUrl(value)),
  SCHEDULE_DEFAULT_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  SCHEDULE_DEFAULT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  FILE_TASK_BASE_PATH: z.string().default('./data'),
  EMAIL_MODE: z.enum(['mock', 'smtp']).default('mock'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@internal.local'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new Error(`Invalid environment configuration: ${details}`);
    }
    cachedEnv = parsed.data;
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}
