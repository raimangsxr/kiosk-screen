import { TestBed } from '@angular/core/testing';

import {
  ADMIN_DENSITY,
  densityValue,
  provideAdminDensity,
  toMaterialDensity
} from './density';

describe('admin density', () => {
  it('maps admin density tokens to Material density scale values', () => {
    expect(densityValue['compact']).toBe(-1);
    expect(densityValue['standard']).toBe(0);
    expect(densityValue['comfortable']).toBe(1);
    expect(toMaterialDensity('compact')).toBe(-1);
    expect(toMaterialDensity('standard')).toBe(0);
    expect(toMaterialDensity('comfortable')).toBe(1);
  });

  it('defaults the token to standard when no provider is registered', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(ADMIN_DENSITY)).toBe('standard');
  });

  it('uses the value provided by provideAdminDensity', () => {
    TestBed.configureTestingModule({ providers: [provideAdminDensity('compact')] });
    expect(TestBed.inject(ADMIN_DENSITY)).toBe('compact');
  });
});
