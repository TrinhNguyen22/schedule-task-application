import type { Worker } from 'bullmq';
import request from 'supertest';
import { prisma } from '../../src/config/database';
import { createApp } from '../../src/app';
import { closeQueues } from '../../src/queue/queues';
import { closeRedisConnection } from '../../src/queue/connection';
import { disconnectPrisma } from '../../src/config/database';
import {
  futureScheduleAt,
  shouldRunSmokeTests,
  skipReason,
  waitFor,
} from '../helpers/smokeEnv';

const describeSmoke = shouldRunSmokeTests() ? describe : describe.skip;

describeSmoke('Smoke E2E (Neon + Upstash)', () => {
  let worker: Worker | null = null;
  const app = createApp();
  const createdScheduleIds: string[] = [];

  beforeAll(async () => {
    if (!shouldRunSmokeTests()) return;

    const { Worker: BullWorker } = await import('bullmq');
    const { getRedisConnectionOptions } = await import('../../src/queue/connection');
    const { SCHEDULE_QUEUE_NAME } = await import('../../src/queue/queues');
    const { processScheduleJob } = await import(
      '../../src/queue/processors/schedule.processor'
    );

    worker = new BullWorker(SCHEDULE_QUEUE_NAME, processScheduleJob, {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
    });

    await worker.waitUntilReady();
  }, 30000);

  afterAll(async () => {
    if (createdScheduleIds.length > 0) {
      await prisma.taskRun.deleteMany({
        where: { scheduleId: { in: createdScheduleIds } },
      });
      await prisma.idempotencyRecord.deleteMany({
        where: { scheduleId: { in: createdScheduleIds } },
      });
      await prisma.schedule.deleteMany({
        where: { id: { in: createdScheduleIds } },
      });
    }

    if (worker) await worker.close();
    await closeQueues();
    await closeRedisConnection();
    await disconnectPrisma();
  }, 30000);

  it('GET /ready confirms Neon and Upstash connectivity', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.data.database).toBe(true);
    expect(res.body.data.redis).toBe(true);
  });

  it('creates FILE_READ task and completes within 15 seconds', async () => {
    const scheduleAt = futureScheduleAt(3);

    const createRes = await request(app)
      .post('/api/schedules')
      .set('x-correlation-id', 'smoke-file-read')
      .send({
        type: 'FILE_READ',
        scheduleAt,
        payload: { path: 'sample.txt' },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('SCHEDULED');

    const scheduleId = createRes.body.data.id as string;
    createdScheduleIds.push(scheduleId);

    await waitFor(async () => {
      const detailRes = await request(app).get(`/api/schedules/${scheduleId}`);
      return detailRes.body.data.status === 'COMPLETED';
    });

    const detailRes = await request(app).get(`/api/schedules/${scheduleId}`);
    expect(detailRes.body.data.status).toBe('COMPLETED');
    expect(detailRes.body.data.runs[0].status).toBe('SUCCESS');
    expect(detailRes.body.data.runs[0].result.preview).toContain(
      'Schedule Task Application',
    );
  }, 20000);

  it('push endpoint is idempotent with the same key', async () => {
    const key = `smoke-idem-${Date.now()}`;
    const body = {
      type: 'FORM_FILL',
      scheduleAt: futureScheduleAt(60),
      payload: {
        template: { msg: 'Hello {{name}}' },
        data: { name: 'Smoke' },
      },
    };

    const first = await request(app)
      .post('/api/schedules/push')
      .set('idempotency-key', key)
      .send(body);

    const second = await request(app)
      .post('/api/schedules/push')
      .set('idempotency-key', key)
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);

    createdScheduleIds.push(first.body.data.id as string);
  });

  it('cancels a pending scheduled task', async () => {
    const createRes = await request(app)
      .post('/api/schedules')
      .send({
        type: 'EMAIL',
        scheduleAt: futureScheduleAt(120),
        payload: {
          to: ['ops@internal.local'],
          subject: 'Cancel me',
          body: 'This should be cancelled',
        },
      });

    expect(createRes.status).toBe(201);
    const scheduleId = createRes.body.data.id as string;
    createdScheduleIds.push(scheduleId);

    const cancelRes = await request(app).patch(`/api/schedules/${scheduleId}/cancel`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});

if (!shouldRunSmokeTests()) {
  // eslint-disable-next-line no-console
  console.info(`Smoke tests skipped: ${skipReason()}`);
}
