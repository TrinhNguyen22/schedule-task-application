import {
  describeRedisTarget,
  normalizeRedisUrl,
  parseRedisUrl,
  toIORedisOptions,
  validateRedisUrlHints,
} from '../../../src/utils/redisConfig';

describe('redisConfig', () => {
  const upstashUrl =
    'redis://default:token123@tight-wolf-110122.upstash.io:6379';

  it('auto-upgrades Upstash redis:// to rediss://', () => {
    const normalized = normalizeRedisUrl(upstashUrl);
    expect(normalized.startsWith('rediss://')).toBe(true);
  });

  it('keeps default username for Upstash AUTH', () => {
    const parsed = parseRedisUrl(upstashUrl);
    expect(parsed.username).toBe('default');
    expect(parsed.password).toBe('token123');
    expect(parsed.useTls).toBe(true);
  });

  it('warns when Upstash URL uses redis:// without TLS', () => {
    const hints = validateRedisUrlHints(upstashUrl);
    expect(hints.some((h: string) => h.includes('rediss://'))).toBe(true);
  });

  it('builds ioredis options with TLS for Upstash', () => {
    const options = toIORedisOptions(upstashUrl);
    expect(options.tls).toEqual({});
    expect(options.username).toBe('default');
    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it('describes redis target without exposing password', () => {
    const description = describeRedisTarget(upstashUrl);
    expect(description).toContain('upstash.io');
    expect(description).not.toContain('token123');
  });
});
