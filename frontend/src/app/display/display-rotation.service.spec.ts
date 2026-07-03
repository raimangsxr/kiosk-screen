import { TestBed } from '@angular/core/testing';

import { DisplayRotationService } from './display-rotation.service';

describe('DisplayRotationService (legacy helpers)', () => {
  let service: DisplayRotationService;

  beforeEach(() => {
    service = TestBed.inject(DisplayRotationService);
  });

  it('uses deterministic configured order', () => {
    const ordered = service.ordered([{ displayOrder: 2 }, { displayOrder: 1 }]);
    expect(ordered.map((item) => item.displayOrder)).toEqual([1, 2]);
  });

  it('preserves original order when displayOrder is identical', () => {
    const items = [
      { id: 'a', displayOrder: 1 },
      { id: 'b', displayOrder: 1 },
      { id: 'c', displayOrder: 2 },
    ];
    const ordered = service.ordered(items);
    expect(ordered.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the source array', () => {
    const items = [{ displayOrder: 3 }, { displayOrder: 1 }, { displayOrder: 2 }];
    const snapshot = items.map((item) => item.displayOrder);
    service.ordered(items);
    expect(items.map((item) => item.displayOrder)).toEqual(snapshot);
  });

  it('returns fallback null when there are no items', () => {
    expect(service.current([], 0)).toBeNull();
  });

  it('wraps index modulo when it overflows the list', () => {
    const items = [{ id: 'a', displayOrder: 1 }, { id: 'b', displayOrder: 2 }];
    expect(service.current(items, 2)?.id).toBe('a');
    expect(service.current(items, 3)?.id).toBe('b');
    expect(service.current(items, -1)?.id).toBe('b');
  });

  it('prefers effectiveDurationSeconds over durationSeconds', () => {
    const item = { displayOrder: 1, durationSeconds: 5, effectiveDurationSeconds: 12 };
    expect(service.duration(item, 30)).toBe(12);
  });

  it('falls back to durationSeconds when effective is missing', () => {
    const item = { displayOrder: 1, durationSeconds: 5 };
    expect(service.duration(item, 30)).toBe(5);
  });

  it('falls back to the provided default when item is null or has no duration', () => {
    expect(service.duration(null, 30)).toBe(30);
    expect(service.duration({ displayOrder: 1 }, 30)).toBe(30);
  });
});

describe('DisplayRotationService (pending novelties)', () => {
  let service: DisplayRotationService;

  beforeEach(() => {
    service = TestBed.inject(DisplayRotationService);
  });

  it('returns pending novelties sorted by displayOrder', () => {
    const pending = service.pendingNovelties([
      { id: 'c', displayOrder: 3, isNovelty: true } as never,
      { id: 'a', displayOrder: 1, isNovelty: true } as never,
      { id: 'b', displayOrder: 2, isNovelty: false } as never,
    ]);
    expect(pending.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('skips ids in the failure set', () => {
    const pending = service.pendingNovelties(
      [
        { id: 'a', displayOrder: 1, isNovelty: true } as never,
        { id: 'b', displayOrder: 2, isNovelty: true } as never,
      ],
      new Set(['a']),
    );
    expect(pending.map((item) => item.id)).toEqual(['b']);
  });

  it('pickNext advances circularly in a queue', () => {
    const queue = [
      { id: 'a', displayOrder: 1 } as never,
      { id: 'b', displayOrder: 2 } as never,
      { id: 'c', displayOrder: 3 } as never,
    ];
    expect(service.pickNext(queue, 'a')?.id).toBe('b');
    expect(service.pickNext(queue, 'c')?.id).toBe('a');
  });

  it('pickPrevious wraps to the end', () => {
    const queue = [
      { id: 'a', displayOrder: 1 } as never,
      { id: 'b', displayOrder: 2 } as never,
    ];
    expect(service.pickPrevious(queue, 'a')?.id).toBe('b');
  });
});
