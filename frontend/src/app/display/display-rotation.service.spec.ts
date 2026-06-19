import { TestBed } from '@angular/core/testing';

import { DisplayContentItem } from '../core/api/display.api';
import { DisplayRotationService } from './display-rotation.service';

function makeItem(
  id: string,
  displayOrder: number,
  effectiveDurationSeconds: number = 5,
): DisplayContentItem {
  return {
    id,
    title: id,
    contentType: 'photo',
    sourceReference: `${id}.jpg`,
    isActive: true,
    displayOrder,
    durationSeconds: effectiveDurationSeconds,
    effectiveDurationSeconds,
    effectiveRotationAnimation: 'none',
  };
}

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

describe('DisplayRotationService (novelty queue state machine)', () => {
  let service: DisplayRotationService;

  beforeEach(() => {
    service = TestBed.inject(DisplayRotationService);
  });

  it('initializes with the first item as current', () => {
    const items = [makeItem('A', 1), makeItem('B', 2), makeItem('C', 3)];
    service.initialize(items);
    expect(service.getCurrentItemId()).toBe('A');
    expect(service.pickNext()?.id).toBe('B');
    expect(service.pickNext()?.id).toBe('C');
    expect(service.pickNext()?.id).toBe('A'); // wraps
  });

  it('drains the novelty queue before returning to the base rotation', () => {
    const initial = [makeItem('A', 1), makeItem('B', 2)];
    service.initialize(initial);
    // Show A, then apply a poll that brings in C, D, E while A is current.
    const afterUpload = [
      ...initial,
      makeItem('C', 3),
      makeItem('D', 4),
      makeItem('E', 5),
    ];
    service.applyPollState(afterUpload);
    expect(service.getNoveltyQueueLength()).toBe(3);
    expect(service.pickNext()?.id).toBe('C');
    expect(service.pickNext()?.id).toBe('D');
    expect(service.pickNext()?.id).toBe('E');
    // Queue drained → resume base rotation from B (the item after A).
    expect(service.pickNext()?.id).toBe('B');
  });

  it('appends new items to an existing novelty queue', () => {
    const initial = [makeItem('A', 1), makeItem('B', 2)];
    service.initialize(initial);
    // First wave: C, D
    service.applyPollState([...initial, makeItem('C', 3), makeItem('D', 4)]);
    expect(service.getNoveltyQueueLength()).toBe(2);
    expect(service.pickNext()?.id).toBe('C');
    // Second wave arrives while draining.
    service.applyPollState([
      ...initial,
      makeItem('C', 3),
      makeItem('D', 4),
      makeItem('E', 5),
      makeItem('F', 6),
    ]);
    expect(service.getNoveltyQueueLength()).toBe(3);
    expect(service.pickNext()?.id).toBe('D');
    expect(service.pickNext()?.id).toBe('E');
    expect(service.pickNext()?.id).toBe('F');
  });

  it('removes deleted items from the novelty queue', () => {
    const initial = [makeItem('A', 1), makeItem('B', 2)];
    service.initialize(initial);
    service.applyPollState([...initial, makeItem('C', 3), makeItem('D', 4)]);
    expect(service.getNoveltyQueueLength()).toBe(2);
    // C is removed before it is shown.
    service.applyPollState([...initial, makeItem('D', 4)]);
    expect(service.getNoveltyQueueLength()).toBe(1);
    expect(service.pickNext()?.id).toBe('D');
  });

  it('removes the current item if the server drops it', () => {
    const initial = [makeItem('A', 1), makeItem('B', 2), makeItem('C', 3)];
    service.initialize(initial);
    service.pickNext(); // → B
    service.pickNext(); // → C
    expect(service.getCurrentItemId()).toBe('C');
    // The server now returns a state without C.
    service.applyPollState([makeItem('A', 1), makeItem('B', 2)]);
    expect(service.getCurrentItemId()).toBeNull();
    // Next pick advances from the missing position.
    expect(service.pickNext()?.id).toBe('A');
  });

  it('handles a base rotation reorder by id (current item preserved)', () => {
    const initial = [makeItem('A', 1), makeItem('B', 2), makeItem('C', 3)];
    service.initialize(initial);
    service.pickNext(); // → B
    expect(service.getCurrentItemId()).toBe('B');
    // Reorder: B is now at displayOrder 1.
    const reordered = [makeItem('B', 1), makeItem('A', 2), makeItem('C', 3)];
    service.applyPollState(reordered);
    // After the reorder, the next pick continues from the current item (B),
    // wrapping to the new first item.
    expect(service.pickNext()?.id).toBe('A');
  });

  it('resets state on reset()', () => {
    const items = [makeItem('A', 1), makeItem('B', 2)];
    service.initialize(items);
    service.applyPollState([...items, makeItem('C', 3)]);
    expect(service.getNoveltyQueueLength()).toBe(1);
    service.reset();
    expect(service.getCurrentItemId()).toBeNull();
    expect(service.getNoveltyQueueLength()).toBe(0);
    expect(service.getFullState()).toEqual([]);
  });
});
