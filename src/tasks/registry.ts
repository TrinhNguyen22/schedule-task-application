import { TaskType } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import type { TaskHandler } from '../types/task.types';
import { emailHandler } from './email.handler';
import { fileImportHandler } from './fileImport.handler';
import { fileReadHandler } from './fileRead.handler';
import { formFillHandler } from './formFill.handler';

const handlers: Record<TaskType, TaskHandler> = {
  [TaskType.FILE_READ]: fileReadHandler,
  [TaskType.FILE_IMPORT]: fileImportHandler,
  [TaskType.FORM_FILL]: formFillHandler,
  [TaskType.EMAIL]: emailHandler,
};

export function getTaskHandler(type: TaskType): TaskHandler {
  const handler = handlers[type];
  if (!handler) {
    throw new AppError(
      ERROR_CODES.UNSUPPORTED_TASK_TYPE,
      `Unsupported task type: ${type}`,
      400,
      false,
    );
  }
  return handler;
}
