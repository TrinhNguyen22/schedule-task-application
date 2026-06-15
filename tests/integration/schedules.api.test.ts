import request from 'supertest';
import { buildTestApp } from '../helpers/testApp';
import { scheduleService } from '../../src/services/schedule.service';
import { TaskType } from '@prisma/client';

jest.mock('../../src/services/schedule.service');

const mockedService = scheduleService as jest.Mocked<typeof scheduleService>;

describe('Schedules API', () => {
  const app = buildTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/schedules validates request body', async () => {
    const res = await request(app).post('/api/schedules').send({
      type: TaskType.EMAIL,
      payload: { to: ['bad'], subject: '', body: '' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/schedules creates schedule', async () => {
    mockedService.create.mockResolvedValueOnce({
      id: '11111111-1111-1111-1111-111111111111',
      type: TaskType.EMAIL,
      payload: {},
      scheduleAt: '2026-06-14T08:00:00+07:00',
      cronExpr: null,
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'SCHEDULED',
      maxRetries: 3,
      timeoutMs: 30000,
      idempotencyKey: null,
      source: 'api',
      correlationId: 'corr-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancelledAt: null,
    });

    const res = await request(app)
      .post('/api/schedules')
      .set('x-correlation-id', 'corr-1')
      .send({
        type: TaskType.EMAIL,
        payload: {
          to: ['ops@internal.local'],
          subject: 'Daily report',
          body: 'Report body',
        },
        scheduleAt: '2026-06-14T08:00:00+07:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(mockedService.create).toHaveBeenCalled();
  });

  it('POST /api/schedules/push requires idempotency-key', async () => {
    const res = await request(app).post('/api/schedules/push').send({
      type: TaskType.EMAIL,
      payload: {
        to: ['ops@internal.local'],
        subject: 'Hi',
        body: 'Test',
      },
      scheduleAt: '2026-06-14T09:00:00+07:00',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});
