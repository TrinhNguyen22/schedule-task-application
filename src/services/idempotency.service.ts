import type { Prisma } from '@prisma/client';
import type { Schedule } from '@prisma/client';
import { getEnv } from '../config/env';
import { idempotencyRepository } from '../repositories/idempotency.repository';
import { scheduleRepository } from '../repositories/schedule.repository';
import type { ScheduleResponse } from '../types/schedule.types';

export class IdempotencyService {
  async findCachedResponse(
    key: string,
  ): Promise<{ statusCode: number; body: ScheduleResponse } | null> {
    const record = await idempotencyRepository.findValid(key);
    if (!record) return null;

    const body = record.responseBody as unknown as ScheduleResponse;
    return { statusCode: 201, body };
  }

  async findExistingSchedule(key: string): Promise<Schedule | null> {
    return scheduleRepository.findByIdempotencyKey(key);
  }

  async saveRecord(
    key: string,
    scheduleId: string,
    response: ScheduleResponse,
  ): Promise<void> {
    const env = getEnv();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + env.IDEMPOTENCY_TTL_HOURS);

    await idempotencyRepository.create({
      idempotencyKey: key,
      scheduleId,
      responseBody: response as unknown as Prisma.InputJsonValue,
      expiresAt,
    });
  }
}

export const idempotencyService = new IdempotencyService();
