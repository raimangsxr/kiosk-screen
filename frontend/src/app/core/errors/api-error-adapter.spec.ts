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

  it('maps FastAPI detail strings to validation messages', () => {
    const result = adaptApiError({
      error: {
        detail: 'Rotation animation must be none, fade, or slide.'
      }
    });

    expect(result.code).toBe('validation_failed');
    expect(result.message).toBe('Rotation animation must be none, fade, or slide.');
    expect(result.category).toBe('validation');
  });

  it('maps structured FastAPI detail objects to user messages', () => {
    const result = adaptApiError({
      error: {
        detail: {
          code: 'invalid_request',
          message: 'No se puede eliminar la pantalla porque sigue referenciada por conexiones activas.',
        },
      },
    });

    expect(result.code).toBe('invalid_request');
    expect(result.message).toContain('No se puede eliminar la pantalla');
  });

  it('maps structured upload errors from ApplicationError responses', () => {
    const result = adaptApiError({
      error: {
        code: 'unsupported_media_type',
        message: 'This file type is not supported.',
        category: 'upload'
      }
    });

    expect(result.code).toBe('unsupported_media_type');
    expect(result.category).toBe('upload');
  });
});
