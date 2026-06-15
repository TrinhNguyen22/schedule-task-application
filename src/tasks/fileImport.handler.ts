import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/AppError';
import { ERROR_CODES } from '../errors/errorCodes';
import type { FileImportResult, TaskHandler } from '../types/task.types';
import { resolveSafePath } from '../utils/pathSafety';
import { fileImportPayloadSchema } from '../validators/payloads/fileImport.schema';

function parseCsv(content: string): Record<string, unknown>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
}

function detectFormat(filePath: string, explicit?: 'csv' | 'json'): 'csv' | 'json' {
  if (explicit) return explicit;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  return 'csv';
}

export class FileImportHandler implements TaskHandler {
  async execute(payload: Record<string, unknown>): Promise<FileImportResult> {
    const { paths, format } = fileImportPayloadSchema.parse(payload);
    const records: Record<string, unknown>[] = [];
    const errors: FileImportResult['errors'] = [];
    let success = 0;

    for (const filePath of paths) {
      try {
        const safePath = resolveSafePath(filePath);
        const content = await fs.readFile(safePath, 'utf-8');
        const fileFormat = detectFormat(filePath, format);

        if (fileFormat === 'json') {
          const parsed = JSON.parse(content) as unknown;
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === 'object' && item !== null) {
                records.push(item as Record<string, unknown>);
              }
            });
          } else if (typeof parsed === 'object' && parsed !== null) {
            records.push(parsed as Record<string, unknown>);
          }
        } else {
          records.push(...parseCsv(content));
        }
        success += 1;
      } catch (error) {
        const message =
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Unknown import error';
        errors.push({ path: filePath, message });
      }
    }

    if (success === 0 && errors.length > 0) {
      throw new AppError(
        ERROR_CODES.FILE_PARSE_ERROR,
        'All files failed to import',
        422,
        false,
        { errors },
      );
    }

    return {
      total: paths.length,
      success,
      failed: paths.length - success,
      records,
      errors,
    };
  }
}

export const fileImportHandler = new FileImportHandler();
