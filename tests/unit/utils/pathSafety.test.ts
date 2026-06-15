import { resolveSafePath } from '../../../src/utils/pathSafety';
import { AppError } from '../../../src/errors/AppError';

describe('resolveSafePath', () => {
  it('resolves path inside base directory', () => {
    const resolved = resolveSafePath('sample.txt');
    expect(resolved).toContain('sample.txt');
  });

  it('rejects path traversal', () => {
    expect(() => resolveSafePath('../package.json')).toThrow(AppError);
  });
});
