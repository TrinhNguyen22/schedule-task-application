import { Queue } from 'bullmq';
import { JOB_NAME_EXECUTE } from '../config/constants';
import { getRedisConnectionOptions } from './connection';

export const SCHEDULE_QUEUE_NAME = 'schedule-execute';

let scheduleQueue: Queue | null = null;

export function getScheduleQueue(): Queue {
  if (!scheduleQueue) {
    scheduleQueue = new Queue(SCHEDULE_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return scheduleQueue;
}

export async function closeQueues(): Promise<void> {
  if (scheduleQueue) {
    await scheduleQueue.close();
    scheduleQueue = null;
  }
}

export { JOB_NAME_EXECUTE };
