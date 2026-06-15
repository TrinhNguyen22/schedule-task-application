import type { RedisOptions } from 'ioredis';

export interface ParsedRedisUrl {
  host: string;
  port: number;
  username?: string;
  password?: string;
  useTls: boolean;
  isUpstash: boolean;
}

export function normalizeRedisUrl(redisUrl: string): string {
  const trimmed = redisUrl.trim();

  try {
    const url = new URL(trimmed);
    const isUpstash = url.hostname.endsWith('.upstash.io');

    if (isUpstash && url.protocol === 'redis:') {
      url.protocol = 'rediss:';
      return url.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function parseRedisUrl(redisUrl: string): ParsedRedisUrl {
  const normalized = normalizeRedisUrl(redisUrl);
  const url = new URL(normalized);

  const username = url.username
    ? decodeURIComponent(url.username)
    : undefined;
  const password = url.password
    ? decodeURIComponent(url.password)
    : undefined;

  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username,
    password,
    useTls: url.protocol === 'rediss:',
    isUpstash: url.hostname.endsWith('.upstash.io'),
  };
}

export function toIORedisOptions(redisUrl: string): RedisOptions {
  const parsed = parseRedisUrl(redisUrl);

  return {
    host: parsed.host,
    port: parsed.port,
    username: parsed.username,
    password: parsed.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 15000,
    ...(parsed.useTls ? { tls: {} } : {}),
  };
}

export function describeRedisTarget(redisUrl: string): string {
  const parsed = parseRedisUrl(redisUrl);
  const tls = parsed.useTls ? 'TLS on' : 'TLS off';
  return `${parsed.host}:${parsed.port} (${tls}, upstash=${parsed.isUpstash})`;
}

export function validateRedisUrlHints(redisUrl: string): string[] {
  const hints: string[] = [];

  try {
    const raw = new URL(redisUrl.trim());
    const isUpstash = raw.hostname.endsWith('.upstash.io');

    if (isUpstash && raw.protocol === 'redis:') {
      hints.push(
        'Upstash requires TLS: change redis:// to rediss:// in REDIS_URL',
      );
    }

    if (isUpstash && !raw.password) {
      hints.push('REDIS_URL is missing password/token for Upstash');
    }

    if (isUpstash && raw.username && raw.username !== 'default') {
      hints.push('Upstash Redis URL usually uses username "default"');
    }
  } catch {
    hints.push('REDIS_URL is not a valid URL');
  }

  return hints;
}
