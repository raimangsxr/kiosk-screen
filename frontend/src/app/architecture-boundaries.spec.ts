describe('frontend architecture boundaries', () => {
  it('exposes core, shared, and feature boundaries through documented folders', async () => {
    const [routes, contracts, contentFacade, remoteControlFacade] = await Promise.all([
      import('./core/routing/app.routes'),
      import('./shared/contracts/admin-contracts'),
      import('./features/content/content.facade'),
      import('./features/remote-control/remote-control.facade')
    ]);

    expect(routes.routes.length).toBeGreaterThan(0);
    expect(contracts).toBeDefined();
    expect(contentFacade.ContentFacade).toBeDefined();
    expect(remoteControlFacade.RemoteControlFacade).toBeDefined();
  });
});
