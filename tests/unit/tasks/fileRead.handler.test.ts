import { fileReadHandler } from '../../../src/tasks/fileRead.handler';

describe('FileReadHandler', () => {
  it('reads sample.txt and returns metadata', async () => {
    const result = await fileReadHandler.execute({ path: 'sample.txt' });

    expect(result.path).toBe('sample.txt');
    expect(result.size).toBeGreaterThan(0);
    expect(result.lineCount).toBeGreaterThan(0);
    expect(result.preview).toContain('Schedule Task Application');
  });
});
