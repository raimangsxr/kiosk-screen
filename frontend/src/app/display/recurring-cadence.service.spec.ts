import { TestBed } from '@angular/core/testing';

import { DisplayContentItem } from '../core/api/display.api';
import { RecurringCadenceService } from './recurring-cadence.service';

function makeContent(
  id: string,
  displayOrder: number,
  options: {
    recurringEveryXIterations?: number;
    isActive?: boolean;
  } = {},
): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `https://example.com/${id}.jpg`,
    isActive: options.isActive ?? true,
    displayOrder,
    durationSeconds: 10,
    recurringEveryXIterations: options.recurringEveryXIterations,
  };
}

describe('RecurringCadenceService (CHG-039 per-item counters)', () => {
  let service: RecurringCadenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecurringCadenceService],
    });
    service = TestBed.inject(RecurringCadenceService);
  });

  describe('regularQueue', () => {
    it('excludes recurring and novelty items and sorts by displayOrder', () => {
      const items = [
        makeContent('B', 2),
        makeContent('A', 1),
        makeContent('R', 3, { recurringEveryXIterations: 5 }),
        { ...makeContent('N', 4), isNovelty: true },
      ];
      expect(service.regularQueue(items).map((i) => i.id)).toEqual(['A', 'B']);
    });
  });

  describe('fillerQueue', () => {
    it('includes only active recurring items sorted by displayOrder', () => {
      const items = [
        makeContent('B', 2, { recurringEveryXIterations: 5 }),
        makeContent('A', 1, { recurringEveryXIterations: 3 }),
        makeContent('I', 3, { recurringEveryXIterations: 6, isActive: false }),
        makeContent('R', 4),
      ];
      expect(service.fillerQueue(items).map((i) => i.id)).toEqual(['A', 'B']);
    });
  });

  describe('incrementCounters', () => {
    it('increments each recurring id by 1', () => {
      const items = [
        makeContent('A', 1, { recurringEveryXIterations: 3 }),
        makeContent('B', 2, { recurringEveryXIterations: 5 }),
      ];
      const next = service.incrementCounters(new Map([['A', 2]]), items);
      expect(next.get('A')).toBe(3);
      expect(next.get('B')).toBe(1);
    });

    it('tracks ten independent counters (SC-001)', () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        makeContent(`R${i}`, i + 1, { recurringEveryXIterations: 30 }),
      );
      let counters = new Map<string, number>();
      for (let tick = 0; tick < 30; tick++) {
        counters = service.incrementCounters(counters, items);
      }
      for (const item of items) {
        expect(counters.get(item.id)).toBe(30);
      }
    });
  });

  describe('dueItems', () => {
    it('returns items with counter >= N sorted by displayOrder', () => {
      const items = [
        makeContent('C', 30, { recurringEveryXIterations: 6 }),
        makeContent('A', 10, { recurringEveryXIterations: 6 }),
        makeContent('B', 20, { recurringEveryXIterations: 30 }),
      ];
      const counters = new Map<string, number>([
        ['A', 6],
        ['B', 30],
        ['C', 5],
      ]);
      expect(service.dueItems(items, counters).map((i) => i.id)).toEqual(['A', 'B']);
    });
  });

  describe('cadenceChanges', () => {
    it('detects cadence edits and newly recurring items', () => {
      const previous = new Map([['A', 30]]);
      const items = [
        makeContent('A', 1, { recurringEveryXIterations: 10 }),
        makeContent('B', 2, { recurringEveryXIterations: 5 }),
      ];
      expect(service.cadenceChanges(previous, items).sort()).toEqual(['A', 'B']);
    });
  });

  describe('pruneCounters', () => {
    it('drops counters for removed recurring ids', () => {
      const pruned = service.pruneCounters(new Map([['A', 3], ['B', 2]]), ['A']);
      expect(pruned.get('A')).toBe(3);
      expect(pruned.has('B')).toBeFalse();
    });
  });

  describe('resetCounter', () => {
    it('sets one id to 0 without affecting others', () => {
      const reset = service.resetCounter(new Map([['A', 5], ['B', 8]]), 'A');
      expect(reset.get('A')).toBe(0);
      expect(reset.get('B')).toBe(8);
    });
  });
});
