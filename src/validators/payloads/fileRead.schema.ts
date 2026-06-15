import { z } from 'zod';

export const fileReadPayloadSchema = z.object({
  path: z.string().min(1, 'path is required'),
});

export type FileReadPayload = z.infer<typeof fileReadPayloadSchema>;
