import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.TZ = 'Asia/Ho_Chi_Minh';
process.env.EMAIL_MODE = 'mock';
process.env.FILE_TASK_BASE_PATH = './data';

const isSmokeRun = process.env.SMOKE_TEST === 'true';

// Chỉ dùng URL giả cho unit/integration test.
// Smoke test cần DATABASE_URL + REDIS_URL thật từ .env
if (!isSmokeRun) {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
}
