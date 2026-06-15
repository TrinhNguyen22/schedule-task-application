import { z } from 'zod';

export const emailPayloadSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, 'subject is required'),
  body: z.string().min(1, 'body is required'),
});

export type EmailPayload = z.infer<typeof emailPayloadSchema>;
