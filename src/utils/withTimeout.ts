import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';

export function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label = 'operation',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AppError(
          ERROR_CODES.TASK_TIMEOUT,
          `${label} exceeded timeout of ${timeoutMs}ms`,
          408,
          true,
        ),
      );
    }, timeoutMs);

    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
