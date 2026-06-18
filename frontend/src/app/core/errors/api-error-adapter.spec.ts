import { adaptApiError } from './api-error-adapter';

describe('adaptApiError', () => {
  it('maps backend error envelopes to safe application errors', () => {
    const result = adaptApiError({
      error: {
        code: 'validation_required',
        message: 'Name is required.',
        category: 'validation',
        correlationId: 'req-1'
      }
    });

    expect(result).toEqual({
      code: 'validation_required',
      message: 'Name is required.',
      category: 'validation',
      correlationId: 'req-1'
    });
  });

  it('replaces unsafe messages with a generic user-facing message', () => {
    const result = adaptApiError({
      error: {
        code: 'unexpected_error',
        message: 'Traceback in /Users/example/app with token abc'
      }
    });

    expect(result.message).not.toContain('/Users/');
    expect(result.message).not.toContain('token');
    expect(result.category).toBe('unexpected');
  });
});
