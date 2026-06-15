import 'dotenv/config';

export function isSmokeTestEnabled(): boolean {
  return process.env.SMOKE_TEST === 'true';
}

export function hasRealDatabaseUrl(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return (
    url.startsWith('postgresql://') &&
    !url.includes('@localhost') &&
    !url.includes('test:test@')
  );
}

export function hasRealRedisUrl(): boolean {
  const url = process.env.REDIS_URL ?? '';
  return (
    (url.startsWith('redis://') || url.startsWith('rediss://')) &&
    !url.includes('@localhost') &&
    !url.includes('127.0.0.1')
  );
}

export function shouldRunSmokeTests(): boolean {
  return isSmokeTestEnabled() && hasRealDatabaseUrl() && hasRealRedisUrl();
}

export function skipReason(): string {
  if (!isSmokeTestEnabled()) {
    return 'Set SMOKE_TEST=true to run smoke tests';
  }
  if (!hasRealDatabaseUrl()) {
    return 'DATABASE_URL must point to a real PostgreSQL instance';
  }
  if (!hasRealRedisUrl()) {
    return 'REDIS_URL must point to a real Redis instance';
  }
  return '';
}

export function futureScheduleAt(secondsFromNow: number): string {
  const date = new Date(Date.now() + secondsFromNow * 1000);
  const offset = '+07:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${offset}`
  );
}

export async function waitFor(
  predicate: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}
