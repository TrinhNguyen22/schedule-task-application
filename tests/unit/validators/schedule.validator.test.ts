import { createScheduleSchema, validateTaskPayload } from '../../../src/validators/schedule.validator';
import { TaskType } from '@prisma/client';

describe('schedule.validator', () => {
  it('requires exactly one of scheduleAt or cronExpr', () => {
    const result = createScheduleSchema.safeParse({
      type: TaskType.EMAIL,
      payload: { to: ['a@b.com'], subject: 'Hi', body: 'Test' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts scheduleAt for one-shot task', () => {
    const result = createScheduleSchema.safeParse({
      type: TaskType.EMAIL,
      payload: { to: ['a@b.com'], subject: 'Hi', body: 'Test' },
      scheduleAt: '2026-06-14T08:00:00+07:00',
    });
    expect(result.success).toBe(true);
  });

  it('validates email payload by task type', () => {
    expect(() =>
      validateTaskPayload(TaskType.EMAIL, {
        to: ['invalid-email'],
        subject: 'Hi',
        body: 'Test',
      }),
    ).toThrow();
  });
});
