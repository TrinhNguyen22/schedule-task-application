import type { Request, Response } from 'express';
import { IDEMPOTENCY_HEADER } from '../config/constants';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import type { RequestWithCorrelation } from '../middleware/correlationId';
import { scheduleService } from '../services/schedule.service';
import type { CreateScheduleInput, ListSchedulesQuery } from '../types/schedule.types';
import type { ScheduleStatus, TaskType } from '@prisma/client';
import { getRouteParam } from '../utils/asyncHandler';

function asCorrelationRequest(req: Request): RequestWithCorrelation {
  return req as RequestWithCorrelation;
}

export async function createSchedule(req: Request, res: Response): Promise<void> {
  const correlationReq = asCorrelationRequest(req);
  const body = req.body as CreateScheduleInput;
  const schedule = await scheduleService.create({
    ...body,
    correlationId: correlationReq.correlationId,
  });
  res.status(201).json({ data: schedule });
}

export async function pushSchedule(req: Request, res: Response): Promise<void> {
  const correlationReq = asCorrelationRequest(req);
  const idempotencyKey = req.headers[IDEMPOTENCY_HEADER];
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    throw new AppError(
      ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
      `Header ${IDEMPOTENCY_HEADER} is required for push endpoint`,
      400,
    );
  }

  const body = req.body as CreateScheduleInput;
  const result = await scheduleService.push(
    { ...body, correlationId: correlationReq.correlationId },
    idempotencyKey,
  );

  res.status(result.created ? 201 : 200).json({ data: result.schedule });
}

export async function listSchedules(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListSchedulesQuery & {
    status?: ScheduleStatus;
    type?: TaskType;
  };
  const result = await scheduleService.list(query);
  res.status(200).json(result);
}

export async function getSchedule(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req, 'id');
  const schedule = await scheduleService.getById(id);
  res.status(200).json({ data: schedule });
}

export async function cancelSchedule(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req, 'id');
  const schedule = await scheduleService.cancel(id);
  res.status(200).json({ data: schedule });
}

export async function pauseSchedule(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req, 'id');
  const schedule = await scheduleService.pause(id);
  res.status(200).json({ data: schedule });
}

export async function resumeSchedule(req: Request, res: Response): Promise<void> {
  const id = getRouteParam(req, 'id');
  const schedule = await scheduleService.resume(id);
  res.status(200).json({ data: schedule });
}
