import { TestBed } from '@angular/core/testing';

import { DisplayContentItem } from '../core/api/display.api';
import { RecurringCadenceService } from './recurring-cadence.service';

function makeContent(
  id: string,
  displayOrder: number,
  recurringEveryXIterations?: number
): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `https://example.com/${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds: 10,
    recurringEveryXIterations
  };
}

describe('RecurringCadenceService (pure helpers)', () => {
  let service: RecurringCadenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecurringCadenceService]
    });
    service = TestBed.inject(RecurringCadenceService);
  });

  describe('regularQueue', () => {
    it('excludes recurring items and sorts by displayOrder', () => {
      const items = [makeContent('B', 2), makeContent('A', 1), makeContent('R', 3, 5)];
      expect(service.regularQueue(items).map((i) => i.id)).toEqual(['A', 'B']);
    });

    it('returns an empty array when every item is recurring', () => {
      const items = [makeContent('R1', 1, 3), makeContent('R2', 2, 5)];
      expect(service.regularQueue(items)).toEqual([]);
    });
  });

  describe('smallestRecurringCadence', () => {
    it('returns null when no recurring items exist', () => {
      expect(service.smallestRecurringCadence([makeContent('A', 1)])).toBeNull();
    });

    it('picks the smallest configured cadence', () => {
      const items = [
        makeContent('R1', 1, 5),
        makeContent('R2', 2, 2),
        makeContent('R3', 3, 7)
      ];
      expect(service.smallestRecurringCadence(items)).toBe(2);
    });

    it('ignores items with cadence < 1', () => {
      const items = [makeContent('R1', 1, 0), makeContent('R2', 2, -1), makeContent('R3', 3, 5)];
      expect(service.smallestRecurringCadence(items)).toBe(5);
    });
  });

  describe('pickRecurringItem', () => {
    it('returns the smallest-cadence candidate (tie-break: smallest displayOrder)', () => {
      const items = [
        makeContent('R-late-3', 3, 2),
        makeContent('R-tie-2', 2, 2),
        makeContent('R-tie-1', 1, 2),
        makeContent('R-low-cadence', 4, 5)
      ];
      expect(service.pickRecurringItem(items)?.id).toBe('R-tie-1');
    });

    it('returns null when no recurring items exist', () => {
      expect(service.pickRecurringItem([makeContent('A', 1)])).toBeNull();
    });
  });

  describe('shouldFireRecurring', () => {
    it('is true only after the counter exceeds the smallest cadence', () => {
      const items = [makeContent('R', 1, 3)];
      expect(service.shouldFireRecurring(items, 1)).toBeFalse();
      expect(service.shouldFireRecurring(items, 2)).toBeFalse();
      expect(service.shouldFireRecurring(items, 3)).toBeFalse();
      expect(service.shouldFireRecurring(items, 4)).toBeTrue();
    });
  });

  describe('nextCounter', () => {
    it('returns counter + 1', () => {
      expect(service.nextCounter(0)).toBe(1);
      expect(service.nextCounter(7)).toBe(8);
    });
  });

  describe('shouldResetOnEmptyRecurring', () => {
    it('is true only when the counter is non-zero and no recurring items remain', () => {
      const items = [makeContent('R', 1, 3)];
      expect(service.shouldResetOnEmptyRecurring([], 0)).toBeFalse();
      expect(service.shouldResetOnEmptyRecurring([], 5)).toBeTrue();
      expect(service.shouldResetOnEmptyRecurring(items, 5)).toBeFalse();
    });
  });
});