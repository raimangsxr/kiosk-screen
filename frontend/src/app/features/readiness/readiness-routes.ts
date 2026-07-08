/** Maps readiness blocker/warning copy to the admin route that resolves it. */
export function resolveReadinessRoute(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('user') || lower.includes('rol') || lower.includes('usuario')) {
    return '/admin/users';
  }
  if (lower.includes('content') || lower.includes('contenido')) {
    return '/admin/content';
  }
  if (lower.includes('anuncio') || /\bad(s)?\b/.test(lower)) {
    return '/admin/ads';
  }
  if (lower.includes('iframe') || lower.includes('embedded')) {
    return '/admin/iframes';
  }
  if (lower.includes('configuration') || lower.includes('display') || lower.includes('pantalla')) {
    return '/admin/configuration';
  }
  if (lower.includes('event') || lower.includes('evento')) {
    return '/admin/event';
  }
  return '/admin';
}
