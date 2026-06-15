import type { Prisma, TaskRun, TaskRunStatus } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateTaskRunData {
  scheduleId: string;
  attempt: number;
  correlationId: string;
  bullJobId?: string | null;
}

export class TaskRunRepository {
  async create(data: CreateTaskRunData): Promise<TaskRun> {
    return prisma.taskRun.create({
      data: {
        ...data,
        status: 'RUNNING',
      },
    });
  }

  async findByScheduleAndAttempt(
    scheduleId: string,
    attempt: number,
  ): Promise<TaskRun | null> {
    return prisma.taskRun.findUnique({
      where: { scheduleId_attempt: { scheduleId, attempt } },
    });
  }

  async complete(
    id: string,
    result: Prisma.InputJsonValue,
    durationMs: number,
  ): Promise<TaskRun> {
    return prisma.taskRun.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        result,
        durationMs,
        finishedAt: new Date(),
      },
    });
  }

  async fail(
    id: string,
    status: TaskRunStatus,
    errorCode: string,
    errorMessage: string,
    durationMs: number,
  ): Promise<TaskRun> {
    return prisma.taskRun.update({
      where: { id },
      data: {
        status,
        errorCode,
        errorMessage,
        durationMs,
        finishedAt: new Date(),
      },
    });
  }
}

export const taskRunRepository = new TaskRunRepository();
