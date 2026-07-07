import { Injectable } from '@angular/core';

import { DisplayContentItem } from '../core/api/display.api';

export type RecurringCounterMap = ReadonlyMap<string, number>;

/**
 * Pure helpers for independent per-item recurring cadence (CHG-039).
 * The kiosk rotation controller owns the counter map; this service
 * implements increment, due detection, filler queue, and poll sync.
 */
@Injectable()
export class RecurringCadenceService {
  /**
   * Returns the regular (non-recurring, non-novelty) items in display order.
   */
  regularQueue(items: readonly DisplayContentItem[]): DisplayContentItem[] {
    return [...items]
      .filter((item) => !this._hasRecurringCadence(item) && item.isNovelty !== true)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Active recurring items in display order (filler rotation and counter keys).
   */
  fillerQueue(items: readonly DisplayContentItem[]): DisplayContentItem[] {
    return [...items]
      .filter((item) => this._isActiveRecurring(item))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  hasRecurringItems(items: readonly DisplayContentItem[]): boolean {
    return items.some((item) => this._isActiveRecurring(item));
  }

  /**
   * Snapshot of `recurringEveryXIterations` per active recurring id for poll diffing.
   */
  buildCadenceSnapshot(items: readonly DisplayContentItem[]): Map<string, number> {
    const snapshot = new Map<string, number>();
    for (const item of this.fillerQueue(items)) {
      snapshot.set(item.id, item.recurringEveryXIterations!);
    }
    return snapshot;
  }

  /**
   * Ids whose cadence changed or that newly became recurring since `previous`.
   */
  cadenceChanges(
    previous: ReadonlyMap<string, number>,
    items: readonly DisplayContentItem[],
  ): string[] {
    const current = this.buildCadenceSnapshot(items);
    const changed: string[] = [];
    for (const [id, n] of current) {
      const prev = previous.get(id);
      if (prev === undefined || prev !== n) {
        changed.push(id);
      }
    }
    return changed;
  }

  incrementCounters(
    counters: RecurringCounterMap,
    recurringItems: readonly DisplayContentItem[],
  ): Map<string, number> {
    const next = new Map(counters);
    for (const item of recurringItems) {
      next.set(item.id, (next.get(item.id) ?? 0) + 1);
    }
    return next;
  }

  /**
   * Items due after increment (`counter >= N`), sorted by `displayOrder`.
   */
  dueItems(
    items: readonly DisplayContentItem[],
    counters: RecurringCounterMap,
  ): DisplayContentItem[] {
    return this.fillerQueue(items).filter((item) => {
      const n = item.recurringEveryXIterations!;
      const counter = counters.get(item.id) ?? 0;
      return counter >= n;
    });
  }

  resetCounter(counters: RecurringCounterMap, contentId: string): Map<string, number> {
    const next = new Map(counters);
    next.set(contentId, 0);
    return next;
  }

  clearCounters(): Map<string, number> {
    return new Map();
  }

  pruneCounters(counters: RecurringCounterMap, activeRecurringIds: readonly string[]): Map<string, number> {
    const allowed = new Set(activeRecurringIds);
    const next = new Map<string, number>();
    for (const [id, value] of counters) {
      if (allowed.has(id)) {
        next.set(id, value);
      }
    }
    return next;
  }

  private _hasRecurringCadence(item: DisplayContentItem): boolean {
    const n = item.recurringEveryXIterations;
    return typeof n === 'number' && n >= 1;
  }

  private _isActiveRecurring(item: DisplayContentItem): boolean {
    return item.isActive !== false && this._hasRecurringCadence(item);
  }
}
