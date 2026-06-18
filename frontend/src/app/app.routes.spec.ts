import { routes } from './app.routes';
import { dirtyFormGuard } from './shared/dirty-form.guard';

describe('routes', () => {
  it('wires login and guarded display routes', () => {
    const displayRoute = routes.find((route) => route.path === 'display');
    const hallRoute = routes.find((route) => route.path === 'hall');
    const remoteControlRoute = routes.find((route) => route.path === 'remote-control');

    expect(routes.some((route) => route.path === 'login')).toBeTrue();
    expect(hallRoute?.canActivate?.length).toBe(1);
    expect(displayRoute?.canActivate?.length).toBe(1);
    expect(remoteControlRoute?.canActivate?.length).toBe(1);
  });

  it('wires admin dashboard, destinations, and dirty form guarded editors', () => {
    const adminRoute = routes.find((route) => route.path === 'admin');
    const childPaths = adminRoute?.children?.map((route) => route.path) ?? [];
    const contentEditor = adminRoute?.children?.find((route) => route.path === 'content/:id/edit');
    const adEditor = adminRoute?.children?.find((route) => route.path === 'ads/:id/edit');
    const clientEditor = adminRoute?.children?.find((route) => route.path === 'clients/:id/edit');

    expect(adminRoute?.canActivate?.length).toBe(1);
    expect(childPaths).toContain('');
    expect(childPaths).toContain('content');
    expect(childPaths).toContain('ads');
    expect(childPaths).toContain('clients');
    expect(childPaths).toContain('domains');
    expect(childPaths).toContain('configuration');
    expect(childPaths).toContain('readiness');
    expect(childPaths).toContain('users');
    expect(contentEditor?.canDeactivate).toContain(dirtyFormGuard);
    expect(adEditor?.canDeactivate).toContain(dirtyFormGuard);
    expect(clientEditor?.canDeactivate).toContain(dirtyFormGuard);
  });
});
