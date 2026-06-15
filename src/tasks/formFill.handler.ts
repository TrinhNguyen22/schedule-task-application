import type { FormFillResult, TaskHandler } from '../types/task.types';
import { formFillPayloadSchema } from '../validators/payloads/formFill.schema';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function fillString(value: string, data: Record<string, unknown>): string {
  return value.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const fieldValue = data[key];
    return fieldValue !== undefined ? String(fieldValue) : `{{${key}}}`;
  });
}

function fillTemplate(
  template: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string') {
      result[key] = fillString(value, data);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = fillTemplate(value as Record<string, unknown>, data);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export class FormFillHandler implements TaskHandler {
  async execute(payload: Record<string, unknown>): Promise<FormFillResult> {
    const { template, data } = formFillPayloadSchema.parse(payload);
    return fillTemplate(template, data);
  }
}

export const formFillHandler = new FormFillHandler();
