import { z } from 'zod';

export const fileImportPayloadSchema = z.object({
  paths: z.array(z.string().min(1)).min(1, 'At least one path is required'),
  format: z.enum(['csv', 'json']).optional(),
});

export type FileImportPayload = z.infer<typeof fileImportPayloadSchema>;
