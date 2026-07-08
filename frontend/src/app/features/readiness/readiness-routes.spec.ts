import { resolveReadinessRoute } from './readiness-routes';

describe('resolveReadinessRoute', () => {
  it('routes content blockers to content admin', () => {
    expect(resolveReadinessRoute('Missing active content')).toBe('/admin/content');
    expect(resolveReadinessRoute('Sin contenido activo')).toBe('/admin/content');
  });

  it('routes ads warnings to ads admin', () => {
    expect(resolveReadinessRoute('No active ads configured')).toBe('/admin/ads');
    expect(resolveReadinessRoute('Falta un anuncio activo')).toBe('/admin/ads');
  });

  it('routes configuration issues to display configuration', () => {
    expect(resolveReadinessRoute('Display configuration disabled')).toBe('/admin/configuration');
    expect(resolveReadinessRoute('Pantalla desactivada')).toBe('/admin/configuration');
  });

  it('routes event issues to event admin', () => {
    expect(resolveReadinessRoute('Event name missing')).toBe('/admin/event');
    expect(resolveReadinessRoute('Evento sin nombre')).toBe('/admin/event');
  });

  it('routes user issues to users admin', () => {
    expect(resolveReadinessRoute('No admin user with role')).toBe('/admin/users');
    expect(resolveReadinessRoute('Falta un usuario con rol')).toBe('/admin/users');
  });

  it('falls back to dashboard for unknown messages', () => {
    expect(resolveReadinessRoute('Something else')).toBe('/admin');
  });
});
