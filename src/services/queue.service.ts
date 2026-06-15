import type { Schedule } from '@prisma/client';
import { JOB_NAME_EXECUTE } from '../config/constants';
import { getLogger } from '../utils/logger';
import type { ScheduleJobData } from '../types/schedule.types';
import { getScheduleQueue } from '../queue/queues';

export class QueueService {
  private readonly log = getLogger({ component: 'QueueService' });

  async enqueueSchedule(schedule: Schedule): Promise<string> {
    const queue = getScheduleQueue();
    const correlationId = schedule.correlationId ?? schedule.id;
    const data: ScheduleJobData = {
      scheduleId: schedule.id,
      correlationId,
    };

    if (schedule.cronExpr) {
      const jobId = `schedule-cron-${schedule.id}`;
      await queue.add(JOB_NAME_EXECUTE, data, {
        jobId,
        repeat: {
          pattern: schedule.cronExpr,
          tz: schedule.timezone,
        },
        attempts: schedule.maxRetries + 1,
        backoff: { type: 'exponential', delay: 2000 },
      });
      this.log.info(
        { scheduleId: schedule.id, cronExpr: schedule.cronExpr },
        'Enqueued repeatable schedule',
      );
      return jobId;
    }

    if (!schedule.scheduleAt) {
      throw new Error('Schedule must have scheduleAt or cronExpr');
    }

    const delay = Math.max(0, schedule.scheduleAt.getTime() - Date.now());
    const jobId = `schedule-${schedule.id}`;
    await queue.add(JOB_NAME_EXECUTE, data, {
      jobId,
      delay,
      attempts: schedule.maxRetries + 1,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.log.info({ scheduleId: schedule.id, delayMs: delay }, 'Enqueued delayed schedule');
    return jobId;
  }

  async removeScheduleJob(schedule: Schedule): Promise<void> {
    const queue = getScheduleQueue();

    if (schedule.cronExpr) {
      const repeatables = await queue.getRepeatableJobs();
      const jobId = schedule.bullJobId ?? `schedule-cron-${schedule.id}`;
      const match = repeatables.find(
        (job) => job.id === jobId || job.key.includes(schedule.id),
      );
      if (match) {
        await queue.removeRepeatableByKey(match.key);
      }
    }

    const jobId = schedule.bullJobId ?? `schedule-${schedule.id}`;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}

export const queueService = new QueueService();
