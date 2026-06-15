import { formFillHandler } from '../../../src/tasks/formFill.handler';

describe('FormFillHandler', () => {
  it('fills template placeholders from data', async () => {
    const result = await formFillHandler.execute({
      template: {
        title: 'Hello {{name}}',
        meta: { department: '{{dept}}' },
      },
      data: { name: 'Alice', dept: 'IT' },
    });

    expect(result).toEqual({
      title: 'Hello Alice',
      meta: { department: 'IT' },
    });
  });
});
