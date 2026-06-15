import path from 'path';
import { getEnv } from '../config/env';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

export function resolveSafePath(inputPath: string): string {
  const env = getEnv();
  const basePath = path.resolve(env.FILE_TASK_BASE_PATH);
  const resolved = path.resolve(basePath, inputPath);

  if (!resolved.startsWith(basePath + path.sep) && resolved !== basePath) {
    throw new AppError(
      ERROR_CODES.FILE_ACCESS_DENIED,
      `Path "${inputPath}" is outside allowed base directory`,
      403,
      false,
    );
  }

  if (inputPath.includes('..')) {
    throw new AppError(
      ERROR_CODES.FILE_ACCESS_DENIED,
      'Path traversal is not allowed',
      403,
      false,
    );
  }

  return resolved;
}
