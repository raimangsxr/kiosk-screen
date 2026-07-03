import { Injectable } from '@angular/core';

import { DisplayContentItem } from '../core/api/display.api';

/**
 * Pure helpers for the recurring-content cadence rules (spec 007
 * US2 / FR-008a). The service is stateless: it takes the queue and
 * the current counter, returns the values the controller should
 * persist. The kiosk rotation controller owns the actual
 * `cadenceCounter` signal so it stays the single source of truth
 * for reactive state; this service exists to make the cadence math
 * testable in isolation and to give it a clear name.
 *
 * Rules implemented here:
 *  - Recurring items live outside the regular rotation queue.
 *  - The cadence counter increments on every *regular* advance.
 *  - When the counter exceeds the smallest configured cadence, the
 *    recurring item is shown and the counter resets to 0.
 *  - Tie-breaking: smallest cadence wins; on a tie, smallest
 *    `displayOrder` wins.
 *
 * @see specs/changes/021-kiosk-runtime-refactor/spec.md FR-2
 */
@Injectable()
export class RecurringCadenceService {
  /**
   * Returns the regular (non-recurring) items in display order.
   * Recurring items live outside this queue — they are surfaced
   * separately via the cadence counter.
   */
  regularQueue(items: readonly DisplayContentItem[]): DisplayContentItem[] {
    return [...items]
      .filter((item) => !item.recurringEveryXIterations && item.isNovelty !== true)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Smallest positive `recurringEveryXIterations` across the active
   * recurring items, or `null` if none are configured.
   */
  smallestRecurringCadence(items: readonly DisplayContentItem[]): number | null {
    let smallest: number | null = null;
    for (const item of items) {
      const n = item.recurringEveryXIterations;
      if (typeof n === 'number' && n >= 1) {
        if (smallest === null || n < smallest) {
          smallest = n;
        }
      }
    }
    return smallest;
  }

  /**
   * Returns the recurring item to surface at the current cadence tick.
   * `null` means the rotation should pick a regular item instead.
   *
   * Selection rules:
   *  - candidates are items whose `recurringEveryXIterations` equals the
   *    smallest cadence (so the picker is deterministic);
   *  - ties on cadence resolve by smallest `displayOrder`.
   */
  pickRecurringItem(items: readonly DisplayContentItem[]): DisplayContentItem | null {
    const smallest = this.smallestRecurringCadence(items);
    if (smallest === null) {
      return null;
    }
    const candidates = items
      .filter((item) => item.recurringEveryXIterations === smallest)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return candidates[0] ?? null;
  }

  /**
   * True when the counter has crossed the smallest cadence and we
   * should fire a recurring item on the next regular advance.
   */
  shouldFireRecurring(items: readonly DisplayContentItem[], counter: number): boolean {
    const cadence = this.smallestRecurringCadence(items);
    return cadence !== null && counter > cadence;
  }

  /**
   * Next counter value after a regular advance. Pure: takes the
   * current counter, returns `counter + 1`.
   */
  nextCounter(currentCounter: number): number {
    return currentCounter + 1;
  }

  /**
   * Whether the counter should be reset because the queue no longer
   * has any recurring items. Stops the counter from growing
   * unbounded after the operator clears the last recurring item.
   */
  shouldResetOnEmptyRecurring(items: readonly DisplayContentItem[], currentCounter: number): boolean {
    return this.smallestRecurringCadence(items) === null && currentCounter !== 0;
  }
}