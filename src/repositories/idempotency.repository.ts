import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateIdempotencyData {
  idempotencyKey: string;
  scheduleId: string;
  responseBody: Prisma.InputJsonValue;
  expiresAt: Date;
}

export class IdempotencyRepository {
  async findValid(key: string) {
    return prisma.idempotencyRecord.findFirst({
      where: {
        idempotencyKey: key,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async create(data: CreateIdempotencyData) {
    return prisma.idempotencyRecord.create({ data });
  }
}

export const idempotencyRepository = new IdempotencyRepository();
