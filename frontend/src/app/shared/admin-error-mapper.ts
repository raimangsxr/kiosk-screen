export function mapAdminError(error: unknown, fallback = 'The change could not be saved.'): string {
  const candidate = error as { error?: { detail?: unknown; message?: unknown }; message?: unknown };
  const raw = candidate?.error?.detail ?? candidate?.error?.message ?? candidate?.message ?? fallback;
  const text = String(raw || fallback);
  if (text.includes('/Users/') || text.includes('/var/') || text.includes('Traceback') || text.includes('token')) {
    return fallback;
  }
  return text;
}
