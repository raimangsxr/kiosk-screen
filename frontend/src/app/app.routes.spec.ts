import { routes } from './app.routes';

describe('routes', () => {
  it('wires login and guarded display routes', () => {
    const displayRoute = routes.find((route) => route.path === 'display');

    expect(routes.some((route) => route.path === 'login')).toBeTrue();
    expect(displayRoute?.canActivate?.length).toBe(1);
  });
});
