import type { Prisma, Schedule, ScheduleStatus, TaskType } from '@prisma/client';
import { prisma } from '../config/database';
import type { ListSchedulesQuery, PaginatedResult } from '../types/schedule.types';

export interface CreateScheduleData {
  type: TaskType;
  payload: Prisma.InputJsonValue;
  scheduleAt: Date | null;
  cronExpr: string | null;
  timezone: string;
  maxRetries: number;
  timeoutMs: number;
  idempotencyKey?: string | null;
  source: string;
  correlationId?: string | null;
}

export class ScheduleRepository {
  async create(data: CreateScheduleData): Promise<Schedule> {
    return prisma.schedule.create({ data });
  }

  async findById(id: string): Promise<Schedule | null> {
    return prisma.schedule.findUnique({ where: { id } });
  }

  async findByIdWithRuns(id: string) {
    return prisma.schedule.findUnique({
      where: { id },
      include: {
        runs: { orderBy: { startedAt: 'desc' }, take: 20 },
      },
    });
  }

  async findByIdempotencyKey(key: string): Promise<Schedule | null> {
    return prisma.schedule.findUnique({ where: { idempotencyKey: key } });
  }

  async update(
    id: string,
    data: Prisma.ScheduleUpdateInput,
  ): Promise<Schedule> {
    return prisma.schedule.update({ where: { id }, data });
  }

  async list(query: ListSchedulesQuery): Promise<PaginatedResult<Schedule>> {
    const where: Prisma.ScheduleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.schedule.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async updateStatus(id: string, status: ScheduleStatus): Promise<Schedule> {
    return prisma.schedule.update({ where: { id }, data: { status } });
  }
}

export const scheduleRepository = new ScheduleRepository();
