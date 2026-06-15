import 'dotenv/config';
import { Worker } from 'bullmq';
import { JOB_NAME_EXECUTE, SCHEDULE_QUEUE_NAME } from './queue/queues';
import { getRedisConnectionOptions } from './queue/connection';
import { processScheduleJob } from './queue/processors/schedule.processor';
import { getLogger } from './utils/logger';
import type { ScheduleJobData } from './types/schedule.types';

const log = getLogger({ component: 'worker' });

const worker = new Worker<ScheduleJobData>(
  SCHEDULE_QUEUE_NAME,
  async (job) => processScheduleJob(job),
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5,
  },
);

worker.on('completed', (job) => {
  log.info({ jobId: job.id, scheduleId: job.data.scheduleId }, 'Job completed');
});

worker.on('failed', (job, error) => {
  log.error(
    {
      jobId: job?.id,
      scheduleId: job?.data.scheduleId,
      err: error,
    },
    'Job failed',
  );
});

worker.on('ready', () => {
  log.info({ queue: SCHEDULE_QUEUE_NAME, jobName: JOB_NAME_EXECUTE }, 'Worker ready');
});

async function shutdown(): Promise<void> {
  log.info('Shutting down worker...');
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
