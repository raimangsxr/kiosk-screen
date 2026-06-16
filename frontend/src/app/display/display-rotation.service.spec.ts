import { TestBed } from '@angular/core/testing';

import { DisplayRotationService } from './display-rotation.service';

describe('DisplayRotationService', () => {
  let service: DisplayRotationService;

  beforeEach(() => {
    service = TestBed.inject(DisplayRotationService);
  });

  it('uses deterministic configured order', () => {
    const ordered = service.ordered([{ displayOrder: 2 }, { displayOrder: 1 }]);

    expect(ordered.map((item) => item.displayOrder)).toEqual([1, 2]);
  });

  it('returns fallback null when there are no items', () => {
    expect(service.current([], 0)).toBeNull();
  });
});

