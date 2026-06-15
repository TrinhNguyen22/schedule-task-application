import type { Prisma, Schedule, ScheduleStatus, TaskRun } from '@prisma/client';
import { getEnv } from '../config/env';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import { scheduleRepository } from '../repositories/schedule.repository';
import { idempotencyService } from './idempotency.service';
import { queueService } from './queue.service';
import type {
  CreateScheduleInput,
  ListSchedulesQuery,
  PaginatedResult,
  ScheduleResponse,
} from '../types/schedule.types';
import { validateTaskPayload } from '../validators/schedule.validator';

const TERMINAL_STATUSES: ScheduleStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

function toScheduleResponse(schedule: Schedule, runs?: TaskRun[]): ScheduleResponse {
  return {
    id: schedule.id,
    type: schedule.type,
    payload: schedule.payload,
    scheduleAt: schedule.scheduleAt?.toISOString() ?? null,
    cronExpr: schedule.cronExpr,
    timezone: schedule.timezone,
    status: schedule.status,
    maxRetries: schedule.maxRetries,
    timeoutMs: schedule.timeoutMs,
    idempotencyKey: schedule.idempotencyKey,
    source: schedule.source,
    correlationId: schedule.correlationId,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    cancelledAt: schedule.cancelledAt?.toISOString() ?? null,
    ...(runs
      ? {
          runs: runs.map((run) => ({
            id: run.id,
            scheduleId: run.scheduleId,
            status: run.status,
            attempt: run.attempt,
            correlationId: run.correlationId,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt?.toISOString() ?? null,
            durationMs: run.durationMs,
            result: run.result,
            errorCode: run.errorCode,
            errorMessage: run.errorMessage,
          })),
        }
      : {}),
  };
}

export class ScheduleService {
  async create(input: CreateScheduleInput): Promise<ScheduleResponse> {
    const env = getEnv();
    const validatedPayload = validateTaskPayload(input.type, input.payload);

    const schedule = await scheduleRepository.create({
      type: input.type,
      payload: validatedPayload as Prisma.InputJsonValue,
      scheduleAt: input.scheduleAt ? new Date(input.scheduleAt) : null,
      cronExpr: input.cronExpr ?? null,
      timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
      maxRetries: input.maxRetries ?? env.SCHEDULE_DEFAULT_MAX_RETRIES,
      timeoutMs: input.timeoutMs ?? env.SCHEDULE_DEFAULT_TIMEOUT_MS,
      idempotencyKey: input.idempotencyKey ?? null,
      source: input.source ?? 'api',
      correlationId: input.correlationId ?? null,
    });

    const bullJobId = await queueService.enqueueSchedule(schedule);
    const updated = await scheduleRepository.update(schedule.id, {
      status: 'SCHEDULED',
      bullJobId,
    });

    return toScheduleResponse(updated);
  }

  async push(
    input: CreateScheduleInput,
    idempotencyKey: string,
  ): Promise<{ schedule: ScheduleResponse; created: boolean }> {
    const cached = await idempotencyService.findCachedResponse(idempotencyKey);
    if (cached) {
      return { schedule: cached.body, created: false };
    }

    const existing = await idempotencyService.findExistingSchedule(idempotencyKey);
    if (existing) {
      return { schedule: toScheduleResponse(existing), created: false };
    }

    const schedule = await this.create({
      ...input,
      idempotencyKey,
      source: 'push',
    });

    await idempotencyService.saveRecord(idempotencyKey, schedule.id, schedule);
    return { schedule, created: true };
  }

  async list(query: ListSchedulesQuery): Promise<PaginatedResult<ScheduleResponse>> {
    const result = await scheduleRepository.list(query);
    return {
      data: result.data.map((s) => toScheduleResponse(s)),
      meta: result.meta,
    };
  }

  async getById(id: string): Promise<ScheduleResponse> {
    const schedule = await scheduleRepository.findByIdWithRuns(id);
    if (!schedule) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `Schedule ${id} not found`, 404);
    }
    return toScheduleResponse(schedule, schedule.runs);
  }

  async cancel(id: string): Promise<ScheduleResponse> {
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `Schedule ${id} not found`, 404);
    }

    if (schedule.status === 'RUNNING') {
      throw new AppError(
        ERROR_CODES.SCHEDULE_ALREADY_RUNNING,
        'Cannot cancel a schedule that is currently running',
        409,
      );
    }

    if (TERMINAL_STATUSES.includes(schedule.status)) {
      throw new AppError(
        ERROR_CODES.SCHEDULE_ALREADY_TERMINAL,
        `Schedule is already in terminal status: ${schedule.status}`,
        409,
      );
    }

    await queueService.removeScheduleJob(schedule);
    const updated = await scheduleRepository.update(id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });

    return toScheduleResponse(updated);
  }

  async pause(id: string): Promise<ScheduleResponse> {
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `Schedule ${id} not found`, 404);
    }

    if (!schedule.cronExpr) {
      throw new AppError(
        ERROR_CODES.SCHEDULE_NOT_CANCELLABLE,
        'Pause is only supported for cron-based schedules',
        400,
      );
    }

    if (schedule.status === 'RUNNING') {
      throw new AppError(
        ERROR_CODES.SCHEDULE_ALREADY_RUNNING,
        'Cannot pause a schedule that is currently running',
        409,
      );
    }

    if (TERMINAL_STATUSES.includes(schedule.status)) {
      throw new AppError(
        ERROR_CODES.SCHEDULE_ALREADY_TERMINAL,
        `Schedule is already in terminal status: ${schedule.status}`,
        409,
      );
    }

    await queueService.removeScheduleJob(schedule);
    const updated = await scheduleRepository.update(id, { status: 'PAUSED' });
    return toScheduleResponse(updated);
  }

  async resume(id: string): Promise<ScheduleResponse> {
    const schedule = await scheduleRepository.findById(id);
    if (!schedule) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `Schedule ${id} not found`, 404);
    }

    if (schedule.status !== 'PAUSED') {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Only paused schedules can be resumed',
        409,
      );
    }

    const bullJobId = await queueService.enqueueSchedule(schedule);
    const updated = await scheduleRepository.update(id, {
      status: 'SCHEDULED',
      bullJobId,
    });

    return toScheduleResponse(updated);
  }
}

export const scheduleService = new ScheduleService();

export { toScheduleResponse };
