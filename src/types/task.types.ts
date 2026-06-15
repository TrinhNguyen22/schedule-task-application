export interface FileReadResult {
  path: string;
  size: number;
  mimeType: string;
  lineCount: number;
  preview: string;
}

export interface FileImportError {
  path: string;
  message: string;
}

export interface FileImportResult {
  total: number;
  success: number;
  failed: number;
  records: Record<string, unknown>[];
  errors: FileImportError[];
}

export type FormFillResult = Record<string, unknown>;

export interface EmailResult {
  messageId: string;
  sentAt: string;
  status: 'mocked' | 'sent' | 'failed';
  recipients: string[];
}

export type TaskResult = FileReadResult | FileImportResult | FormFillResult | EmailResult;

export interface TaskHandler {
  execute(payload: Record<string, unknown>): Promise<TaskResult>;
}
