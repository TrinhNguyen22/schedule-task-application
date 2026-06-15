import type { Schedule, TaskRun, TaskType, ScheduleStatus } from '@prisma/client';

export type { TaskType, ScheduleStatus };

export interface ScheduleJobData {
  scheduleId: string;
  correlationId: string;
}

export interface CreateScheduleInput {
  type: TaskType;
  payload: Record<string, unknown>;
  scheduleAt?: string;
  cronExpr?: string;
  timezone?: string;
  maxRetries?: number;
  timeoutMs?: number;
  idempotencyKey?: string;
  source?: string;
  correlationId?: string;
}

export interface ListSchedulesQuery {
  page: number;
  limit: number;
  status?: ScheduleStatus;
  type?: TaskType;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ScheduleWithRuns = Schedule & { runs: TaskRun[] };

export interface ScheduleResponse {
  id: string;
  type: TaskType;
  payload: unknown;
  scheduleAt: string | null;
  cronExpr: string | null;
  timezone: string;
  status: ScheduleStatus;
  maxRetries: number;
  timeoutMs: number;
  idempotencyKey: string | null;
  source: string;
  correlationId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  runs?: TaskRunResponse[];
}

export interface TaskRunResponse {
  id: string;
  scheduleId: string;
  status: string;
  attempt: number;
  correlationId: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  result: unknown;
  errorCode: string | null;
  errorMessage: string | null;
}
