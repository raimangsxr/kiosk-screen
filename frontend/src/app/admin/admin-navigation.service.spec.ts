import { TestBed } from '@angular/core/testing';

import { AdminNavigationService } from './admin-navigation.service';

describe('AdminNavigationService', () => {
  it('lists every required admin destination', () => {
    const service = TestBed.inject(AdminNavigationService);
    const labels = service.items.map((item) => item.label);

    expect(labels).toEqual(['Dashboard', 'Content', 'Ads', 'Clients', 'Iframe domains', 'Display configuration', 'Readiness', 'Users and roles']);
  });
});
