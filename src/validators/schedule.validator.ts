import { TaskType } from '@prisma/client';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '../config/constants';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import { emailPayloadSchema } from './payloads/email.schema';
import { fileImportPayloadSchema } from './payloads/fileImport.schema';
import { fileReadPayloadSchema } from './payloads/fileRead.schema';
import { formFillPayloadSchema } from './payloads/formFill.schema';

const taskTypeSchema = z.nativeEnum(TaskType);

export const createScheduleSchema = z
  .object({
    type: taskTypeSchema,
    payload: z.record(z.string(), z.unknown()),
    scheduleAt: z.string().datetime({ offset: true }).optional(),
    cronExpr: z.string().min(1).optional(),
    timezone: z.string().default(DEFAULT_TIMEZONE),
    maxRetries: z.number().int().min(0).max(10).optional(),
    timeoutMs: z.number().int().min(1000).max(300000).optional(),
    idempotencyKey: z.string().min(1).max(255).optional(),
  })
  .superRefine((data, ctx) => {
    const hasScheduleAt = Boolean(data.scheduleAt);
    const hasCron = Boolean(data.cronExpr);
    if (hasScheduleAt === hasCron) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exactly one of scheduleAt or cronExpr must be provided',
        path: ['scheduleAt'],
      });
    }
  });

export const pushScheduleSchema = createScheduleSchema;

export const listSchedulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'PENDING',
      'SCHEDULED',
      'RUNNING',
      'PAUSED',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ])
    .optional(),
  type: taskTypeSchema.optional(),
});

export const scheduleIdParamSchema = z.object({
  id: z.string().uuid(),
});

const payloadValidators: Record<
  TaskType,
  z.ZodSchema<Record<string, unknown>>
> = {
  [TaskType.FILE_READ]: fileReadPayloadSchema,
  [TaskType.FILE_IMPORT]: fileImportPayloadSchema,
  [TaskType.FORM_FILL]: formFillPayloadSchema,
  [TaskType.EMAIL]: emailPayloadSchema,
};

export function validateTaskPayload(
  type: TaskType,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const schema = payloadValidators[type];
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Invalid payload for task type ${type}`,
      400,
      false,
      {
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    );
  }
  return result.data;
}
