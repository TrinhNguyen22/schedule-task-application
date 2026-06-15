import { z } from 'zod';

export const formFillPayloadSchema = z.object({
  template: z.record(z.string(), z.unknown()),
  data: z.record(z.string(), z.unknown()),
});

export type FormFillPayload = z.infer<typeof formFillPayloadSchema>;
