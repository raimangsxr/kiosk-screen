import type { ApplicationErrorContract } from '../../shared/contracts/admin-contracts';

interface BackendErrorEnvelope {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly details?: unknown;
  readonly category?: unknown;
  readonly correlationId?: unknown;
}

const DEFAULT_ERROR: ApplicationErrorContract = {
  code: 'unexpected_error',
  message: 'The action could not be completed. Try again or contact support.',
  category: 'unexpected'
};

const CATEGORY_BY_CODE_PREFIX: ReadonlyArray<readonly [string, ApplicationErrorContract['category']]> = [
  ['validation', 'validation'],
  ['permission', 'permission'],
  ['dependency', 'dependency'],
  ['upload', 'upload'],
  ['storage', 'storage'],
  ['migration', 'migration'],
  ['not_found', 'not-found'],
  ['conflict', 'conflict']
];

export function adaptApiError(error: unknown): ApplicationErrorContract {
  const envelope = unwrapErrorEnvelope(error);
  if (!envelope) {
    return DEFAULT_ERROR;
  }

  const code = typeof envelope.code === 'string' && envelope.code.trim() ? envelope.code : DEFAULT_ERROR.code;
  const message = sanitizeUserMessage(envelope.message);
  const category = normalizeCategory(envelope.category, code);
  const correlationId = typeof envelope.correlationId === 'string' ? envelope.correlationId : undefined;

  return {
    code,
    message,
    category,
    ...(correlationId ? { correlationId } : {})
  };
}

function unwrapErrorEnvelope(error: unknown): BackendErrorEnvelope | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const maybeHttpError = error as { readonly error?: unknown };
  const body = maybeHttpError.error ?? error;
  if (!body || typeof body !== 'object') {
    return null;
  }

  const envelope = body as BackendErrorEnvelope & { readonly detail?: unknown };
  if (typeof envelope.message === 'string' && envelope.message.trim()) {
    return envelope;
  }

  const detail = envelope.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const structured = detail as BackendErrorEnvelope;
    if (typeof structured.message === 'string' && structured.message.trim()) {
      return {
        code: typeof structured.code === 'string' ? structured.code : 'request_failed',
        message: structured.message,
        category: structured.category,
        correlationId: structured.correlationId,
      };
    }
  }

  if (typeof detail === 'string' && detail.trim()) {
    return {
      code: typeof envelope.code === 'string' ? envelope.code : 'validation_failed',
      message: detail,
      category: envelope.category,
      correlationId: envelope.correlationId,
    };
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first && typeof first === 'object' && 'msg' in first && typeof first.msg === 'string') {
      return {
        code: 'validation_failed',
        message: first.msg,
        category: 'validation',
      };
    }
  }

  return envelope;
}

function sanitizeUserMessage(message: unknown): string {
  if (typeof message !== 'string' || !message.trim()) {
    return DEFAULT_ERROR.message;
  }

  const unsafePatterns = [/\/Users\//i, /\/var\//i, /Traceback/i, /stack trace/i, /password/i, /secret/i, /token/i];
  if (unsafePatterns.some((pattern) => pattern.test(message))) {
    return DEFAULT_ERROR.message;
  }

  return message;
}

function normalizeCategory(category: unknown, code: string): ApplicationErrorContract['category'] {
  const allowed: ReadonlySet<ApplicationErrorContract['category']> = new Set([
    'validation',
    'permission',
    'dependency',
    'upload',
    'storage',
    'migration',
    'not-found',
    'conflict',
    'unexpected'
  ]);

  if (typeof category === 'string' && allowed.has(category as ApplicationErrorContract['category'])) {
    return category as ApplicationErrorContract['category'];
  }

  return CATEGORY_BY_CODE_PREFIX.find(([prefix]) => code.startsWith(prefix))?.[1] ?? DEFAULT_ERROR.category;
}
