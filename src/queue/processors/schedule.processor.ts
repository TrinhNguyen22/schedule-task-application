import type { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { isAppError } from '../../errors/AppError';
import { ERROR_CODES } from '../../errors/errorCodes';
import { scheduleRepository } from '../../repositories/schedule.repository';
import { taskRunRepository } from '../../repositories/taskRun.repository';
import type { ScheduleJobData } from '../../types/schedule.types';
import { getTaskHandler } from '../../tasks/registry';
import { getLogger } from '../../utils/logger';
import { withTimeout } from '../../utils/withTimeout';

const SKIPPABLE_STATUSES = new Set(['CANCELLED', 'PAUSED']);

export async function processScheduleJob(job: Job<ScheduleJobData>): Promise<void> {
  const { scheduleId, correlationId } = job.data;
  const log = getLogger({
    correlationId,
    scheduleId,
    bullJobId: job.id,
    attempt: job.attemptsMade + 1,
  });

  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule) {
    log.warn('Schedule not found, skipping job');
    return;
  }

  if (SKIPPABLE_STATUSES.has(schedule.status)) {
    log.info({ status: schedule.status }, 'Schedule skipped');
    return;
  }

  const attempt = job.attemptsMade + 1;
  const existingRun = await taskRunRepository.findByScheduleAndAttempt(
    scheduleId,
    attempt,
  );
  if (existingRun?.status === 'SUCCESS') {
    log.info('Run already succeeded, skipping duplicate');
    return;
  }

  await scheduleRepository.updateStatus(scheduleId, 'RUNNING');
  const startedAt = Date.now();

  const taskRun = await taskRunRepository.create({
    scheduleId,
    attempt,
    correlationId,
    bullJobId: job.id ?? null,
  });

  try {
    const handler = getTaskHandler(schedule.type);
    const result = await withTimeout(
      () => handler.execute(schedule.payload as Record<string, unknown>),
      schedule.timeoutMs,
      `Task ${schedule.type}`,
    );

    const durationMs = Date.now() - startedAt;
    await taskRunRepository.complete(
      taskRun.id,
      result as Prisma.InputJsonValue,
      durationMs,
    );

    if (schedule.cronExpr) {
      await scheduleRepository.updateStatus(scheduleId, 'SCHEDULED');
    } else {
      await scheduleRepository.updateStatus(scheduleId, 'COMPLETED');
    }

    log.info({ durationMs, type: schedule.type }, 'Task completed successfully');
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const appErr = isAppError(error) ? error : null;
    const isTimeout = appErr?.code === ERROR_CODES.TASK_TIMEOUT;
    const errorCode = appErr?.code ?? ERROR_CODES.INTERNAL_ERROR;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const retryable = appErr?.retryable ?? true;

    await taskRunRepository.fail(
      taskRun.id,
      isTimeout ? 'TIMEOUT' : 'FAILED',
      errorCode,
      errorMessage,
      durationMs,
    );

    const isLastAttempt = attempt >= schedule.maxRetries + 1;
    if (isLastAttempt) {
      await scheduleRepository.updateStatus(scheduleId, 'FAILED');
      log.error({ errorCode, errorMessage, durationMs }, 'Task failed permanently');
      return;
    }

    if (!retryable) {
      await scheduleRepository.updateStatus(scheduleId, 'FAILED');
      log.error({ errorCode, errorMessage }, 'Non-retryable task failure');
      return;
    }

    if (schedule.cronExpr) {
      await scheduleRepository.updateStatus(scheduleId, 'SCHEDULED');
    } else {
      await scheduleRepository.updateStatus(scheduleId, 'SCHEDULED');
    }

    log.warn({ errorCode, errorMessage, attempt }, 'Task failed, will retry');
    throw error;
  }
}
