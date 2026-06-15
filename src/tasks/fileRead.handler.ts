import fs from 'fs/promises';
import path from 'path';
import { PREVIEW_MAX_CHARS } from '../config/constants';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import type { FileReadResult, TaskHandler } from '../types/task.types';
import { resolveSafePath } from '../utils/pathSafety';
import { fileReadPayloadSchema } from '../validators/payloads/fileRead.schema';

function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
  };
  return map[ext] ?? 'application/octet-stream';
}

export class FileReadHandler implements TaskHandler {
  async execute(payload: Record<string, unknown>): Promise<FileReadResult> {
    const { path: filePath } = fileReadPayloadSchema.parse(payload);
    const safePath = resolveSafePath(filePath);

    let content: string;
    let stats;
    try {
      stats = await fs.stat(safePath);
      if (!stats.isFile()) {
        throw new AppError(ERROR_CODES.FILE_NOT_FOUND, 'Path is not a file', 404, false);
      }
      content = await fs.readFile(safePath, 'utf-8');
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ERROR_CODES.FILE_NOT_FOUND,
        `File not found: ${filePath}`,
        404,
        false,
      );
    }

    const lines = content.split('\n');
    return {
      path: filePath,
      size: stats.size,
      mimeType: detectMimeType(safePath),
      lineCount: lines.length,
      preview: content.slice(0, PREVIEW_MAX_CHARS),
    };
  }
}

export const fileReadHandler = new FileReadHandler();
