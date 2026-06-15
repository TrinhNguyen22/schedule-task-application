import request from 'supertest';
import { buildTestApp } from '../helpers/testApp';
import * as connection from '../../src/queue/connection';
import { prisma } from '../../src/config/database';

describe('Health API', () => {
  const app = buildTestApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('GET /ready returns 503 when dependencies fail', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));
    jest.spyOn(connection, 'checkRedisHealth').mockResolvedValueOnce(false);

    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
