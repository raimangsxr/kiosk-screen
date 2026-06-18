import { InjectionToken, Provider, inject } from '@angular/core';

export type AdminDensity = 'compact' | 'standard' | 'comfortable';

export const ADMIN_DENSITY = new InjectionToken<AdminDensity>('app.admin-density', {
  providedIn: 'root',
  factory: () => 'standard'
});

export const densityValue: Record<AdminDensity, number> = {
  compact: -1,
  standard: 0,
  comfortable: 1
};

export function provideAdminDensity(density: AdminDensity): Provider {
  return {
    provide: ADMIN_DENSITY,
    useValue: density
  };
}

export function injectAdminDensity(): AdminDensity {
  return inject(ADMIN_DENSITY);
}

export function toMaterialDensity(density: AdminDensity): number {
  return densityValue[density];
}
